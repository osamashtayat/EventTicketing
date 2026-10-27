using Microsoft.AspNetCore.Authorization;
using EventTicketingApi.Common.Constant;
using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Events;
using EventTicketingApi.Application.DTOs.Bookings;
using Microsoft.AspNetCore.Mvc;

namespace EventTicketingApi.Controllers;

[ApiController]
[Route("api/events")]
public class EventsController(IEventsService eventsService, IBookingsService bookingsService) : BaseApiController
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<EventDto>>> GetEvents([FromQuery] EventQuery query, CancellationToken cancellationToken)
    {
        var result = await eventsService.GetEventsAsync(query, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpGet("mine")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.EventOrganizer)]
    public async Task<ActionResult<PagedResult<EventDto>>> GetMyEvents(
        [FromQuery] EventQuery query, CancellationToken cancellationToken)
    {
        var result = await eventsService.GetMyEventsAsync(query, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EventDto>> GetEventById(int id, CancellationToken cancellationToken)
    {
        var result = await eventsService.GetEventByIdAsync(id, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpGet("{id:int}/availability")]
    public async Task<ActionResult<IReadOnlyList<CategoryAvailabilityDto>>> GetAvailability(
        int id, CancellationToken cancellationToken)
    {
        var result = await bookingsService.GetAvailabilityAsync(id, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpGet("{id:int}/bookings")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.EventOrganizer)]
    public async Task<ActionResult<PagedResult<BookingDto>>> GetEventBookings(
        int id, [FromQuery] EventBookingQuery query, CancellationToken cancellationToken)
    {
        var result = await bookingsService.GetEventBookingsAsync(id, query, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpPost]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.EventOrganizer)]
    public async Task<ActionResult<EventDto>> CreateEvent(
        [FromBody] CreateEventDto dto, CancellationToken cancellationToken)
    {
        var result = await eventsService.CreateEventAsync(dto, cancellationToken);
        if (!result.IsSuccess)
        {
            return FailureResponse(result.FailureKind, result.Errors);
        }

        var eventDto = result.Value!;
        return CreatedAtAction(nameof(GetEventById), new { id = eventDto.Id }, eventDto);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.EventOrganizer)]
    public async Task<ActionResult<EventDto>> UpdateEvent(
        int id, [FromBody] UpdateEventDto dto, CancellationToken cancellationToken)
    {
        var result = await eventsService.UpdateEventAsync(id, dto, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = RoleNames.Admin + "," + RoleNames.EventOrganizer)]
    public async Task<IActionResult> DeleteEvent(int id, CancellationToken cancellationToken)
    {
        var result = await eventsService.DeleteEventAsync(id, cancellationToken);
        return result.IsSuccess ? NoContent() : FailureResponse(result.FailureKind, result.Errors);
    }
}
