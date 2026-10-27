namespace EventTicketingApi.Domain;

public class Event
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public  string? Description { get; set; }
    public required DateTime StartDate { get; set; }
    public required DateTime EndDate { get; set; }
    public required int Capacity { get; set; }
    public required Venue Venue { get; set; }
    public string OrganizerId { get; set; } = string.Empty;
    public int VenueId { get; set; }
}
