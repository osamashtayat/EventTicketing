using System.Diagnostics;
using System.Runtime.CompilerServices;
using EventTicketingApi.Common.Results;
using Microsoft.Extensions.Logging;

namespace EventTicketingApi.Infrastructure.Logging;

internal static class ResultLoggingExtensions
{
    public static Result<T> LogResult<T>(this Result<T> result, ILogger logger,
        [CallerMemberName] string operation = "")
    {
        LogOutcome(result.IsSuccess, result.FailureKind, result.Errors, logger, operation);
        return result;
    }

    public static Result LogResult(this Result result, ILogger logger,
        [CallerMemberName] string operation = "")
    {
        LogOutcome(result.IsSuccess, result.FailureKind, result.Errors, logger, operation);
        return result;
    }

    private static void LogOutcome(bool isSuccess, FailureKind kind, IReadOnlyList<Error> errors,
        ILogger logger, string operation)
    {
        var level = isSuccess ? LogLevel.Debug : kind switch
        {
            FailureKind.Failure => LogLevel.Error,
            FailureKind.NotFound => LogLevel.Information,
            _ => LogLevel.Warning
        };

        logger.Log(level,
            "Service operation {Operation} returned {Outcome}. ErrorCodes: {ErrorCodes}. TraceId: {TraceId}",
            operation, isSuccess ? "Success" : kind.ToString(),
            string.Join(",", errors.Select(e => e.Code)), Activity.Current?.Id ?? "no-request");
    }
}
