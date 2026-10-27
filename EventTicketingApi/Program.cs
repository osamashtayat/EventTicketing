using EventTicketingApi.Infrastructure.Validation;
using EventTicketingApi.ExceptionHandling;
using EventTicketingApi.Infrastructure.Persistence;
using EventTicketingApi.Infrastructure.Services;
using EventTicketingApi.Infrastructure;
using EventTicketingApi.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using EventTicketingApi.Application.MappingProfile;
using EventTicketingApi.Application.Contracts;
using Scalar.AspNetCore;
using EventTicketingApi.Configuration;
using EventTicketingApi.Identity;
using EventTicketingApi.Application.DTOs.Auth;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddIdentityApiEndpoints<ApplicationUser>().AddRoles<IdentityRole>().AddEntityFrameworkStores<AppDbContext>();

builder.Services.AddOpenApi();
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddAutoMapper(
    cfg => { },
    typeof(CountryMappingProfile).Assembly);
    builder.Services.AddControllers();

builder.Services.AddScoped<ICountriesService, CountryService>();
builder.Services.AddScoped<IVenuesService, VenueService>();
builder.Services.AddScoped<IEventsService, EventService>();
builder.Services.AddScoped<ITicketCategoriesService, TicketCategoryService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
builder.Services.AddScoped<EventAccess>();
builder.Services.AddScoped<VenueCapacityValidator>();
builder.Services.AddScoped<IBookingsService, BookingsService>();
builder.Services.AddSingleton<TimeProvider>(TimeProvider.System);

builder.Services.AddAuthorization();
builder.Services.AddFrontendCors(builder.Configuration);
var app = builder.Build();

await using (var scope = app.Services.CreateAsyncScope())
{
    var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
    await IdentitySeeder.SeedRolesAsync(roleManager);
    if (builder.Configuration.GetValue<bool>("BootstrapAdmin:Enabled"))
    {
        var account = new RegisterDto
        {
            Email = builder.Configuration["BootstrapAdmin:Email"] ?? string.Empty,
            Password = builder.Configuration["BootstrapAdmin:Password"] ?? string.Empty,
            FirstName = builder.Configuration["BootstrapAdmin:FirstName"] ?? "Initial",
            LastName = builder.Configuration["BootstrapAdmin:LastName"] ?? "Administrator"
        };
        await IdentitySeeder.SeedFirstAdminAsync(
            scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>(),
            scope.ServiceProvider.GetRequiredService<IAuthService>(), account);
    }
}

app.UseExceptionHandler();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.UseHttpsRedirection();
app.UseRouting();
app.UseCors(FrontendCors.PolicyName);
app.UseAuthentication();
app.UseAuthorization();
app.MapApplicationIdentity();
app.MapControllers();
app.Run();

record WeatherForecast(DateOnly Date, int TemperatureC, string? Summary)
{
    public int TemperatureF => 32 + (int)(TemperatureC / 0.5556);
}
