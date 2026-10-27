using AutoMapper;
using EventTicketingApi.Application.DTOs.TicketCategories;
using EventTicketingApi.Domain;

namespace EventTicketingApi.Application.MappingProfile;

public class TicketCategoryMappingProfile : Profile
{
    public TicketCategoryMappingProfile()
    {
        CreateMap<TicketCategory, TicketCategoryDto>();
        CreateMap<CreateTicketCategoryDto, TicketCategory>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.BookedQuantity, opt => opt.Ignore())
            .ForMember(dest => dest.Event, opt => opt.Ignore());
        CreateMap<UpdateTicketCategoryDto, TicketCategory>()
            .ForMember(dest => dest.Id, opt => opt.Ignore())
            .ForMember(dest => dest.BookedQuantity, opt => opt.Ignore())
            .ForMember(dest => dest.Event, opt => opt.Ignore());
    }
}
