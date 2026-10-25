using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Events;
using Microsoft.AspNetCore.Mvc;

namespace EventTicketingApi.Controllers;

[ApiController]
[Route("api/events")]
public class EventsController(IEventsService eventsService) : BaseApiController
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<EventDto>>> GetEvents([FromQuery] EventQuery query, CancellationToken cancellationToken)
    {
        var result = await eventsService.GetEventsAsync(query, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<EventDto>> GetEventById(int id, CancellationToken cancellationToken)
    {
        var result = await eventsService.GetEventByIdAsync(id, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpPost]
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
    public async Task<ActionResult<EventDto>> UpdateEvent(
        int id, [FromBody] UpdateEventDto dto, CancellationToken cancellationToken)
    {
        var result = await eventsService.UpdateEventAsync(id, dto, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteEvent(int id, CancellationToken cancellationToken)
    {
        var result = await eventsService.DeleteEventAsync(id, cancellationToken);
        return result.IsSuccess ? NoContent() : FailureResponse(result.FailureKind, result.Errors);
    }
}
