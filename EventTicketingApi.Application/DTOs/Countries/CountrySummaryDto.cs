using EventTicketingApi.Application.DTOs.Countries;
namespace EventTicketingApi.Application.DTOs.Countries;

// lightweight DTO for GET /countries 
public record CountrySummaryDto(int Id, string Name, string ShortName);
