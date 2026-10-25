using AutoMapper;
using EventTicketingApi.Application.DTOs.Venues;
using EventTicketingApi.Domain;
namespace EventTicketingApi.Application.MappingProfile;

public class VenueMappingProfile : Profile
{
    public VenueMappingProfile()
    {
        CreateMap<Venue, VenueSummaryDto>();
        CreateMap<CreateVenueDto, Venue>()
    .ForMember(dest => dest.Id, opt => opt.Ignore())
    .ForMember(dest => dest.Country, opt => opt.Ignore());
       CreateMap<UpdateVenueDto, Venue>()
    .ForMember(dest => dest.Id, opt => opt.Ignore())
    .ForMember(dest => dest.Country, opt => opt.Ignore());
    }
}