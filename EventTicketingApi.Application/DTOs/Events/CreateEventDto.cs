using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using EventTicketingApi.Application.Serialization;

namespace EventTicketingApi.Application.DTOs.Events;

public class CreateEventDto
{
    [Required]
    public required string Name { get; set; }
    public string? Description { get; set; }
    [JsonConverter(typeof(EventDateJsonConverter))]
    public required DateTime StartDate { get; set; }
    [JsonConverter(typeof(EventEndDateJsonConverter))]
    public required DateTime EndDate { get; set; }

    [Range(1, int.MaxValue)]
    public required int Capacity { get; set; }

    [Range(1, int.MaxValue)]
    public int VenueId { get; set; }
}
