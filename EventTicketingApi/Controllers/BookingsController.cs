using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Bookings;
using EventTicketingApi.Application.DTOs.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventTicketingApi.Controllers;

[ApiController]
[Authorize]
[Route("api/bookings")]
public class BookingsController(IBookingsService bookingsService) : BaseApiController
{
    [HttpPost]
    public async Task<ActionResult<BookingDto>> CreateBooking(CreateBookingDto dto, CancellationToken cancellationToken)
    {
        var result = await bookingsService.CreateBookingAsync(dto, cancellationToken);
        return result.IsSuccess
            ? CreatedAtAction(nameof(GetBooking), new { id = result.Value!.Id }, result.Value)
            : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpGet("mine")]
    public async Task<ActionResult<PagedResult<BookingDto>>> GetMyBookings([FromQuery] BookingQuery query, CancellationToken cancellationToken)
    {
        var result = await bookingsService.GetMyBookingsAsync(query, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BookingDto>> GetBooking(int id, CancellationToken cancellationToken)
    {
        var result = await bookingsService.GetBookingAsync(id, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpPost("{id:int}/cancel")]
    public async Task<ActionResult<BookingDto>> CancelBooking(int id, CancelBookingDto dto, CancellationToken cancellationToken)
    {
        var result = await bookingsService.CancelBookingAsync(id, dto, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }
}
