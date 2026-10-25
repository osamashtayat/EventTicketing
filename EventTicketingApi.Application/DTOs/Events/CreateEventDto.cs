using System.ComponentModel.DataAnnotations;

namespace EventTicketingApi.Application.DTOs.Events;

public class CreateEventDto
{
    [Required]
    public required string Name { get; set; }
    public string? Description { get; set; }
    public required DateTime StartDate { get; set; }
    public required DateTime EndDate { get; set; }

    [Range(1, int.MaxValue)]
    public required int Capacity { get; set; }

    [Range(1, int.MaxValue)]
    public int VenueId { get; set; }
}
