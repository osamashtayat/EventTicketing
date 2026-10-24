using System.ComponentModel.DataAnnotations;
namespace EventTicketingApi.Application.DTOs.Countries;

public class UpdateCountryDto : CreateCountryDto
{
    [Required]
    public int Id { get; set; }
}

