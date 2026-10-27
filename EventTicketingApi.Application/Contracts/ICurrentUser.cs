namespace EventTicketingApi.Application.Contracts;

public interface ICurrentUser
{
    string? Id { get; }
    bool IsInRole(string role);
}
