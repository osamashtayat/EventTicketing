namespace EventTicketingApi.Application.DTOs.Events;

public record EventDto(
    int Id, string Name, string? Description,
    DateTime StartDate, DateTime EndDate, int Capacity, int VenueId);
