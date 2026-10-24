using Microsoft.AspNetCore.Mvc;
using EventTicketingApi.Common.Results;
public abstract class BaseApiController : ControllerBase
{
    protected static ObjectResult FailureResponse(
        FailureKind failureKind, IReadOnlyList<Error> errors)
    {
        var (status, title) = failureKind switch
        {
            FailureKind.Validation => (StatusCodes.Status400BadRequest, "Invalid request"),
            FailureKind.NotFound => (StatusCodes.Status404NotFound, "Resource not found"),
            FailureKind.Conflict => (StatusCodes.Status409Conflict, "Operation conflicts with existing data"),
            _ => (StatusCodes.Status500InternalServerError, "An unexpected error occurred")
        };

        var problem = new ProblemDetails { Status = status, Title = title };

        if (status != StatusCodes.Status500InternalServerError)
        {
            problem.Extensions["errors"] = errors;
        }

        return new ObjectResult(problem) { StatusCode = status };
    }
}