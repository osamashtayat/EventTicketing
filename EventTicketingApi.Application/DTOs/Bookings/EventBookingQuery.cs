using System.ComponentModel.DataAnnotations;
using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Domain;

namespace EventTicketingApi.Application.DTOs.Bookings;

public class EventBookingQuery : PageQuery
{
    [EnumDataType(typeof(BookingStatus))]
    public BookingStatus? Status { get; set; }
}
