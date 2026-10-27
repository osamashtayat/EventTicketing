using EventTicketingApi.Application.DTOs.Events;
using EventTicketingApi.Common.Results;
using EventTicketingApi.Domain;
using EventTicketingApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EventTicketingApi.Infrastructure.Validation;

public class VenueCapacityValidator(AppDbContext db)
{
    public async Task<Result> ValidateEventAsync(CreateEventDto dto, int? excludedEventId, CancellationToken ct)
    {
        var venue = await db.LockVenueAsync(dto.VenueId, ct);
        if (venue is null) return Result.NotFound(new Error("Venue.NotFound", "Venue not found."));
        if (dto.Capacity > venue.Capacity)
            return Result.BadRequest(new Error("Event.ExceedsVenueCapacity",
                "Event capacity cannot exceed the selected venue's capacity."));

        var overlaps = await db.Events.AsNoTracking()
            .Where(e => e.VenueId == dto.VenueId && (!excludedEventId.HasValue || e.Id != excludedEventId.Value) &&
                e.StartDate < dto.EndDate && e.EndDate > dto.StartDate)
            .Select(e => new { e.StartDate, e.EndDate, e.Capacity }).ToListAsync(ct);
        // Only evaluate the requested time window; outside it the candidate uses no capacity.
        var periods = overlaps.Select(e => new EventCapacityPeriod(
            e.StartDate < dto.StartDate ? dto.StartDate : e.StartDate,
            e.EndDate > dto.EndDate ? dto.EndDate : e.EndDate, e.Capacity))
            .Append(new EventCapacityPeriod(dto.StartDate, dto.EndDate, dto.Capacity));
        return EventCapacitySchedule.GetPeakCapacity(periods) <= venue.Capacity
            ? Result.Success()
            : Result.Conflict(new Error("Event.VenueCapacityConflict",
                "Combined capacity of simultaneous events cannot exceed the venue's capacity."));
    }

    // Caller must already hold the venue's write lock in the same transaction.
    public async Task<Result> ValidateVenueCapacityAsync(int venueId, int capacity, CancellationToken ct)
    {
        if (db.Database.CurrentTransaction is null)
            throw new InvalidOperationException("Venue capacity validation requires a transaction and venue lock.");
        var events = await db.Events.AsNoTracking().Where(e => e.VenueId == venueId)
            .Select(e => new EventCapacityPeriod(e.StartDate, e.EndDate, e.Capacity)).ToListAsync(ct);
        if (events.Any(e => e.Capacity > capacity))
            return Result.Conflict(new Error("Venue.CapacityBelowEvent",
                "Venue capacity cannot be less than the capacity of an existing event there."));
        return EventCapacitySchedule.GetPeakCapacity(events) <= capacity
            ? Result.Success()
            : Result.Conflict(new Error("Venue.CapacityBelowOverlappingEvents",
                "Venue capacity cannot be less than the combined capacity of simultaneous events."));
    }
}
