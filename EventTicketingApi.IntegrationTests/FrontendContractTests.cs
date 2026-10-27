using System.Net;
using System.Net.Http.Json;
using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Application.DTOs.Countries;
using EventTicketingApi.Application.DTOs.Events;
using EventTicketingApi.Application.DTOs.Venues;
using Xunit;

namespace EventTicketingApi.IntegrationTests;

public class FrontendContractTests : IAsyncLifetime
{
    private readonly BookingTestHost host = new();
    public Task InitializeAsync() => host.StartAsync();
    public Task DisposeAsync() => host.DisposeAsync().AsTask();
    private static object EventInput(string name, int venueId = 1, int id = 0) => new
    {
        id, name, venueId, capacity = 5, startDate = "2032-03-02T12:00:00Z", endDate = "2032-03-02T14:00:00Z",
        organizerId = "untrusted-client-owner"
    };
    private async Task<EventDto> CreateAsync(string name)
    {
        using var response = await host.Client.PostAsJsonAsync("/api/events", EventInput(name));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<EventDto>())!;
    }

    [Fact]
    public async Task Capacity_is_returned_in_venue_create_update_detail_list_and_nested_country()
    {
        await host.LoginAsync("admin");
        using var create = await host.Client.PostAsJsonAsync("/api/venues", new
        {
            name = "Contract hall", city = "Test", countryId = 1, capacity = 25
        });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var venue = (await create.Content.ReadFromJsonAsync<VenueSummaryDto>())!;
        Assert.Equal(25, venue.Capacity);
        using var update = await host.Client.PutAsJsonAsync($"/api/venues/{venue.Id}", new
        {
            id = venue.Id, name = venue.Name, city = venue.City, countryId = 1, capacity = 30
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        Assert.Equal(30, (await update.Content.ReadFromJsonAsync<VenueSummaryDto>())!.Capacity);
        await host.LoginAsync(null);
        Assert.Equal(30, (await host.Client.GetFromJsonAsync<VenueSummaryDto>($"/api/venues/{venue.Id}"))!.Capacity);
        var page = await host.Client.GetFromJsonAsync<PagedResult<VenueSummaryDto>>("/api/venues?search=Contract");
        Assert.Equal(30, Assert.Single(page!.Items).Capacity);
        var country = await host.Client.GetFromJsonAsync<GetCountryDto>("/api/countries/1");
        Assert.Equal(30, country!.Venues.Single(v => v.Id == venue.Id).Capacity);
    }

    [Fact]
    public async Task Event_owner_is_returned_consistently_and_cannot_be_assigned_by_client()
    {
        await host.LoginAsync("organizer");
        var value = await CreateAsync("Contract event");
        Assert.Equal("organizer", value.OrganizerId);
        using var update = await host.Client.PutAsJsonAsync($"/api/events/{value.Id}", EventInput("Contract event", id: value.Id));
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        Assert.Equal("organizer", (await update.Content.ReadFromJsonAsync<EventDto>())!.OrganizerId);
        await host.LoginAsync(null);
        var details = await host.Client.GetFromJsonAsync<EventDto>($"/api/events/{value.Id}");
        Assert.Equal("organizer", details!.OrganizerId);
        var list = await host.Client.GetFromJsonAsync<PagedResult<EventDto>>("/api/events?search=Contract");
        Assert.Equal("organizer", Assert.Single(list!.Items).OrganizerId);
    }

    [Fact]
    public async Task Mine_enforces_roles_ownership_filtering_and_pagination_even_for_admin()
    {
        using var anonymous = await host.Client.GetAsync("/api/events/mine");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        await host.LoginAsync("alice");
        using var customer = await host.Client.GetAsync("/api/events/mine");
        Assert.Equal(HttpStatusCode.Forbidden, customer.StatusCode);
        await host.LoginAsync("organizer2");
        var empty = await host.Client.GetFromJsonAsync<PagedResult<EventDto>>("/api/events/mine");
        Assert.Empty(empty!.Items);
        var foreign = await CreateAsync("Owned foreign");
        await host.LoginAsync("admin"); var adminEvent = await CreateAsync("Owned admin");
        await host.LoginAsync("organizer");
        var own = new[] { await CreateAsync("Owned alpha"), await CreateAsync("Owned beta"), await CreateAsync("Owned gamma") };
        var query = "search=Owned&venueId=1&countryId=1&city=Test&startFrom=2032-01-01T00%3A00%3A00Z&startTo=2033-01-01T00%3A00%3A00Z&pageSize=2";
        var first = await host.Client.GetFromJsonAsync<PagedResult<EventDto>>("/api/events/mine?" + query + "&pageNumber=1");
        var second = await host.Client.GetFromJsonAsync<PagedResult<EventDto>>("/api/events/mine?" + query + "&pageNumber=2");
        Assert.Equal(3, first!.TotalCount); Assert.Equal(2, first.TotalPages);
        Assert.Equal(2, first.Items.Count); Assert.Single(second!.Items);
        var items = first.Items.Concat(second.Items).ToArray();
        Assert.Equal(own.Select(e => e.Id).Order(), items.Select(e => e.Id).Order());
        Assert.All(items, e => Assert.Equal("organizer", e.OrganizerId));
        Assert.DoesNotContain(items, e => e.Id == foreign.Id || e.Id == adminEvent.Id);
        using var badPage = await host.Client.GetAsync("/api/events/mine?pageSize=101");
        Assert.Equal(HttpStatusCode.BadRequest, badPage.StatusCode);
        using var badDates = await host.Client.GetAsync("/api/events/mine?startFrom=2033-01-01&startTo=2032-01-01");
        Assert.Equal(HttpStatusCode.BadRequest, badDates.StatusCode);
        var noMatch = await host.Client.GetFromJsonAsync<PagedResult<EventDto>>("/api/events/mine?city=Unmatched");
        Assert.Empty(noMatch!.Items);
        await host.LoginAsync("admin");
        var adminsOwn = await host.Client.GetFromJsonAsync<PagedResult<EventDto>>("/api/events/mine?search=Owned");
        Assert.Equal(adminEvent.Id, Assert.Single(adminsOwn!.Items).Id);
        await host.LoginAsync(null);
        var publicList = await host.Client.GetFromJsonAsync<PagedResult<EventDto>>("/api/events?search=Owned&pageSize=100");
        Assert.Equal(5, publicList!.TotalCount);
    }
}
