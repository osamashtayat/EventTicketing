using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventTicketingApi.Controllers;

[ApiController]
[Route("api/auth")]
[Authorize]
public class AuthController(IAuthService authService) : BaseApiController
{
    [HttpGet("me")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<ActionResult<CurrentUserDto>> GetCurrentUser(CancellationToken cancellationToken)
    {
        var result = await authService.GetCurrentUserAsync(cancellationToken);
        return result.IsSuccess ? Ok(result.Value) : FailureResponse(result.FailureKind, result.Errors);
    }
}
