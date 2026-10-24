namespace EventTicketingApi.Domain;

public class TicketCategory
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public required decimal Price { get; set; }
    public  string? Description { get; set; }
    public int Capacity { get; set; }
    public int EventId { get; set; }
public required Event Event { get; set; }
}
