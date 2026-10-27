using AutoMapper;
using EventTicketingApi.Application.DTOs.Events;
using EventTicketingApi.Domain;

namespace EventTicketingApi.Application.MappingProfile;

public class EventMappingProfile : Profile
{
    public EventMappingProfile()
    {
        CreateMap<Event, EventDto>();
        CreateMap<CreateEventDto, Event>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.OrganizerId, opt => opt.Ignore())
            .ForMember(dest => dest.Venue, opt => opt.Ignore());
        CreateMap<UpdateEventDto, Event>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.OrganizerId, opt => opt.Ignore())
            .ForMember(dest => dest.Venue, opt => opt.Ignore());
    }
}
