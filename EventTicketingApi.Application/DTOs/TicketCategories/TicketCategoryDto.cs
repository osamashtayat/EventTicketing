namespace EventTicketingApi.Application.DTOs.TicketCategories;

public record TicketCategoryDto(
    int Id, string Name, string? Description, decimal Price, int Capacity, int EventId);
