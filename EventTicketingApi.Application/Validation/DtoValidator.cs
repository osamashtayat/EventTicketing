using System.ComponentModel.DataAnnotations;
using EventTicketingApi.Common.Results;

namespace EventTicketingApi.Application.Validation;

public static class DtoValidator
{
    public static Error[] Validate(
        object dto, string errorCode, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(dto);
        cancellationToken.ThrowIfCancellationRequested();

        var results = new List<ValidationResult>();
        Validator.TryValidateObject(dto, new ValidationContext(dto), results, validateAllProperties: true);
        return results.Select(result =>
            new Error(errorCode, result.ErrorMessage ?? "Invalid input.")).ToArray();
    }
}
