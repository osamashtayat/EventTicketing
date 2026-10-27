using EventTicketingApi.Infrastructure.Validation;
using EventTicketingApi.Infrastructure.Identity;
using System.Data;
using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Infrastructure.Pagination;
using EventTicketingApi.Infrastructure.Logging;
using Microsoft.Extensions.Logging;
using EventTicketingApi.Application.Validation;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Events;
using EventTicketingApi.Common.Results;
using EventTicketingApi.Domain;
using EventTicketingApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EventTicketingApi.Infrastructure.Services;

public class EventService(AppDbContext appDbContext, IMapper mapper, ILogger<EventService> logger, ICurrentUser currentUser, EventAccess eventAccess, VenueCapacityValidator venueCapacityValidator) : IEventsService
{
    public async Task<Result<PagedResult<EventDto>>> GetEventsAsync(
        EventQuery query, CancellationToken cancellationToken = default)
    {
        return (await ReadEventsAsync(appDbContext.Events.AsNoTracking(), query, cancellationToken)).LogResult(logger);
    }

    public async Task<Result<PagedResult<EventDto>>> GetMyEventsAsync(
        EventQuery query, CancellationToken cancellationToken = default)
    {
        if (!eventAccess.CanManage)
            return Result<PagedResult<EventDto>>.Forbidden(EventAccess.Denied()).LogResult(logger);
        var events = appDbContext.Events.AsNoTracking().Where(e => e.OrganizerId == currentUser.Id);
        return (await ReadEventsAsync(events, query, cancellationToken)).LogResult(logger);
    }

    private async Task<Result<PagedResult<EventDto>>> ReadEventsAsync(
        IQueryable<Event> events, EventQuery query, CancellationToken cancellationToken)
    {
        var errors = query.ValidateQuery(cancellationToken);
        if (errors.Length > 0)
            return Result<PagedResult<EventDto>>.BadRequest(errors);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            events = events.Where(e => e.Name.Contains(search) ||
                (e.Description != null && e.Description.Contains(search)));
        }
        if (query.VenueId.HasValue)
        {
            events = events.Where(e => e.VenueId == query.VenueId.Value);
        }
        if (query.CountryId.HasValue)
        {
            events = events.Where(e => e.Venue.CountryId == query.CountryId.Value);
        }
        if (!string.IsNullOrWhiteSpace(query.City))
        {
            var city = query.City.Trim();
            events = events.Where(e => e.Venue.City == city);
        }
        if (query.StartFrom.HasValue)
        {
            events = events.Where(e => e.StartDate >= query.StartFrom.Value);
        }
        if (query.StartTo.HasValue)
        {
            events = events.Where(e => e.StartDate <= query.StartTo.Value);
        }

        var page = await events.OrderBy(e => e.StartDate).ThenBy(e => e.Id)
            .ProjectTo<EventDto>(mapper.ConfigurationProvider)
            .ToPagedResultAsync(query, cancellationToken);
        return Result<PagedResult<EventDto>>.Success(page);
    }

    public async Task<Result<EventDto>> GetEventByIdAsync(
        int id, CancellationToken cancellationToken = default)
    {
        var eventDto = await appDbContext.Events.AsNoTracking()
            .Where(e => e.Id == id)
            .ProjectTo<EventDto>(mapper.ConfigurationProvider)
            .FirstOrDefaultAsync(cancellationToken);
        return (eventDto is null
            ? Result<EventDto>.NotFound(MissingEvent())
            : Result<EventDto>.Success(eventDto)).LogResult(logger);
    }

    public async Task<Result<EventDto>> CreateEventAsync(
        CreateEventDto dto, CancellationToken cancellationToken = default)
    {
        if (!eventAccess.CanManage)
        {
            return Result<EventDto>.Forbidden(EventAccess.Denied()).LogResult(logger);
        }

        await using var transaction = await appDbContext.Database.BeginTransactionAsync(cancellationToken);
        var validation = await ValidateEventAsync(dto, null, cancellationToken);
        if (!validation.IsSuccess)
        {
            return ValidationFailure(validation).LogResult(logger);
        }

        var eventEntity = mapper.Map<Event>(dto);
        eventEntity.OrganizerId = currentUser.Id!;
        appDbContext.Events.Add(eventEntity);
        await appDbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Result<EventDto>.Success(mapper.Map<EventDto>(eventEntity)).LogResult(logger);
    }

    public async Task<Result<EventDto>> UpdateEventAsync(
        int id, UpdateEventDto dto, CancellationToken cancellationToken = default)
    {
        if (!eventAccess.CanManage)
        {
            return Result<EventDto>.Forbidden(EventAccess.Denied()).LogResult(logger);
        }

        if (id != dto.Id)
        {
            return Result<EventDto>.BadRequest(
                new Error("Event.IdMismatch", "Route ID and body ID must match.")).LogResult(logger);
        }

        var sourceVenueId = await appDbContext.Events.AsNoTracking().Where(e => e.Id == id)
            .Select(e => (int?)e.VenueId).SingleOrDefaultAsync(cancellationToken);
        if (!sourceVenueId.HasValue)
            return Result<EventDto>.NotFound(MissingEvent()).LogResult(logger);

        await using var transaction = await appDbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);
        foreach (var venueId in new[] { sourceVenueId.Value, dto.VenueId }.Distinct().Order())
            await appDbContext.LockVenueAsync(venueId, cancellationToken);
        var eventEntity = await appDbContext.LockEventAsync(id, cancellationToken, track: true);
        if (eventEntity is null)
        {
            return Result<EventDto>.NotFound(MissingEvent()).LogResult(logger);
        }

        if (eventEntity.VenueId != sourceVenueId.Value)
            return Result<EventDto>.Conflict(new Error("Event.RetryRequired",
                "The event moved during this request. Retry the operation.")).LogResult(logger);

        var access = eventAccess.CheckOwner(eventEntity.OrganizerId);
        if (!access.IsSuccess)
        {
            return Result<EventDto>.Forbidden(access.Errors.ToArray()).LogResult(logger);
        }

        var validation = await ValidateEventAsync(dto, id, cancellationToken);
        if (!validation.IsSuccess)
        {
            return ValidationFailure(validation).LogResult(logger);
        }

        if ((dto.StartDate != eventEntity.StartDate || dto.EndDate != eventEntity.EndDate || dto.VenueId != eventEntity.VenueId) &&
            await appDbContext.Bookings.AnyAsync(b => b.EventId == id, cancellationToken))
        {
            return Result<EventDto>.Conflict(new Error("Event.HasBookingHistory",
                "Cannot change event dates or venue after tickets have been booked.")).LogResult(logger);
        }

        var allocatedCapacity = await appDbContext.TicketCategories
            .Where(t => t.EventId == id)
            .SumAsync(t => (long?)t.Capacity, cancellationToken) ?? 0;
        if (dto.Capacity < allocatedCapacity)
        {
            return Result<EventDto>.Conflict(new Error("Event.CapacityAllocated",
                "Event capacity cannot be less than its ticket-category allocations.")).LogResult(logger);
        }

        mapper.Map(dto, eventEntity);
        await appDbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Result<EventDto>.Success(mapper.Map<EventDto>(eventEntity)).LogResult(logger);
    }

    public async Task<Result> DeleteEventAsync(int id, CancellationToken cancellationToken = default)
    {
        if (!eventAccess.CanManage)
        {
            return Result.Forbidden(EventAccess.Denied()).LogResult(logger);
        }

        await using var transaction = await appDbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);
        var eventEntity = await appDbContext.LockEventAsync(id, cancellationToken, track: true);
        if (eventEntity is null)
        {
            return Result.NotFound(MissingEvent()).LogResult(logger);
        }

        var access = eventAccess.CheckOwner(eventEntity.OrganizerId);
        if (!access.IsSuccess)
        {
            return Result.Forbidden(access.Errors.ToArray()).LogResult(logger);
        }

        if (await appDbContext.Bookings.AnyAsync(b => b.EventId == id, cancellationToken))
        {
            return Result.Conflict(new Error("Event.HasBookingHistory", "Cannot delete an event with booking history.")).LogResult(logger);
        }

        if (await appDbContext.TicketCategories.AnyAsync(t => t.EventId == id, cancellationToken))
        {
            return Result.Conflict(new Error("Event.HasTicketCategories",
                "Cannot delete this event because it has ticket categories.")).LogResult(logger);
        }

        appDbContext.Events.Remove(eventEntity);
        await appDbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Result.Success().LogResult(logger);
    }

    // Shared by create/update, including callers outside the HTTP pipeline.
    private async Task<Result> ValidateEventAsync(CreateEventDto dto, int? excludedEventId, CancellationToken cancellationToken)
    {
        var errors = DtoValidator.Validate(dto, "Event.InvalidInput", cancellationToken).ToList();

        if (dto.StartDate == default || dto.EndDate == default || dto.EndDate <= dto.StartDate)
        {
            errors.Add(new Error("Event.InvalidDates", "Start and end dates are required, and end must follow start."));
        }

        if (errors.Count > 0)
        {
            return Result.BadRequest(errors.ToArray());
        }

        return await venueCapacityValidator.ValidateEventAsync(dto, excludedEventId, cancellationToken);
    }

    private static Result<EventDto> ValidationFailure(Result validation) => validation.FailureKind switch
    {
        FailureKind.NotFound => Result<EventDto>.NotFound(validation.Errors.ToArray()),
        FailureKind.Conflict => Result<EventDto>.Conflict(validation.Errors.ToArray()),
        _ => Result<EventDto>.BadRequest(validation.Errors.ToArray())
    };

    private static Error MissingEvent() => new("Event.NotFound", "Event not found.");
}
