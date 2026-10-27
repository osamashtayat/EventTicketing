using EventTicketingApi.Domain;

namespace EventTicketingApi.Application.DTOs.Bookings;

public record BookingItemDto(int Id, int TicketCategoryId, string CategoryName,
    int Quantity, int CancelledQuantity, decimal UnitPrice)
{
    public int RemainingQuantity => Quantity - CancelledQuantity;
    public decimal OriginalAmount => Quantity * UnitPrice;
    public decimal CancelledAmount => CancelledQuantity * UnitPrice;
    public decimal RemainingAmount => RemainingQuantity * UnitPrice;
}

public record BookingDto(int Id, int EventId, BookingStatus Status, string Currency,
    decimal TotalAmount, DateTimeOffset CreatedAtUtc, DateTimeOffset? CancelledAtUtc,
    IReadOnlyList<BookingItemDto> Items)
{
    public decimal CancelledAmount => Items.Sum(i => i.CancelledAmount);
    public decimal RemainingAmount => TotalAmount - CancelledAmount;
}

public record CategoryAvailabilityDto(int TicketCategoryId, string Name, decimal Price,
    string Currency, int Capacity, int BookedQuantity)
{
    public int AvailableQuantity => Capacity - BookedQuantity;
}
