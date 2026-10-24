namespace EventTicketingApi.Domain;

public class Venue
{
public int Id { get; set; }
public string Address { get; set; }=string.Empty;
public required string Name { get; set; }
public required string City { get; set; }
public required Country Country { get; set; }
public int CountryId { get; set; }
    public required int Capacity { get; set; }

}
