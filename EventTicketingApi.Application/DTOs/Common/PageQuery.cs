using System.ComponentModel.DataAnnotations;

namespace EventTicketingApi.Application.DTOs.Common;

public class PageQuery : IValidatableObject
{
    [Range(1, int.MaxValue)]
    public int PageNumber { get; set; } = 1;

    [Range(1, 100)]
    public int PageSize { get; set; } = 10;

    public virtual IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if ((long)(PageNumber - 1) * PageSize > int.MaxValue)
        {
            yield return new ValidationResult("Requested page offset is too large.", [nameof(PageNumber)]);
        }
    }
}
