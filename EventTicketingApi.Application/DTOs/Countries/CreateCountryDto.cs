using System.ComponentModel.DataAnnotations;
namespace EventTicketingApi.Application.DTOs.Countries;
public class CreateCountryDto
{
    [Required]
    public required string Name { get; set; }
    [Required]
    public required string ShortName { get; set; }
}