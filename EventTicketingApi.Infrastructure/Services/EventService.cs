using System.Data;
using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Infrastructure.Pagination;
using EventTicketingApi.Infrastructure.Logging;
using Microsoft.Extensions.Logging;
using System.ComponentModel.DataAnnotations;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Events;
using EventTicketingApi.Common.Results;
using EventTicketingApi.Domain;
using EventTicketingApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace EventTicketingApi.Infrastructure.Services;

public class EventService(AppDbContext appDbContext, IMapper mapper, ILogger<EventService> logger) : IEventsService
{
    public async Task<Result<PagedResult<EventDto>>> GetEventsAsync(
        EventQuery query, CancellationToken cancellationToken = default)
    {
        var errors = query.ValidateQuery();
        if (errors.Length > 0)
        {
            return Result<PagedResult<EventDto>>.BadRequest(errors).LogResult(logger);
        }

        var events = appDbContext.Events.AsNoTracking();
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
        return Result<PagedResult<EventDto>>.Success(page).LogResult(logger);
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
        var validation = await ValidateEventAsync(dto, cancellationToken);
        if (!validation.IsSuccess)
        {
            return ValidationFailure(validation).LogResult(logger);
        }

        var eventEntity = mapper.Map<Event>(dto);
        appDbContext.Events.Add(eventEntity);
        await appDbContext.SaveChangesAsync(cancellationToken);
        return Result<EventDto>.Success(mapper.Map<EventDto>(eventEntity)).LogResult(logger);
    }

    public async Task<Result<EventDto>> UpdateEventAsync(
        int id, UpdateEventDto dto, CancellationToken cancellationToken = default)
    {
        if (id != dto.Id)
        {
            return Result<EventDto>.BadRequest(
                new Error("Event.IdMismatch", "Route ID and body ID must match.")).LogResult(logger);
        }

        await using var transaction = await appDbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);
        var eventEntity = await appDbContext.Events.FindAsync(new object[] { id }, cancellationToken);
        if (eventEntity is null)
        {
            return Result<EventDto>.NotFound(MissingEvent()).LogResult(logger);
        }

        var validation = await ValidateEventAsync(dto, cancellationToken);
        if (!validation.IsSuccess)
        {
            return ValidationFailure(validation).LogResult(logger);
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
        var eventEntity = await appDbContext.Events.FindAsync(new object[] { id }, cancellationToken);
        if (eventEntity is null)
        {
            return Result.NotFound(MissingEvent()).LogResult(logger);
        }

        if (await appDbContext.TicketCategories.AnyAsync(t => t.EventId == id, cancellationToken))
        {
            return Result.Conflict(new Error("Event.HasTicketCategories",
                "Cannot delete this event because it has ticket categories.")).LogResult(logger);
        }

        appDbContext.Events.Remove(eventEntity);
        await appDbContext.SaveChangesAsync(cancellationToken);
        return Result.Success().LogResult(logger);
    }

    // Shared by create/update, including callers outside the HTTP pipeline.
    private async Task<Result> ValidateEventAsync(CreateEventDto dto, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var validationResults = new List<ValidationResult>();
        Validator.TryValidateObject(dto, new ValidationContext(dto), validationResults, validateAllProperties: true);
        var errors = validationResults.Select(v => new Error("Event.InvalidInput", v.ErrorMessage!)).ToList();

        if (dto.StartDate == default || dto.EndDate == default || dto.EndDate <= dto.StartDate)
        {
            errors.Add(new Error("Event.InvalidDates", "Start and end dates are required, and end must follow start."));
        }

        if (errors.Count > 0)
        {
            return Result.BadRequest(errors.ToArray());
        }

        var venue = await appDbContext.Venues.AsNoTracking()
            .Where(v => v.Id == dto.VenueId)
            .Select(v => new { v.Capacity })
            .FirstOrDefaultAsync(cancellationToken);
        if (venue is null)
        {
            return Result.NotFound(new Error("Venue.NotFound", "Venue not found."));
        }

        if (dto.Capacity > venue.Capacity)
        {
            return Result.BadRequest(new Error("Event.ExceedsVenueCapacity",
                "Event capacity cannot exceed the selected venue's capacity."));
        }

        return Result.Success();
    }

    private static Result<EventDto> ValidationFailure(Result validation) =>
        validation.FailureKind == FailureKind.NotFound
            ? Result<EventDto>.NotFound(validation.Errors.ToArray())
            : Result<EventDto>.BadRequest(validation.Errors.ToArray());

    private static Error MissingEvent() => new("Event.NotFound", "Event not found.");
}
