namespace EventTicketingApi.Domain;

public enum BookingStatus { Confirmed = 0, PartiallyCancelled = 1, Cancelled = 2 }

public class Booking
{
    public int Id { get; set; }
    public required string CustomerId { get; set; }
    public int EventId { get; set; }
    public Event Event { get; set; } = null!;
    public BookingStatus Status { get; set; } = BookingStatus.Confirmed;
    public DateTimeOffset CreatedAtUtc { get; set; }
    public DateTimeOffset? CancelledAtUtc { get; set; }
    public string Currency { get; set; } = "USD";
    public decimal TotalAmount { get; set; }
    public List<BookingItem> Items { get; set; } = [];
}
