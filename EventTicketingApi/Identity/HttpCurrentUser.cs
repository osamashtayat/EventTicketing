using System.Security.Claims;
using EventTicketingApi.Application.Contracts;

namespace EventTicketingApi.Identity;

public class HttpCurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public string? Id => accessor.HttpContext?.User.Identity?.IsAuthenticated == true
        ? accessor.HttpContext.User.FindFirstValue(ClaimTypes.NameIdentifier) : null;

    public bool IsInRole(string role) => Id is not null &&
        accessor.HttpContext!.User.IsInRole(role);
}
