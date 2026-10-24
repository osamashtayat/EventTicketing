using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Venues;
namespace EventTicketingApi.Controllers
{
    [Route("api/venues")]
    [ApiController]
    public class VenuesController(IVenuesService venuesService) : BaseApiController
    {
        [HttpPost]
        public async Task<ActionResult<VenueSummaryDto>> CreateVenueAsync([FromBody] CreateVenueDto createVenueDto) 
        {
            var result = await venuesService.CreateVenueAsync(createVenueDto);
            if(!result.IsSuccess)
            {
                return FailureResponse(result.FailureKind, result.Errors);
            }
           var venue = result.Value!;
            return CreatedAtAction(nameof(GetVenueById), new { id = venue.Id }, venue);
        }
[HttpGet("{id:int}")]
        public async Task<ActionResult<VenueSummaryDto>> GetVenueById(int id)
        {
            var result = await venuesService.GetVenueByIdAsync(id);
             return result.IsSuccess
            ? Ok(result.Value)
            : FailureResponse(result.FailureKind, result.Errors);
        }
    }
}
