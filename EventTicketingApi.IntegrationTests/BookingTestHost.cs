using EventTicketingApi.Infrastructure.Validation;
using System.Net.Http.Json;
using AutoMapper;
using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.MappingProfile;
using EventTicketingApi.Controllers;
using EventTicketingApi.Configuration;
using EventTicketingApi.Domain;
using EventTicketingApi.ExceptionHandling;
using EventTicketingApi.Identity;
using EventTicketingApi.Infrastructure;
using EventTicketingApi.Infrastructure.Identity;
using EventTicketingApi.Infrastructure.Persistence;
using EventTicketingApi.Infrastructure.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace EventTicketingApi.IntegrationTests;

internal sealed class MutableClock : TimeProvider
{
    public DateTimeOffset Now { get; set; } = new(2030, 1, 1, 12, 0, 0, TimeSpan.Zero);
    public override DateTimeOffset GetUtcNow() => Now;
}

// Each test owns a unique database. Never apply migrations or cleanup to the app database.
internal sealed class BookingTestHost : IAsyncDisposable
{
    private readonly WebApplication app;
    public HttpClient Client { get; private set; } = null!;
    public MutableClock Clock { get; } = new();
    private readonly string password = Guid.NewGuid().ToString("N") + "aA1!";
    public static readonly DateTime Start = new(2030, 1, 3, 12, 0, 0, DateTimeKind.Utc);

    public BookingTestHost()
    {
        var config = new ConfigurationBuilder().AddUserSecrets(typeof(EventsController).Assembly).Build();
        var value = Environment.GetEnvironmentVariable("EVENT_TICKETING_TEST_CONNECTION")
            ?? config.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Configure EVENT_TICKETING_TEST_CONNECTION or API User Secrets for local SQL Server integration tests.");
        var connection = new SqlConnectionStringBuilder(value);
        if (connection.DataSource is not ("localhost,1434" or "127.0.0.1,1434"))
            throw new InvalidOperationException("Integration tests require local SQL Server on port 1434.");
        connection.InitialCatalog = "EventTicketing_BookingTests_" + Guid.NewGuid().ToString("N");
        var builder = WebApplication.CreateBuilder();
        builder.Logging.ClearProviders();
        builder.WebHost.UseUrls("http://127.0.0.1:0");
        builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(connection.ConnectionString));
        builder.Services.AddIdentityApiEndpoints<ApplicationUser>().AddRoles<IdentityRole>().AddEntityFrameworkStores<AppDbContext>();
        builder.Configuration.AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Cors:AllowedOrigins:0"] = "http://localhost:5173"
        });
        builder.Services.AddFrontendCors(builder.Configuration);
        builder.Services.AddAuthorization();
        builder.Services.AddHttpContextAccessor();
        builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
        builder.Services.AddScoped<EventAccess>();
        builder.Services.AddScoped<VenueCapacityValidator>();
        builder.Services.AddSingleton<TimeProvider>(Clock);
        builder.Services.AddScoped<IBookingsService, BookingsService>();
        builder.Services.AddScoped<IEventsService, EventService>();
        builder.Services.AddScoped<ITicketCategoriesService, TicketCategoryService>();
        builder.Services.AddScoped<ICountriesService, CountryService>();
        builder.Services.AddScoped<IVenuesService, VenueService>();
        builder.Services.AddScoped<IAuthService, AuthService>();
        builder.Services.AddAutoMapper(_ => { }, typeof(EventMappingProfile).Assembly);
        builder.Services.AddControllers().AddApplicationPart(typeof(BookingsController).Assembly);
        builder.Services.AddProblemDetails();
        builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
        app = builder.Build();
        app.UseExceptionHandler();
        app.UseRouting();
        app.UseCors(FrontendCors.PolicyName);
        app.UseAuthentication();
        app.UseAuthorization();
        app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>();
        app.MapControllers();
    }

    public async Task StartAsync()
    {
        await WithDbAsync(async db =>
        {
            await db.Database.MigrateAsync();
            await using var scope = app.Services.CreateAsyncScope();
            await IdentitySeeder.SeedRolesAsync(scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>());
            var manager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            foreach (var (id, role) in new[] { ("alice", "User"), ("bob", "User"), ("admin", "Admin"), ("organizer", "EventOrganizer"), ("organizer2", "EventOrganizer") })
            {
                var user = new ApplicationUser { Id = id, Email = id + "@example.com", UserName = id + "@example.com" };
                if (!(await manager.CreateAsync(user, password)).Succeeded || !(await manager.AddToRoleAsync(user, role)).Succeeded)
                    throw new InvalidOperationException("Could not prepare test accounts.");
            }
            var country = new Country { Name = "Test", ShortName = "TT" };
            var venue = new Venue { Name = "Test", City = "Test", Capacity = 1000, Country = country };
            Event Event(string name) => new() { Name = name, StartDate = Start, EndDate = Start.AddHours(2), Capacity = 100,
                Venue = venue, OrganizerId = "organizer" };
            var main = Event("Main"); var other = Event("Other"); var race = Event("Race");
            db.Events.AddRange(main, other, race);
            await db.SaveChangesAsync();
            db.TicketCategories.AddRange(
                new TicketCategory { Name = "VIP", Price = 12.50m, Capacity = 10, Event = main },
                new TicketCategory { Name = "General", Price = 5, Capacity = 5, Event = main },
                new TicketCategory { Name = "Free", Price = 0, Capacity = 1, Event = main },
                new TicketCategory { Name = "Other", Price = 10, Capacity = 10, Event = other },
                new TicketCategory { Name = "Last ticket", Price = 1, Capacity = 1, Event = race });
            await db.SaveChangesAsync();
        });
        app.Services.GetRequiredService<IMapper>().ConfigurationProvider.AssertConfigurationIsValid();
        await app.StartAsync();
        Client = new HttpClient { BaseAddress = new Uri(app.Urls.Single()), Timeout = TimeSpan.FromSeconds(60) };
    }

    public async Task LoginAsync(string? id)
    {
        Client.DefaultRequestHeaders.Authorization = null;
        if (id is null) return;
        using var response = await Client.PostAsJsonAsync("/api/auth/login?useCookies=false", new { email = id + "@example.com", password });
        response.EnsureSuccessStatusCode();
        var body = await response.Content.ReadFromJsonAsync<System.Text.Json.JsonElement>();
        Client.DefaultRequestHeaders.Authorization = new("Bearer", body.GetProperty("accessToken").GetString());
    }

    public async Task WithDbAsync(Func<AppDbContext, Task> action)
    {
        await using var scope = app.Services.CreateAsyncScope();
        await action(scope.ServiceProvider.GetRequiredService<AppDbContext>());
    }

    public async ValueTask DisposeAsync()
    {
        Client?.Dispose();
        try { await app.StopAsync(); }
        finally
        {
            try { await WithDbAsync(db => db.Database.EnsureDeletedAsync()); }
            finally { await app.DisposeAsync(); }
        }
    }
}
