using System.ComponentModel.DataAnnotations;
using EventTicketingApi.Application.DTOs.Countries;
using EventTicketingApi.Application.DTOs.Venues;
namespace EventTicketingApi.Application.DTOs.Countries;
public record GetCountryDto(int Id, string Name, string ShortName, IEnumerable<VenueSummaryDto> Venues);
