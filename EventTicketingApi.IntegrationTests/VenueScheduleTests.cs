using System.Net;
using System.Net.Http.Json;
using EventTicketingApi.Application.DTOs.Events;
using EventTicketingApi.Domain;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EventTicketingApi.IntegrationTests;

public sealed class VenueScheduleTests : IAsyncLifetime
{
    private readonly BookingTestHost host = new();
    private int venueId;
    private static DateTime Day(int day) => new DateTime(2030, 2, 1, 0, 0, 0, DateTimeKind.Utc).AddDays(day - 1);
    public async Task InitializeAsync()
    {
        await host.StartAsync();
        await host.WithDbAsync(async db =>
        {
            var venue = new Venue { Name = "Shared hall", City = "Amman", Capacity = 10, CountryId = 1, Country = null! };
            db.Venues.Add(venue); await db.SaveChangesAsync(); venueId = venue.Id;
        });
        await host.LoginAsync("admin");
    }
    public Task DisposeAsync() => host.DisposeAsync().AsTask();
    private object Input(int capacity, int start, int end, int? id = null, int? venue = null) => new
    {
        id = id ?? 0, name = "Schedule test", startDate = Day(start), endDate = Day(end), capacity, venueId = venue ?? venueId
    };
    private async Task<EventDto> CreateAsync(int capacity, int start, int end)
    {
        using var response = await host.Client.PostAsJsonAsync("/api/events", Input(capacity, start, end));
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<EventDto>())!;
    }
    private static async Task ConflictAsync(HttpResponseMessage response, string code = "Event.VenueCapacityConflict")
    {
        using (response)
        {
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Contains(code, await response.Content.ReadAsStringAsync());
        }
    }

    [Fact]
    public async Task Date_only_creation_and_update_use_midnight_UTC_and_enforce_overlap()
    {
        using var response = await host.Client.PostAsJsonAsync("/api/events", new
        {
            name = "Date-only event", startDate = "02/02/2030", endDate = "02/03/2030", capacity = 5, venueId
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var first = (await response.Content.ReadFromJsonAsync<EventDto>())!;
        Assert.Equal(Day(2), first.StartDate); Assert.Equal(Day(4), first.EndDate);
        Assert.Equal(DateTimeKind.Utc, first.StartDate.Kind);
        using var overlap = await host.Client.PostAsJsonAsync("/api/events", new
        {
            name = "Too large", startDate = "02/02/2030", endDate = "02/21/2030", capacity = 6, venueId
        });
        await ConflictAsync(overlap);
        using var update = await host.Client.PutAsJsonAsync($"/api/events/{first.Id}", new
        {
            id = first.Id, name = "Updated dates", startDate = "02/03/2030", endDate = "02/04/2030", capacity = 5, venueId
        });
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);
        var updated = (await update.Content.ReadFromJsonAsync<EventDto>())!;
        Assert.Equal(Day(3), updated.StartDate); Assert.Equal(Day(5), updated.EndDate);
        using var details = await host.Client.GetAsync($"/api/events/{first.Id}");
        var persisted = (await details.Content.ReadFromJsonAsync<EventDto>())!;
        Assert.Equal(Day(3).Ticks, persisted.StartDate.Ticks);
    }

    [Fact]
    public async Task Same_date_start_and_end_cover_one_full_day()
    {
        using var response = await host.Client.PostAsJsonAsync("/api/events", new
        {
            name = "One day", startDate = "02/02/2030", endDate = "02/02/2030", capacity = 6, venueId
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var value = (await response.Content.ReadFromJsonAsync<EventDto>())!;
        Assert.Equal(Day(2), value.StartDate); Assert.Equal(Day(3), value.EndDate);
        using var overlaps = await host.Client.PostAsJsonAsync("/api/events", new
        {
            name = "Same day conflict", startDate = "02/02/2030", endDate = "02/02/2030", capacity = 5, venueId
        });
        await ConflictAsync(overlaps);
        using var nextDay = await host.Client.PostAsJsonAsync("/api/events", new
        {
            name = "Next day", startDate = "02/03/2030", endDate = "02/03/2030", capacity = 10, venueId
        });
        Assert.Equal(HttpStatusCode.Created, nextDay.StatusCode);
    }

    [Theory]
    [InlineData("02/30/2030", "03/01/2030")]
    [InlineData("21/02/2030", "22/02/2030")]
    [InlineData("02/29/2027", "03/01/2027")]
    [InlineData("12/30/9999", "12/31/9999")]
    [InlineData("02/03/2030", "02/02/2030")]
    [InlineData("invalid", "02/03/2030")]
    public async Task Invalid_or_unordered_date_only_requests_return_400(string start, string end)
    {
        using var response = await host.Client.PostAsJsonAsync("/api/events", new
        {
            name = "Invalid dates", startDate = start, endDate = end, capacity = 1, venueId
        });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ISO_offsets_and_leap_days_are_supported_without_losing_the_time()
    {
        using var response = await host.Client.PostAsJsonAsync("/api/events", new
        {
            name = "Offset event", startDate = "2030-02-02T15:30:00+03:00", endDate = "2030-02-02T17:30:00+03:00", capacity = 5, venueId
        });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var value = (await response.Content.ReadFromJsonAsync<EventDto>())!;
        Assert.Equal(Day(2).AddHours(12).AddMinutes(30), value.StartDate);
        Assert.Equal(Day(2).AddHours(14).AddMinutes(30), value.EndDate);
        using var leap = await host.Client.PostAsJsonAsync("/api/events", new
        {
            name = "Leap day", startDate = "02/29/2028", endDate = "03/01/2028", capacity = 5, venueId
        });
        Assert.Equal(HttpStatusCode.Created, leap.StatusCode);
    }

    [Fact]
    public async Task Overlap_rejects_five_plus_six_but_accepts_exact_venue_capacity()
    {
        await CreateAsync(5, 2, 3);
        await ConflictAsync(await host.Client.PostAsJsonAsync("/api/events", Input(6, 2, 21)));
        await CreateAsync(5, 2, 21);
        await host.WithDbAsync(async db => Assert.Equal(2, await db.Events.CountAsync(e => e.VenueId == venueId)));
    }

    [Theory]
    [InlineData(1, 3)]
    [InlineData(3, 5)]
    [InlineData(3, 4)]
    [InlineData(1, 5)]
    [InlineData(2, 4)]
    public async Task Partial_and_contained_overlaps_are_rejected(int start, int end)
    {
        await CreateAsync(6, 2, 4);
        await ConflictAsync(await host.Client.PostAsJsonAsync("/api/events", Input(5, start, end)));
    }

    [Fact]
    public async Task Back_to_back_and_separate_events_do_not_share_capacity()
    {
        await CreateAsync(10, 1, 2);
        await CreateAsync(10, 2, 3);
        await CreateAsync(10, 4, 5);
        using var sameCapacity = await host.Client.PutAsJsonAsync($"/api/venues/{venueId}",
            new { id = venueId, name = "Shared hall", city = "Amman", countryId = 1, capacity = 10 });
        Assert.Equal(HttpStatusCode.OK, sameCapacity.StatusCode);
    }

    [Fact]
    public async Task Multiple_overlaps_use_peak_simultaneous_capacity_not_pairwise_or_total_sum()
    {
        await CreateAsync(5, 1, 4);
        await CreateAsync(4, 1, 4);
        await ConflictAsync(await host.Client.PostAsJsonAsync("/api/events", Input(2, 2, 3)));
        await CreateAsync(1, 2, 3);
    }

    [Fact]
    public async Task Long_event_can_share_with_two_events_that_do_not_overlap_each_other()
    {
        await CreateAsync(6, 1, 2);
        await CreateAsync(6, 3, 4);
        await CreateAsync(4, 1, 4); // Peak 10, although the sum of the three allocations is 16.
    }

    [Fact]
    public async Task Update_excludes_itself_and_checks_capacity_dates_and_destination_venue()
    {
        var first = await CreateAsync(5, 1, 2);
        await CreateAsync(5, 1, 2);
        using var unchanged = await host.Client.PutAsJsonAsync($"/api/events/{first.Id}", Input(5, 1, 2, first.Id));
        Assert.Equal(HttpStatusCode.OK, unchanged.StatusCode);
        await ConflictAsync(await host.Client.PutAsJsonAsync($"/api/events/{first.Id}", Input(6, 1, 2, first.Id)));
        var later = await CreateAsync(1, 3, 4);
        await ConflictAsync(await host.Client.PutAsJsonAsync($"/api/events/{later.Id}", Input(1, 1, 2, later.Id)));
        int sourceVenue = 0;
        await host.WithDbAsync(async db =>
        {
            var source = new Venue { Name = "Source hall", City = "Amman", Capacity = 10, CountryId = 1, Country = null! };
            db.Venues.Add(source); await db.SaveChangesAsync(); sourceVenue = source.Id;
        });
        using var createMoved = await host.Client.PostAsJsonAsync("/api/events", Input(1, 1, 2, venue: sourceVenue));
        var moved = (await createMoved.Content.ReadFromJsonAsync<EventDto>())!;
        await ConflictAsync(await host.Client.PutAsJsonAsync($"/api/events/{moved.Id}", Input(1, 1, 2, moved.Id)));
        await host.WithDbAsync(async db =>
        {
            Assert.Equal(5, (await db.Events.FindAsync(first.Id))!.Capacity);
            Assert.Equal(sourceVenue, (await db.Events.FindAsync(moved.Id))!.VenueId);
        });
    }

    [Fact]
    public async Task Venue_capacity_cannot_be_reduced_below_the_combined_peak()
    {
        await CreateAsync(5, 1, 3); await CreateAsync(4, 2, 4);
        using var reduction = await host.Client.PutAsJsonAsync($"/api/venues/{venueId}",
            new { id = venueId, name = "Shared hall", city = "Amman", countryId = 1, capacity = 8 });
        await ConflictAsync(reduction, "Venue.CapacityBelowOverlappingEvents");
        using var equality = await host.Client.PutAsJsonAsync($"/api/venues/{venueId}",
            new { id = venueId, name = "Shared hall", city = "Amman", countryId = 1, capacity = 9 });
        Assert.Equal(HttpStatusCode.OK, equality.StatusCode);
    }

    [Fact]
    public async Task Simultaneous_creates_cannot_overallocate_the_venue()
    {
        var responses = await Task.WhenAll(Enumerable.Range(0, 4)
            .Select(_ => host.Client.PostAsJsonAsync("/api/events", Input(6, 1, 3))));
        try
        {
            Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Created);
            Assert.All(responses.Where(r => r.StatusCode != HttpStatusCode.Created), r => Assert.Equal(HttpStatusCode.Conflict, r.StatusCode));
            await host.WithDbAsync(async db => Assert.Equal(6, await db.Events.Where(e => e.VenueId == venueId).SumAsync(e => e.Capacity)));
        }
        finally { foreach (var response in responses) response.Dispose(); }
    }

    [Fact]
    public async Task Simultaneous_rescheduling_checks_the_other_committed_update()
    {
        var first = await CreateAsync(6, 1, 2);
        var second = await CreateAsync(6, 3, 4);
        var responses = await Task.WhenAll(
            host.Client.PutAsJsonAsync($"/api/events/{first.Id}", Input(6, 5, 6, first.Id)),
            host.Client.PutAsJsonAsync($"/api/events/{second.Id}", Input(6, 5, 6, second.Id)));
        try
        {
            Assert.Single(responses, r => r.StatusCode == HttpStatusCode.OK);
            Assert.Single(responses, r => r.StatusCode == HttpStatusCode.Conflict);
        }
        finally { foreach (var response in responses) response.Dispose(); }
    }

    [Fact]
    public async Task Create_and_venue_capacity_reduction_are_checked_together()
    {
        await CreateAsync(5, 1, 3);
        var create = host.Client.PostAsJsonAsync("/api/events", Input(4, 1, 3));
        var reduce = host.Client.PutAsJsonAsync($"/api/venues/{venueId}",
            new { id = venueId, name = "Shared hall", city = "Amman", countryId = 1, capacity = 8 });
        using var createResponse = await create; using var reduceResponse = await reduce;
        Assert.Contains(createResponse.StatusCode, new[] { HttpStatusCode.Created, HttpStatusCode.Conflict });
        Assert.Contains(reduceResponse.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Conflict });
        Assert.False(createResponse.StatusCode == HttpStatusCode.Created && reduceResponse.StatusCode == HttpStatusCode.OK);
        await host.WithDbAsync(async db =>
        {
            var capacity = await db.Venues.Where(v => v.Id == venueId).Select(v => v.Capacity).SingleAsync();
            Assert.True(await db.Events.Where(e => e.VenueId == venueId).SumAsync(e => e.Capacity) <= capacity);
        });
    }
}
