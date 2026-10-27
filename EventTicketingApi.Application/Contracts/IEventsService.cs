using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Application.DTOs.Events;
using EventTicketingApi.Common.Results;

namespace EventTicketingApi.Application.Contracts;

public interface IEventsService
{
    Task<Result<PagedResult<EventDto>>> GetEventsAsync(EventQuery query, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<EventDto>>> GetMyEventsAsync(EventQuery query, CancellationToken cancellationToken = default);
    Task<Result<EventDto>> GetEventByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Result<EventDto>> CreateEventAsync(CreateEventDto dto, CancellationToken cancellationToken = default);
    Task<Result<EventDto>> UpdateEventAsync(int id, UpdateEventDto dto, CancellationToken cancellationToken = default);
    Task<Result> DeleteEventAsync(int id, CancellationToken cancellationToken = default);
}
