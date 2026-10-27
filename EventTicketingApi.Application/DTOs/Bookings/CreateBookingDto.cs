using System.ComponentModel.DataAnnotations;

namespace EventTicketingApi.Application.DTOs.Bookings;

public class CreateBookingItemDto
{
    [Range(1, int.MaxValue)]
    public int TicketCategoryId { get; set; }
    [Range(1, 20)]
    public int Quantity { get; set; }
}

public class CreateBookingDto : IValidatableObject
{
    [Range(1, int.MaxValue)]
    public int EventId { get; set; }
    [Required, MinLength(1), MaxLength(20)]
    public List<CreateBookingItemDto> Items { get; set; } = [];

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Items is null) yield break;
        if (Items.Any(i => i is null || i.TicketCategoryId < 1 || i.Quantity < 1 || i.Quantity > 20))
            yield return new ValidationResult("Each item needs a positive category ID and quantity from 1 to 20.", [nameof(Items)]);
        else if (Items.Sum(i => (long)i.Quantity) > 20)
            yield return new ValidationResult("A booking can contain at most 20 tickets.", [nameof(Items)]);
        if (Items.Where(i => i is not null).Select(i => i.TicketCategoryId).Distinct().Count() != Items.Count)
            yield return new ValidationResult("Category IDs must not repeat.", [nameof(Items)]);
    }
}
