using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using EventTicketingApi.Application.DTOs.Auth;
using EventTicketingApi.Configuration;
using Microsoft.AspNetCore.Cors.Infrastructure;
using Microsoft.Extensions.Options;
using Xunit;

namespace EventTicketingApi.IntegrationTests;

public class FrontendTests : IAsyncLifetime
{
    private readonly BookingTestHost host = new();
    public Task InitializeAsync() => host.StartAsync();
    public Task DisposeAsync() => host.DisposeAsync().AsTask();

    [Fact]
    public async Task Me_requires_authentication_and_returns_only_profile_fields_and_roles()
    {
        using var anonymous = await host.Client.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        foreach (var (id, role) in new[] { ("alice", "User"), ("admin", "Admin"), ("organizer", "EventOrganizer") })
        {
            await host.LoginAsync(id);
            using var response = await host.Client.GetAsync("/api/auth/me");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.True(response.Headers.CacheControl!.NoStore);
            var body = await response.Content.ReadAsStringAsync();
            var profile = JsonSerializer.Deserialize<CurrentUserDto>(body, new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
            Assert.Equal(id, profile.Id); Assert.Equal(id + "@example.com", profile.Email);
            Assert.Equal(new[] { role }, profile.Roles);
            using var json = JsonDocument.Parse(body);
            Assert.Equal(new[] { "email", "firstName", "id", "lastName", "roles" }, json.RootElement.EnumerateObject().Select(p => p.Name).Order().ToArray());
        }
    }

    [Fact]
    public async Task Allowed_origin_can_preflight_and_read_401_responses()
    {
        using var preflight = new HttpRequestMessage(HttpMethod.Options, "/api/auth/me");
        preflight.Headers.Add("Origin", "http://localhost:5173");
        preflight.Headers.Add("Access-Control-Request-Method", "GET");
        preflight.Headers.Add("Access-Control-Request-Headers", "authorization");
        using var response = await host.Client.SendAsync(preflight);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal("http://localhost:5173", response.Headers.GetValues("Access-Control-Allow-Origin").Single());
        Assert.Contains("authorization", string.Join(",", response.Headers.GetValues("Access-Control-Allow-Headers")), StringComparison.OrdinalIgnoreCase);
        Assert.False(response.Headers.Contains("Access-Control-Allow-Credentials"));
        using var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/me");
        request.Headers.Add("Origin", "http://localhost:5173");
        request.Headers.TryAddWithoutValidation("Authorization", "Bearer invalid-token");
        using var rejected = await host.Client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Unauthorized, rejected.StatusCode);
        Assert.Equal("http://localhost:5173", rejected.Headers.GetValues("Access-Control-Allow-Origin").Single());
    }

    [Fact]
    public async Task Unlisted_origins_receive_no_CORS_permission()
    {
        foreach (var origin in new[] { "https://unlisted.example", "http://localhost:5173.evil.example", "null" })
        {
            using var request = new HttpRequestMessage(HttpMethod.Options, "/api/auth/me");
            request.Headers.Add("Origin", origin);
            request.Headers.Add("Access-Control-Request-Method", "GET");
            request.Headers.Add("Access-Control-Request-Headers", "authorization");
            using var response = await host.Client.SendAsync(request);
            Assert.False(response.Headers.Contains("Access-Control-Allow-Origin"));
        }
    }

    [Fact]
    public async Task Allowed_frontend_can_read_booking_Location_header()
    {
        await host.LoginAsync("alice");
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/bookings");
        request.Headers.Add("Origin", "http://localhost:5173");
        request.Content = JsonContent.Create(new { eventId = 1, items = new[] { new { ticketCategoryId = 1, quantity = 1 } } });
        using var response = await host.Client.SendAsync(request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal("http://localhost:5173", response.Headers.GetValues("Access-Control-Allow-Origin").Single());
        Assert.Contains("Location", response.Headers.GetValues("Access-Control-Expose-Headers"));
        Assert.NotNull(response.Headers.Location);
    }
}

public class FrontendCorsConfigurationTests
{
    [Fact]
    public void Empty_configuration_allows_no_cross_origin_frontend()
    {
        var services = new ServiceCollection();
        services.AddFrontendCors(new ConfigurationBuilder().Build());
        using var provider = services.BuildServiceProvider();
        var policy = provider.GetRequiredService<IOptions<CorsOptions>>().Value.GetPolicy(FrontendCors.PolicyName)!;
        Assert.Empty(policy.Origins);
        Assert.False(policy.SupportsCredentials);
    }

    [Theory]
    [InlineData("*")]
    [InlineData("https://*.example.com")]
    [InlineData("https://example.com/app")]
    [InlineData("https://example.com/")]
    [InlineData("https://example.com?query=1")]
    public void Invalid_origin_configuration_is_rejected(string origin)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["Cors:AllowedOrigins:0"] = origin
        }).Build();
        Assert.Throws<InvalidOperationException>(() => new ServiceCollection().AddFrontendCors(configuration));
    }
}
