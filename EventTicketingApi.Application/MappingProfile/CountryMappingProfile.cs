using AutoMapper;
using EventTicketingApi.Application.DTOs.Countries;
using EventTicketingApi.Domain;
namespace EventTicketingApi.Application.MappingProfile;

public class CountryMappingProfile : Profile
{
    public CountryMappingProfile()
    {
     CreateMap<Country, GetCountryDto>()
    .ForCtorParam(nameof(GetCountryDto.Id),
        opt => opt.MapFrom(s => s.CountryId))
        .ForCtorParam(nameof(GetCountryDto.Venues), opt => opt.MapFrom(s => s.Venues));

        CreateMap<Country, CountrySummaryDto>()
       .ForCtorParam(nameof(CountrySummaryDto.Id),
       opt => opt.MapFrom(s => s.CountryId));

         
         CreateMap<CreateCountryDto, Country>()
    .ForMember(dest => dest.CountryId, opt => opt.Ignore())
    .ForMember(dest => dest.Venues, opt => opt.Ignore());

          CreateMap<UpdateCountryDto, Country>()
    .ForMember(dest => dest.CountryId, opt => opt.Ignore())
    .ForMember(dest => dest.Venues, opt => opt.Ignore());
    }
  
}

