using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Venues;
using EventTicketingApi.Common.Results;
using Microsoft.AspNetCore.Mvc;

namespace EventTicketingApi.Controllers;

[ApiController]
[Route("api/venues")]
public class VenuesController(IVenuesService venuesService) : BaseApiController
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<VenueSummaryDto>>> GetVenues(
        [FromQuery] VenueQuery query, CancellationToken cancellationToken)
    {
        var result = await venuesService.GetVenuesAsync(query, cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpPost]
    public async Task<ActionResult<VenueSummaryDto>> CreateVenueAsync(
        [FromBody] CreateVenueDto dto, CancellationToken cancellationToken)
    {
        var result = await venuesService.CreateVenueAsync(dto, cancellationToken);
        if (!result.IsSuccess)
        {
            return FailureResponse(result.FailureKind, result.Errors);
        }

        var venue = result.Value!;
        return CreatedAtAction(nameof(GetVenueById), new { id = venue.Id }, venue);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<VenueSummaryDto>> GetVenueById(
        int id, CancellationToken cancellationToken)
    {
        var result = await venuesService.GetVenueByIdAsync(id, cancellationToken);
        return result.IsSuccess
            ? Ok(result.Value)
            : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<VenueSummaryDto>> UpdateVenue(
        int id, [FromBody] UpdateVenueDto dto, CancellationToken cancellationToken)
    {
        if (id != dto.Id)
        {
            return FailureResponse(FailureKind.Validation,
                [new Error("Venue.IdMismatch", "Route ID and body ID must match.")]);
        }

        var result = await venuesService.UpdateVenueAsync(id, dto, cancellationToken);
        return result.IsSuccess
            ? Ok(result.Value)
            : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteVenue(int id, CancellationToken cancellationToken)
    {
        var result = await venuesService.DeleteVenueAsync(id, cancellationToken);
        return result.IsSuccess
            ? NoContent()
            : FailureResponse(result.FailureKind, result.Errors);
    }
}
