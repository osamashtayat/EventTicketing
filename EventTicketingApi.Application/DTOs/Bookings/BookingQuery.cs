using System.ComponentModel.DataAnnotations;

namespace EventTicketingApi.Application.DTOs.Bookings;

public class BookingQuery : EventBookingQuery
{
    [Range(1, int.MaxValue)]
    public int? EventId { get; set; }
}
