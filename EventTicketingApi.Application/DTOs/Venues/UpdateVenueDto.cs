using System.ComponentModel.DataAnnotations;
namespace EventTicketingApi.Application.DTOs.Venues;

public class UpdateVenueDto : CreateVenueDto
{
  public int Id { get; set; }
}