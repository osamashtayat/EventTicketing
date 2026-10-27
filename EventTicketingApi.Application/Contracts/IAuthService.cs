using EventTicketingApi.Application.DTOs.Auth;
using EventTicketingApi.Common.Results;

namespace EventTicketingApi.Application.Contracts;

public interface IAuthService
{
    Task<Result<CurrentUserDto>> GetCurrentUserAsync(CancellationToken cancellationToken = default);
    Task<Result> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default);
    Task<Result> CreateAccountAsync(CreateAccountDto dto, CancellationToken cancellationToken = default);
}
