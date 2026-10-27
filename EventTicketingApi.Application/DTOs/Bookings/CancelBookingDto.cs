using System.ComponentModel.DataAnnotations;

namespace EventTicketingApi.Application.DTOs.Bookings;

public class CancelBookingItemDto
{
    [Range(1, int.MaxValue)]
    public int BookingItemId { get; set; }
    [Range(0, 20)]
    public int CancelledQuantity { get; set; }
}

public class CancelBookingDto : IValidatableObject
{
    // Null means cancel all remaining tickets. Otherwise these are cumulative targets.
    [MaxLength(20)]
    public List<CancelBookingItemDto>? Items { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Items is null) yield break;
        if (Items.Count == 0 || Items.Any(i => i is null || i.BookingItemId < 1 || i.CancelledQuantity < 0 || i.CancelledQuantity > 20))
            yield return new ValidationResult("Supply valid booking items and nonnegative cancellation totals, or omit Items to cancel all.", [nameof(Items)]);
        if (Items.Where(i => i is not null).Select(i => i.BookingItemId).Distinct().Count() != Items.Count)
            yield return new ValidationResult("Booking item IDs must not repeat.", [nameof(Items)]);
    }
}
