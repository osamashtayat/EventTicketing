using EventTicketingApi.Application.Validation;
using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Auth;
using EventTicketingApi.Common.Constant;
using EventTicketingApi.Common.Results;
using EventTicketingApi.Infrastructure.Logging;
using EventTicketingApi.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;

namespace EventTicketingApi.Infrastructure.Services;

public class AuthService(
    AppDbContext appDbContext,
    UserManager<ApplicationUser> userManager,
    RoleManager<IdentityRole> roleManager,
    ILogger<AuthService> logger,
    ICurrentUser currentUser) : IAuthService
{
    public async Task<Result<CurrentUserDto>> GetCurrentUserAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (string.IsNullOrEmpty(currentUser.Id))
            return Result<CurrentUserDto>.Forbidden(new Error("Auth.SignInRequired", "Sign in to view your profile.")).LogResult(logger);
        var user = await userManager.FindByIdAsync(currentUser.Id);
        if (user is null)
            return Result<CurrentUserDto>.NotFound(new Error("Auth.UserNotFound", "Account not found.")).LogResult(logger);
        var roles = await userManager.GetRolesAsync(user);
        cancellationToken.ThrowIfCancellationRequested();
        return Result<CurrentUserDto>.Success(new CurrentUserDto(user.Id, user.Email,
            user.FirstName, user.LastName, roles.Order(StringComparer.Ordinal).ToArray())).LogResult(logger);
    }

    public async Task<Result> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default)
    {
        var errors = DtoValidator.Validate(dto, "Auth.InvalidRegistration", cancellationToken);
        if (errors.Length > 0)
        {
            return Result.BadRequest(errors).LogResult(logger);
        }

        return (await CreateAccountCoreAsync(dto, RoleNames.User, cancellationToken)).LogResult(logger);
    }

    public async Task<Result> CreateAccountAsync(CreateAccountDto dto, CancellationToken cancellationToken = default)
    {
        var errors = DtoValidator.Validate(dto, "Auth.InvalidAccount", cancellationToken);
        if (errors.Length > 0)
        {
            return Result.BadRequest(errors).LogResult(logger);
        }

        return (await CreateAccountCoreAsync(dto, dto.Role, cancellationToken)).LogResult(logger);
    }

    private async Task<Result> CreateAccountCoreAsync(
        RegisterDto dto, string role, CancellationToken cancellationToken)
    {
        if (!await roleManager.RoleExistsAsync(role))
        {
            return Result.Failure(new Error("Auth.RoleMissing", "Account creation is currently unavailable."));
        }

        var user = new ApplicationUser
        {
            UserName = dto.Email.Trim(),
            Email = dto.Email.Trim(),
            FirstName = dto.FirstName.Trim(),
            LastName = dto.LastName.Trim()
        };

        await using var transaction = await appDbContext.Database.BeginTransactionAsync(cancellationToken);
        var creationResult = await userManager.CreateAsync(user, dto.Password);
        if (!creationResult.Succeeded)
        {
            return Result.BadRequest(ToErrors(creationResult));
        }

        cancellationToken.ThrowIfCancellationRequested();
        var roleResult = await userManager.AddToRoleAsync(user, role);
        if (!roleResult.Succeeded)
        {
            return Result.Failure(ToErrors(roleResult));
        }

        await transaction.CommitAsync(cancellationToken);
        return Result.Success();
    }

    private static Error[] ToErrors(IdentityResult result) =>
        result.Errors.Select(error => new Error($"Auth.{error.Code}", error.Description)).ToArray();
}
