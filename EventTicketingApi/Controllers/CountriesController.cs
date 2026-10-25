using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Countries;
using EventTicketingApi.Common.Results;
using Microsoft.AspNetCore.Mvc;

namespace EventTicketingApi.Controllers;

[ApiController]
[Route("api/countries")]
public class CountriesController(ICountriesService countriesService) : BaseApiController
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<CountrySummaryDto>>> GetCountries(
        [FromQuery] CountryQuery query, CancellationToken cancellationToken)
    {
        var result = await countriesService.GetCountriesAsync(query, cancellationToken);
        return result.IsSuccess
            ? Ok(result.Value)
            : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<GetCountryDto>> GetCountryById(
        int id, CancellationToken cancellationToken)
    {
        var result = await countriesService.GetCountryByIdAsync(id, cancellationToken);
        return result.IsSuccess
            ? Ok(result.Value)
            : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpGet("by-name")]
    public async Task<ActionResult<GetCountryDto>> GetCountryByName(
        [FromQuery] string name, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return FailureResponse(FailureKind.Validation,
                [new Error("Country.NameRequired", "Country name is required.")]);
        }

        var result = await countriesService.GetCountryByNameAsync(name, cancellationToken);
        return result.IsSuccess
            ? Ok(result.Value)
            : FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpPost]
    public async Task<ActionResult<GetCountryDto>> CreateCountry(
        [FromBody] CreateCountryDto dto, CancellationToken cancellationToken)
    {
        var result = await countriesService.CreateCountryAsync(dto, cancellationToken);
        if (!result.IsSuccess)
        {
            return FailureResponse(result.FailureKind, result.Errors);
        }

        var country = result.Value!;
        return CreatedAtAction(nameof(GetCountryById), new { id = country.Id }, country);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> UpdateCountry(
        int id, [FromBody] UpdateCountryDto dto, CancellationToken cancellationToken)
    {
        if (id != dto.Id)
        {
            return FailureResponse(FailureKind.Validation,
                [new Error("Country.IdMismatch", "Route ID and body ID must match.")]);
        }

        var result = await countriesService.UpdateCountryAsync(id, dto, cancellationToken);
        return result.IsSuccess
            ? NoContent()
            : global::EventTicketingApi.Controllers.CountriesController.FailureResponse(result.FailureKind, result.Errors);
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> DeleteCountry(int id, CancellationToken cancellationToken)
    {
        var result = await countriesService.DeleteCountryAsync(id, cancellationToken);
        return result.IsSuccess
            ? NoContent()
            : global::EventTicketingApi.Controllers.CountriesController.FailureResponse(result.FailureKind, result.Errors);
    }

    // Keep HTTP status decisions here rather than in the service or Common project.
}
