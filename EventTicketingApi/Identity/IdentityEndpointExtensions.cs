using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Auth;
using EventTicketingApi.Common.Results;
using EventTicketingApi.Infrastructure;
using Microsoft.AspNetCore.Http.Metadata;

namespace EventTicketingApi.Identity;

internal static class IdentityEndpointExtensions
{
    public static void MapApplicationIdentity(this WebApplication app)
    {
        // Keep Identity's login, refresh, and account-management endpoints, but
        // replace registration with our DTO and transactional role assignment.
        var registration = RequestDelegateFactory.Create(RegisterAsync,
            new RequestDelegateFactoryOptions { ServiceProvider = app.Services });

        app.MapGroup("/api/auth").MapIdentityApi<ApplicationUser>().Add(endpoint =>
        {
            if (endpoint is not RouteEndpointBuilder route ||
                !string.Equals(route.RoutePattern.RawText?.TrimEnd('/'), "/api/auth/register",
                    StringComparison.OrdinalIgnoreCase))
            {
                return;
            }

            route.RequestDelegate = registration.RequestDelegate;
            for (var i = route.Metadata.Count - 1; i >= 0; i--)
            {
                if (route.Metadata[i] is IAcceptsMetadata or IProducesResponseTypeMetadata)
                {
                    route.Metadata.RemoveAt(i);
                }
            }
            foreach (var metadata in registration.EndpointMetadata)
            {
                route.Metadata.Add(metadata);
            }
        });
    }

    private static async Task<IResult> RegisterAsync(
        RegisterDto dto, IAuthService authService, CancellationToken cancellationToken)
    {
        var result = await authService.RegisterAsync(dto, cancellationToken);
        if (result.IsSuccess)
        {
            return Results.Ok();
        }

        var status = result.FailureKind == FailureKind.Validation ? 400 : 500;
        return Results.Problem(statusCode: status,
            title: status == 400 ? "Invalid request" : "An unexpected error occurred",
            extensions: new Dictionary<string, object?>
            {
                ["traceId"] = System.Diagnostics.Activity.Current?.Id,
                ["errors"] = status == 400 ? result.Errors : null
            });
    }
}
