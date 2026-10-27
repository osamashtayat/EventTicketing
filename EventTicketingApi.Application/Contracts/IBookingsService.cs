using EventTicketingApi.Application.DTOs.Bookings;
using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Common.Results;

namespace EventTicketingApi.Application.Contracts;

public interface IBookingsService
{
    Task<Result<BookingDto>> CreateBookingAsync(CreateBookingDto dto, CancellationToken cancellationToken = default);
    Task<Result<BookingDto>> GetBookingAsync(int id, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<BookingDto>>> GetMyBookingsAsync(BookingQuery query, CancellationToken cancellationToken = default);
    Task<Result<PagedResult<BookingDto>>> GetEventBookingsAsync(int eventId, EventBookingQuery query, CancellationToken cancellationToken = default);
    Task<Result<BookingDto>> CancelBookingAsync(int id, CancelBookingDto dto, CancellationToken cancellationToken = default);
    Task<Result<IReadOnlyList<CategoryAvailabilityDto>>> GetAvailabilityAsync(int eventId, CancellationToken cancellationToken = default);
}
