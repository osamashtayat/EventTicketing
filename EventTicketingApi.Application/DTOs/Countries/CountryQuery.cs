using System.ComponentModel.DataAnnotations;
using EventTicketingApi.Application.DTOs.Common;

namespace EventTicketingApi.Application.DTOs.Countries;

public class CountryQuery : PageQuery
{
    [StringLength(200)]
    public string? Search { get; set; }
}
