using System.ComponentModel.DataAnnotations;
using EventTicketingApi.Application.DTOs.Common;

namespace EventTicketingApi.Application.DTOs.Venues;

public class VenueQuery : PageQuery
{
    [StringLength(200)]
    public string? Search { get; set; }

    [Range(1, int.MaxValue)]
    public int? CountryId { get; set; }

    [StringLength(200)]
    public string? City { get; set; }
}
