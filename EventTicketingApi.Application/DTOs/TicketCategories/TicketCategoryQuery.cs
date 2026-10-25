using System.ComponentModel.DataAnnotations;
using EventTicketingApi.Application.DTOs.Common;

namespace EventTicketingApi.Application.DTOs.TicketCategories;

public class TicketCategoryQuery : PageQuery
{
    [Range(1, int.MaxValue)]
    public int? EventId { get; set; }

    [StringLength(200)]
    public string? Search { get; set; }

    [Range(typeof(decimal), "0", "9999999999999999.99", ParseLimitsInInvariantCulture = true)]
    public decimal? MinPrice { get; set; }

    [Range(typeof(decimal), "0", "9999999999999999.99", ParseLimitsInInvariantCulture = true)]
    public decimal? MaxPrice { get; set; }

    public override IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        foreach (var error in base.Validate(validationContext))
        {
            yield return error;
        }
        if (MinPrice.HasValue && MaxPrice.HasValue && MinPrice > MaxPrice)
        {
            yield return new ValidationResult("MinPrice must not exceed MaxPrice.",
                [nameof(MinPrice), nameof(MaxPrice)]);
        }
    }
}
