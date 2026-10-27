using System.ComponentModel.DataAnnotations;
using EventTicketingApi.Common.Constant;

namespace EventTicketingApi.Application.DTOs.Auth;

public class CreateAccountDto : RegisterDto, IValidatableObject
{
    [Required]
    public required string Role { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Role != RoleNames.Admin && Role != RoleNames.EventOrganizer)
        {
            yield return new ValidationResult("Role must be Admin or EventOrganizer.", [nameof(Role)]);
        }
    }
}
