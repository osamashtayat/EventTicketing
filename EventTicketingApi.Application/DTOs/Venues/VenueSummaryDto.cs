using System.ComponentModel.DataAnnotations;
namespace EventTicketingApi.Application.DTOs.Venues;

public class VenueSummaryDto
{
 
    public required int Id { get; set; }
    public required string Name { get; set; }
    public required string City { get; set; }
    public required int Capacity { get; set; }
    public required int CountryId { get; set; }
    public  string? Address { get; set; }
}
