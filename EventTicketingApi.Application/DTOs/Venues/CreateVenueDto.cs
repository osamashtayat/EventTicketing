using EventTicketingApi.Domain;
using System.ComponentModel.DataAnnotations;
namespace EventTicketingApi.Application.DTOs.Venues;

public class CreateVenueDto
{
    public string Address { get; set; }=string.Empty;
    [Required]
public required string Name { get; set; }
[Required]
public required string City { get; set; }
[Range(1, int.MaxValue)]
public int CountryId { get; set; }

[Range(1, int.MaxValue)]
public required int Capacity { get; set; }
}
