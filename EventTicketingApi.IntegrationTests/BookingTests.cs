using System.Net;
using System.Net.Http.Json;
using EventTicketingApi.Application.DTOs.Bookings;
using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Domain;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace EventTicketingApi.IntegrationTests;

public sealed class BookingTests : IAsyncLifetime
{
    private readonly BookingTestHost host = new();
    public Task InitializeAsync() => host.StartAsync();
    public Task DisposeAsync() => host.DisposeAsync().AsTask();
    private static object Input(int eventId = 1, int categoryId = 1, int quantity = 2) =>
        new { eventId, items = new[] { new { ticketCategoryId = categoryId, quantity } } };
    private async Task<BookingDto> BookAsync(object? input = null)
    {
        using var response = await host.Client.PostAsJsonAsync("/api/bookings", input ?? Input());
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var booking = (await response.Content.ReadFromJsonAsync<BookingDto>())!;
        Assert.EndsWith($"/api/bookings/{booking.Id}", response.Headers.Location!.ToString());
        return booking;
    }
    private async Task<BookingDto> CancelAsync(int id, object? input = null)
    {
        using var response = await host.Client.PostAsJsonAsync($"/api/bookings/{id}/cancel", input ?? new { });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<BookingDto>())!;
    }
    private static object Target(int itemId, int quantity) => new { items = new[] { new { bookingItemId = itemId, cancelledQuantity = quantity } } };
    private async Task AssertStockAsync(int categoryId, int quantity)
    {
        await host.WithDbAsync(async db =>
        {
            Assert.Equal(quantity, await db.TicketCategories.Where(t => t.Id == categoryId).Select(t => t.BookedQuantity).SingleAsync());
            Assert.Equal(quantity, await db.BookingItems.Where(i => i.TicketCategoryId == categoryId)
                .SumAsync(i => (int?)(i.Quantity - i.CancelledQuantity)) ?? 0);
        });
    }

    [Fact]
    public async Task Confirmation_uses_authenticated_customer_and_USD_price_snapshots()
    {
        await host.LoginAsync("alice");
        var booking = await BookAsync(new { eventId = 1, customerId = "bob", currency = "EUR", totalAmount = 0,
            items = new[] { new { ticketCategoryId = 1, quantity = 2, unitPrice = 0 } } });
        Assert.Equal(BookingStatus.Confirmed, booking.Status);
        Assert.Equal("USD", booking.Currency); Assert.Equal(25m, booking.TotalAmount);
        Assert.Equal(12.50m, booking.Items.Single().UnitPrice);
        await host.WithDbAsync(async db =>
        {
            Assert.Equal("alice", (await db.Bookings.FindAsync(booking.Id))!.CustomerId);
            await db.TicketCategories.Where(t => t.Id == 1).ExecuteUpdateAsync(s => s.SetProperty(t => t.Price, 99).SetProperty(t => t.Name, "Changed"));
        });
        var details = await host.Client.GetFromJsonAsync<BookingDto>($"/api/bookings/{booking.Id}");
        Assert.Equal(25m, details!.TotalAmount); Assert.Equal("VIP", details.Items.Single().CategoryName);
        var page = await host.Client.GetFromJsonAsync<PagedResult<BookingDto>>("/api/bookings/mine?status=Confirmed&eventId=1&pageSize=1");
        Assert.Equal(1, page!.TotalCount); Assert.Single(page.Items);
        using var badPage = await host.Client.GetAsync("/api/bookings/mine?pageSize=101"); Assert.Equal(HttpStatusCode.BadRequest, badPage.StatusCode);
        var free = await BookAsync(Input(categoryId: 3, quantity: 1)); Assert.Equal(0, free.TotalAmount);
        await AssertStockAsync(1, 2);
    }

    [Fact]
    public async Task Invalid_or_unavailable_items_roll_back_every_inventory_claim()
    {
        await host.LoginAsync("alice");
        foreach (var input in new object[] {
            new { eventId = 1, items = Array.Empty<object>() }, Input(quantity: 0), Input(quantity: 21),
            new { eventId = 1, items = new[] { new { ticketCategoryId = 1, quantity = 1 }, new { ticketCategoryId = 1, quantity = 1 } } },
            new { eventId = 1, items = new[] { new { ticketCategoryId = 1, quantity = 15 }, new { ticketCategoryId = 2, quantity = 10 } } }
        }) { using var response = await host.Client.PostAsJsonAsync("/api/bookings", input); Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode); }
        using var mixed = await host.Client.PostAsJsonAsync("/api/bookings", new { eventId = 1,
            items = new[] { new { ticketCategoryId = 1, quantity = 2 }, new { ticketCategoryId = 4, quantity = 1 } } });
        Assert.Equal(HttpStatusCode.BadRequest, mixed.StatusCode); await AssertStockAsync(1, 0);
        using var missing = await host.Client.PostAsJsonAsync("/api/bookings", new { eventId = 1,
            items = new[] { new { ticketCategoryId = 1, quantity = 2 }, new { ticketCategoryId = 999, quantity = 1 } } });
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode); await AssertStockAsync(1, 0);
        using var sold = await host.Client.PostAsJsonAsync("/api/bookings", new { eventId = 1,
            items = new[] { new { ticketCategoryId = 1, quantity = 2 }, new { ticketCategoryId = 2, quantity = 6 } } });
        Assert.Equal(HttpStatusCode.Conflict, sold.StatusCode); await AssertStockAsync(1, 0);
        await host.WithDbAsync(async db => Assert.Empty(await db.Bookings.ToListAsync()));
    }

    [Fact]
    public async Task Customers_cannot_read_or_cancel_other_customers_tickets_even_as_admin()
    {
        using var anonymous = await host.Client.PostAsJsonAsync("/api/bookings", Input()); Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        await host.LoginAsync("alice"); var own = await BookAsync();
        await host.LoginAsync("bob"); var other = await BookAsync();
        using var foreignItem = await host.Client.PostAsJsonAsync($"/api/bookings/{other.Id}/cancel", Target(own.Items.Single().Id, 1));
        Assert.Equal(HttpStatusCode.BadRequest, foreignItem.StatusCode);
        foreach (var caller in new[] { "bob", "admin", "organizer" })
        {
            await host.LoginAsync(caller);
            using var read = await host.Client.GetAsync($"/api/bookings/{own.Id}"); Assert.Equal(HttpStatusCode.NotFound, read.StatusCode);
            using var cancel = await host.Client.PostAsJsonAsync($"/api/bookings/{own.Id}/cancel", new { }); Assert.Equal(HttpStatusCode.NotFound, cancel.StatusCode);
        }
        await host.LoginAsync("bob"); var page = await host.Client.GetFromJsonAsync<PagedResult<BookingDto>>("/api/bookings/mine");
        Assert.Single(page!.Items); Assert.Equal(other.Id, page.Items.Single().Id);
        await AssertStockAsync(1, 4);
    }

    [Fact]
    public async Task Partial_and_full_cancellation_release_only_owned_quantities_for_rebooking()
    {
        await host.LoginAsync("alice"); var booking = await BookAsync(Input(quantity: 3)); var item = booking.Items.Single();
        var partial = await CancelAsync(booking.Id, Target(item.Id, 1));
        Assert.Equal(BookingStatus.PartiallyCancelled, partial.Status);
        Assert.Equal(12.50m, partial.CancelledAmount); Assert.Equal(25m, partial.RemainingAmount);
        Assert.Null(partial.CancelledAtUtc); await AssertStockAsync(1, 2);
        await CancelAsync(booking.Id, Target(item.Id, 1)); await AssertStockAsync(1, 2);
        foreach (var quantity in new[] { 0, 4 })
        { using var response = await host.Client.PostAsJsonAsync($"/api/bookings/{booking.Id}/cancel", Target(item.Id, quantity)); Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode); }
        var cancelled = await CancelAsync(booking.Id);
        Assert.Equal(BookingStatus.Cancelled, cancelled.Status); Assert.Equal(0, cancelled.RemainingAmount);
        Assert.Equal(booking.TotalAmount, cancelled.TotalAmount); Assert.NotNull(cancelled.CancelledAtUtc);
        await AssertStockAsync(1, 0);
        await host.LoginAsync("bob"); await BookAsync(Input(quantity: 10)); await AssertStockAsync(1, 10);
        await host.LoginAsync("alice"); await CancelAsync(booking.Id); await AssertStockAsync(1, 10);
    }

    [Fact]
    public async Task Cancellation_allows_exactly_24_hours_but_rejects_new_cancellations_after_cutoff()
    {
        await host.LoginAsync("alice"); var booking = await BookAsync(); var item = booking.Items.Single();
        host.Clock.Now = new DateTimeOffset(BookingTestHost.Start).AddHours(-24);
        await host.LoginAsync("alice");
        await CancelAsync(booking.Id, Target(item.Id, 1)); await AssertStockAsync(1, 1);
        host.Clock.Now = host.Clock.Now.AddTicks(1);
        using var late = await host.Client.PostAsJsonAsync($"/api/bookings/{booking.Id}/cancel", new { });
        Assert.Equal(HttpStatusCode.Conflict, late.StatusCode); await AssertStockAsync(1, 1);
        await CancelAsync(booking.Id, Target(item.Id, 1)); await AssertStockAsync(1, 1);
        host.Clock.Now = new DateTimeOffset(BookingTestHost.Start);
        await host.LoginAsync("alice");
        using var started = await host.Client.PostAsJsonAsync("/api/bookings", Input()); Assert.Equal(HttpStatusCode.Conflict, started.StatusCode);
    }

    [Fact]
    public async Task Competing_bookings_and_cancellation_retries_never_double_claim_or_double_release()
    {
        await host.LoginAsync("alice");
        var requests = await Task.WhenAll(Enumerable.Range(0, 6).Select(_ => host.Client.PostAsJsonAsync("/api/bookings", Input(3, 5, 1))));
        try
        {
            Assert.Single(requests, r => r.StatusCode == HttpStatusCode.Created);
            Assert.All(requests.Where(r => r.StatusCode != HttpStatusCode.Created), r => Assert.Equal(HttpStatusCode.Conflict, r.StatusCode));
            var booking = (await requests.Single(r => r.StatusCode == HttpStatusCode.Created).Content.ReadFromJsonAsync<BookingDto>())!;
            await AssertStockAsync(5, 1);
            var cancellations = await Task.WhenAll(Enumerable.Range(0, 6).Select(_ => host.Client.PostAsJsonAsync($"/api/bookings/{booking.Id}/cancel", new { })));
            try { Assert.All(cancellations, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode)); }
            finally { foreach (var r in cancellations) r.Dispose(); }
            await AssertStockAsync(5, 0);
            await host.LoginAsync("bob"); await BookAsync(Input(3, 5, 1)); await AssertStockAsync(5, 1);
        }
        finally { foreach (var r in requests) r.Dispose(); }
    }

    [Fact]
    public async Task Management_preserves_booking_history_and_database_inventory_constraints()
    {
        await host.LoginAsync("alice"); var booking = await BookAsync();
        await host.LoginAsync("admin");
        object Category(int capacity, int eventId = 1) => new { id = 1, eventId, name = "VIP", capacity, price = 12.50m };
        using var reduction = await host.Client.PutAsJsonAsync("/api/ticket-categories/1", Category(1)); Assert.Equal(HttpStatusCode.Conflict, reduction.StatusCode);
        using var move = await host.Client.PutAsJsonAsync("/api/ticket-categories/1", Category(10, 2)); Assert.Equal(HttpStatusCode.Conflict, move.StatusCode);
        using var deletion = await host.Client.DeleteAsync("/api/ticket-categories/1"); Assert.Equal(HttpStatusCode.Conflict, deletion.StatusCode);
        using var dates = await host.Client.PutAsJsonAsync("/api/events/1", new { id = 1, name = "Main", capacity = 100, venueId = 1,
            startDate = BookingTestHost.Start.AddHours(1), endDate = BookingTestHost.Start.AddHours(3) }); Assert.Equal(HttpStatusCode.Conflict, dates.StatusCode);
        using var deleteEvent = await host.Client.DeleteAsync("/api/events/1"); Assert.Equal(HttpStatusCode.Conflict, deleteEvent.StatusCode);
        await host.WithDbAsync(async db => await Assert.ThrowsAsync<SqlException>(() => db.Database.ExecuteSqlRawAsync("UPDATE TicketCategories SET BookedQuantity=Capacity+1 WHERE Id=1")));
        await host.LoginAsync("alice"); await CancelAsync(booking.Id);
        await host.LoginAsync("admin");
        using var afterCancel = await host.Client.DeleteAsync("/api/ticket-categories/1"); Assert.Equal(HttpStatusCode.Conflict, afterCancel.StatusCode);
        await AssertStockAsync(1, 0);
    }

    [Fact]
    public async Task Category_capacity_racing_booking_keeps_inventory_consistent()
    {
        await host.LoginAsync("admin");
        var booking = host.Client.PostAsJsonAsync("/api/bookings", Input(quantity: 10));
        var reduction = host.Client.PutAsJsonAsync("/api/ticket-categories/1", new { id = 1, eventId = 1, name = "VIP", capacity = 5, price = 12.50m });
        using var bookingResponse = await booking;
        using var capacityResponse = await reduction;
        Assert.Contains(bookingResponse.StatusCode, new[] { HttpStatusCode.Created, HttpStatusCode.Conflict });
        Assert.Contains(capacityResponse.StatusCode, new[] { HttpStatusCode.OK, HttpStatusCode.Conflict });
        Assert.False(bookingResponse.StatusCode == HttpStatusCode.Created && capacityResponse.StatusCode == HttpStatusCode.OK);
        await host.WithDbAsync(async db =>
        {
            var category = await db.TicketCategories.SingleAsync(t => t.Id == 1);
            Assert.InRange(category.BookedQuantity, 0, category.Capacity);
        });
    }

    [Fact]
    public async Task Maximum_supported_price_and_quantity_preserve_USD_precision()
    {
        const decimal price = 9_999_999_999_999_999.99m;
        await host.WithDbAsync(db => db.TicketCategories.Where(t => t.Id == 1)
            .ExecuteUpdateAsync(s => s.SetProperty(t => t.Capacity, 20).SetProperty(t => t.Price, price)));
        await host.LoginAsync("alice");
        var booking = await BookAsync(Input(quantity: 20));
        Assert.Equal(price * 20, booking.TotalAmount);
        var cancelled = await CancelAsync(booking.Id);
        Assert.Equal(price * 20, cancelled.CancelledAmount);
        await AssertStockAsync(1, 0);
    }

    [Fact]
    public async Task Event_booking_history_requires_admin_or_that_events_organizer()
    {
        using var anonymous = await host.Client.GetAsync("/api/events/1/bookings");
        Assert.Equal(HttpStatusCode.Unauthorized, anonymous.StatusCode);
        await host.LoginAsync("alice"); var booking = await BookAsync();
        using var customer = await host.Client.GetAsync("/api/events/1/bookings");
        Assert.Equal(HttpStatusCode.Forbidden, customer.StatusCode);
        await host.LoginAsync("organizer2");
        using var outsider = await host.Client.GetAsync("/api/events/1/bookings");
        Assert.Equal(HttpStatusCode.Forbidden, outsider.StatusCode);
        foreach (var caller in new[] { "organizer", "admin" })
        {
            await host.LoginAsync(caller);
            var history = await host.Client.GetFromJsonAsync<PagedResult<BookingDto>>("/api/events/1/bookings");
            Assert.Single(history!.Items); Assert.Equal(booking.Id, history.Items.Single().Id);
            using var ownDetails = await host.Client.GetAsync($"/api/bookings/{booking.Id}");
            Assert.Equal(HttpStatusCode.NotFound, ownDetails.StatusCode);
            using var cancellation = await host.Client.PostAsJsonAsync($"/api/bookings/{booking.Id}/cancel", new { });
            Assert.Equal(HttpStatusCode.NotFound, cancellation.StatusCode);
            using var missing = await host.Client.GetAsync("/api/events/999/bookings");
            Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        }
        await AssertStockAsync(1, 2);
    }

    [Fact]
    public async Task Event_booking_history_is_event_scoped_filtered_and_paginated()
    {
        await host.LoginAsync("alice");
        var cancelled = await BookAsync(); await CancelAsync(cancelled.Id);
        await BookAsync();
        await host.LoginAsync("bob"); var secondCustomer = await BookAsync();
        await BookAsync(Input(2, 4, 1));
        await host.LoginAsync("organizer");
        var page1 = await host.Client.GetFromJsonAsync<PagedResult<BookingDto>>("/api/events/1/bookings?status=Confirmed&pageSize=1&pageNumber=1");
        var page2 = await host.Client.GetFromJsonAsync<PagedResult<BookingDto>>("/api/events/1/bookings?status=Confirmed&pageSize=1&pageNumber=2");
        Assert.Equal(2, page1!.TotalCount); Assert.Equal(2, page1.TotalPages);
        Assert.Single(page1.Items); Assert.Single(page2!.Items);
        Assert.NotEqual(page1.Items.Single().Id, page2.Items.Single().Id);
        Assert.Contains(secondCustomer.Id, new[] { page1.Items.Single().Id, page2.Items.Single().Id });
        Assert.All(page1.Items.Concat(page2.Items), b => Assert.Equal(1, b.EventId));
        var all = await host.Client.GetFromJsonAsync<PagedResult<BookingDto>>("/api/events/1/bookings?eventId=2");
        Assert.Equal(3, all!.TotalCount); Assert.All(all.Items, b => Assert.Equal(1, b.EventId));
        var cancelledPage = await host.Client.GetFromJsonAsync<PagedResult<BookingDto>>("/api/events/1/bookings?status=Cancelled");
        Assert.Single(cancelledPage!.Items); Assert.Equal(cancelled.Id, cancelledPage.Items.Single().Id);
        var empty = await host.Client.GetFromJsonAsync<PagedResult<BookingDto>>("/api/events/3/bookings");
        Assert.Empty(empty!.Items);
        foreach (var url in new[] { "/api/events/1/bookings?pageSize=101", "/api/events/1/bookings?status=999", "/api/events/-1/bookings" })
        {
            using var response = await host.Client.GetAsync(url);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }

    [Fact]
    public async Task Public_availability_reflects_bookings_and_full_cancellation()
    {
        var available = await host.Client.GetFromJsonAsync<List<CategoryAvailabilityDto>>("/api/events/1/availability");
        Assert.Equal(10, available!.Single(i => i.TicketCategoryId == 1).AvailableQuantity);
        await host.LoginAsync("alice"); var booking = await BookAsync(Input(quantity: 10));
        await host.LoginAsync(null);
        available = await host.Client.GetFromJsonAsync<List<CategoryAvailabilityDto>>("/api/events/1/availability");
        Assert.Equal(0, available!.Single(i => i.TicketCategoryId == 1).AvailableQuantity);
        await host.LoginAsync("alice"); await CancelAsync(booking.Id);
        await host.LoginAsync(null);
        available = await host.Client.GetFromJsonAsync<List<CategoryAvailabilityDto>>("/api/events/1/availability");
        Assert.Equal(10, available!.Single(i => i.TicketCategoryId == 1).AvailableQuantity);
    }
}
