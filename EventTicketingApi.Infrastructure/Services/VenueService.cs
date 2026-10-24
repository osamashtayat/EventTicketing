using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Countries;
using EventTicketingApi.Application.DTOs.Venues;
using EventTicketingApi.Common.Constant;
using EventTicketingApi.Common.Results;
using AutoMapper;
using EventTicketingApi.Domain;
using EventTicketingApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using AutoMapper.QueryableExtensions;

namespace EventTicketingApi.Infrastructure.Services;

public class VenueService(AppDbContext appDbContext,IMapper mapper,ICountriesService countryService) : IVenuesService
{
    public async Task<Result<VenueSummaryDto>> CreateVenueAsync(CreateVenueDto createVenueDto, CancellationToken cancellationToken = default)
    {
        var countryExists = await countryService.CountryExistsByIdAsync(createVenueDto.CountryId, cancellationToken);
        if (!countryExists)
        {
            return Result<VenueSummaryDto>.NotFound(new Error(ErrorCodes.NotFound, "Country not found"));
        }
        var venue = mapper.Map<Venue>(createVenueDto);
        await appDbContext.Venues.AddAsync(venue, cancellationToken);
        await appDbContext.SaveChangesAsync(cancellationToken);
        return Result<VenueSummaryDto>.Success(mapper.Map<VenueSummaryDto>(venue));
    }

    public async Task<Result<VenueSummaryDto>> GetVenueByIdAsync(int id, CancellationToken cancellationToken = default)

    {
        try
        {
            var venue = await appDbContext.Venues.AsNoTracking().Where(v => v.Id == id).ProjectTo<VenueSummaryDto>(mapper.ConfigurationProvider).FirstOrDefaultAsync(cancellationToken);
            if (venue is null)
            {
                return Result<VenueSummaryDto>.NotFound();
            }
            return Result<VenueSummaryDto>.Success(mapper.Map<VenueSummaryDto>(venue));

        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return Result<VenueSummaryDto>.Failure(new Error(ErrorCodes.Failure, "Failed to get venue"));
        }
    }
    




    
}
