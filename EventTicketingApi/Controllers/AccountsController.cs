using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Auth;
using EventTicketingApi.Common.Constant;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EventTicketingApi.Controllers;

[ApiController]
[Route("api/accounts")]
[Authorize(Roles = RoleNames.Admin)]
public class AccountsController(IAuthService authService) : BaseApiController
{
    [HttpPost]
    public async Task<IActionResult> CreateAccount(CreateAccountDto dto, CancellationToken cancellationToken)
    {
        var result = await authService.CreateAccountAsync(dto, cancellationToken);
        return result.IsSuccess ? StatusCode(StatusCodes.Status201Created)
            : FailureResponse(result.FailureKind, result.Errors);
    }
}
