namespace EventTicketingApi.Domain;

public class BookingItem
{
    public int Id { get; set; }
    public int BookingId { get; set; }
    public Booking Booking { get; set; } = null!;
    public int TicketCategoryId { get; set; }
    public TicketCategory TicketCategory { get; set; } = null!;
    public int Quantity { get; set; }
    public int CancelledQuantity { get; set; }
    public decimal UnitPrice { get; set; }
    public required string CategoryName { get; set; }
}
