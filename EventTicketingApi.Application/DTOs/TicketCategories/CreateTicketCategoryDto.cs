using System.ComponentModel.DataAnnotations;

namespace EventTicketingApi.Application.DTOs.TicketCategories;

public class CreateTicketCategoryDto
{
    [Required]
    public required string Name { get; set; }
    public string? Description { get; set; }

    [Range(typeof(decimal), "0", "9999999999999999.99", ParseLimitsInInvariantCulture = true)]
    public required decimal Price { get; set; }

    [Range(1, int.MaxValue)]
    public required int Capacity { get; set; }

    [Range(1, int.MaxValue)]
    public int EventId { get; set; }
}
