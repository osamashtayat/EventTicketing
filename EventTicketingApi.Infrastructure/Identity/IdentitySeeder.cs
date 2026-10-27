using EventTicketingApi.Common.Constant;
using Microsoft.AspNetCore.Identity;
using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Auth;

namespace EventTicketingApi.Infrastructure.Identity;

public static class IdentitySeeder
{
    public static async Task SeedFirstAdminAsync(
        UserManager<ApplicationUser> userManager, IAuthService authService, RegisterDto account,
        CancellationToken cancellationToken = default)
    {
        if ((await userManager.GetUsersInRoleAsync(RoleNames.Admin)).Count > 0)
        {
            return;
        }

        // Never silently promote an existing public account with the configured email.
        var result = await authService.CreateAccountAsync(new CreateAccountDto
        {
            Email = account.Email,
            Password = account.Password,
            FirstName = account.FirstName,
            LastName = account.LastName,
            Role = RoleNames.Admin
        }, cancellationToken);
        if (!result.IsSuccess)
        {
            throw new InvalidOperationException(
                $"First-admin setup failed. Error codes: {string.Join(", ", result.Errors.Select(e => e.Code))}");
        }
    }

    public static async Task SeedRolesAsync(RoleManager<IdentityRole> roleManager)
    {
        string[] roles = [RoleNames.User, RoleNames.EventOrganizer, RoleNames.Admin];

        foreach (var role in roles)
        {
            if (await roleManager.RoleExistsAsync(role))
            {
                continue;
            }

            var result = await roleManager.CreateAsync(new IdentityRole(role));
            if (!result.Succeeded)
            {
                var errorCodes = string.Join(", ", result.Errors.Select(error => error.Code));
                throw new InvalidOperationException(
                    $"Failed to seed Identity role '{role}'. Error codes: {errorCodes}");
            }
        }
    }
}
