using System.ComponentModel.DataAnnotations;
using EventTicketingApi.Application.DTOs.Common;

namespace EventTicketingApi.Application.DTOs.Events;

public class EventQuery : PageQuery
{
    [StringLength(200)]
    public string? Search { get; set; }

    [Range(1, int.MaxValue)]
    public int? VenueId { get; set; }

    [Range(1, int.MaxValue)]
    public int? CountryId { get; set; }

    [StringLength(200)]
    public string? City { get; set; }

    public DateTime? StartFrom { get; set; }
    public DateTime? StartTo { get; set; }

    public override IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        foreach (var error in base.Validate(validationContext))
        {
            yield return error;
        }

        if (StartFrom.HasValue && StartTo.HasValue && StartFrom > StartTo)
        {
            yield return new ValidationResult("StartFrom must be on or before StartTo.",
                [nameof(StartFrom), nameof(StartTo)]);
        }
    }
}
