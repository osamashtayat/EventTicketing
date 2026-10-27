namespace EventTicketingApi.Application.DTOs.Auth;

public record CurrentUserDto(string Id, string? Email, string FirstName, string LastName,
    IReadOnlyList<string> Roles);
