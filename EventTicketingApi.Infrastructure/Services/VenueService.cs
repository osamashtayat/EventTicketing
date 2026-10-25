using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Infrastructure.Pagination;
using EventTicketingApi.Infrastructure.Logging;
using Microsoft.Extensions.Logging;
using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Venues;
using EventTicketingApi.Common.Constant;
using EventTicketingApi.Common.Results;
using AutoMapper;
using EventTicketingApi.Domain;
using EventTicketingApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using AutoMapper.QueryableExtensions;

namespace EventTicketingApi.Infrastructure.Services;

public class VenueService(AppDbContext appDbContext, IMapper mapper, ICountriesService countryService, ILogger<VenueService> logger) : IVenuesService
{
    public async Task<Result<PagedResult<VenueSummaryDto>>> GetVenuesAsync(
        VenueQuery query, CancellationToken cancellationToken = default)
    {
        var errors = query.ValidateQuery();
        if (errors.Length > 0)
        {
            return Result<PagedResult<VenueSummaryDto>>.BadRequest(errors).LogResult(logger);
        }

        var venues = appDbContext.Venues.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            venues = venues.Where(v => v.Name.Contains(search) || v.Address.Contains(search));
        }
        if (query.CountryId.HasValue)
        {
            venues = venues.Where(v => v.CountryId == query.CountryId.Value);
        }
        if (!string.IsNullOrWhiteSpace(query.City))
        {
            var city = query.City.Trim();
            venues = venues.Where(v => v.City == city);
        }

        var page = await venues.OrderBy(v => v.Name).ThenBy(v => v.Id)
            .ProjectTo<VenueSummaryDto>(mapper.ConfigurationProvider)
            .ToPagedResultAsync(query, cancellationToken);
        return Result<PagedResult<VenueSummaryDto>>.Success(page).LogResult(logger);
    }


    public async Task<Result<VenueSummaryDto>> CreateVenueAsync(CreateVenueDto createVenueDto, CancellationToken cancellationToken = default)
    {
        var countryExists = await countryService.CountryExistsByIdAsync(
            createVenueDto.CountryId, cancellationToken);

        if (!countryExists)
        {
            return Result<VenueSummaryDto>.NotFound(
                new Error(ErrorCodes.NotFound, "Country not found")).LogResult(logger);
        }
        bool duplicateName = await VenueExistsByNameAsync(createVenueDto.Name, cancellationToken);
        if (duplicateName)
        {
            return Result<VenueSummaryDto>.Conflict(new Error(ErrorCodes.Conflict, "Venue name already exists")).LogResult(logger);
        }
        var venue = mapper.Map<Venue>(createVenueDto);
        await appDbContext.Venues.AddAsync(venue, cancellationToken);
        await appDbContext.SaveChangesAsync(cancellationToken);
        return Result<VenueSummaryDto>.Success(mapper.Map<VenueSummaryDto>(venue)).LogResult(logger);
    }

    public async Task<Result<VenueSummaryDto>> GetVenueByIdAsync(int id, CancellationToken cancellationToken = default)

    {
        var venue = await appDbContext.Venues.AsNoTracking().Where(v => v.Id == id).ProjectTo<VenueSummaryDto>(mapper.ConfigurationProvider).FirstOrDefaultAsync(cancellationToken);
        if (venue is null)
        {
            return Result<VenueSummaryDto>.NotFound().LogResult(logger);
        }
        return Result<VenueSummaryDto>.Success(venue).LogResult(logger);
    }

    public async Task<Result<VenueSummaryDto>> UpdateVenueAsync(int id, UpdateVenueDto updateVenueDto, CancellationToken cancellationToken = default)
    {

        var venue = await appDbContext.Venues
        .FindAsync(new object[] { id }, cancellationToken);
        if (venue is null)
        {
            return Result<VenueSummaryDto>.NotFound().LogResult(logger);
        }
        var countryExists = await countryService.CountryExistsByIdAsync(
        updateVenueDto.CountryId, cancellationToken);

        if (!countryExists)
        {
            return Result<VenueSummaryDto>.NotFound(
                new Error(ErrorCodes.NotFound, "Country not found")).LogResult(logger);
        }


        if (id != updateVenueDto.Id)
        {
            return Result<VenueSummaryDto>.BadRequest(new Error(ErrorCodes.BadRequest, "Venue Id is not matching")).LogResult(logger);
        }
        var duplicateName = await appDbContext.Venues.AnyAsync(
            v => v.Name == updateVenueDto.Name && v.Id != id,
            cancellationToken);
        if (duplicateName)
        {
            return Result<VenueSummaryDto>.Conflict(new Error(ErrorCodes.Conflict, "Venue name already exists")).LogResult(logger);
        }
        var exceedsNewCapacity = await appDbContext.Events.AnyAsync(
            e => e.VenueId == id && e.Capacity > updateVenueDto.Capacity,
            cancellationToken);
        if (exceedsNewCapacity)
        {
            return Result<VenueSummaryDto>.Conflict(new Error("Venue.CapacityBelowEvent",
                "Venue capacity cannot be less than the capacity of an existing event there.")).LogResult(logger);
        }

        mapper.Map(updateVenueDto, venue);
        await appDbContext.SaveChangesAsync(cancellationToken);
        return Result<VenueSummaryDto>.Success(mapper.Map<VenueSummaryDto>(venue)).LogResult(logger);
    }

    public async Task<Result> DeleteVenueAsync(int id, CancellationToken cancellationToken = default)
    {
        var venue = await appDbContext.Venues
.FindAsync(new object[] { id }, cancellationToken);
        if (venue is null)
        {
            return Result.NotFound().LogResult(logger);
        }
        var hasEvents = await appDbContext.Events
            .AnyAsync(e => e.VenueId == id, cancellationToken);
        if (hasEvents)
        {
            return Result.Conflict(new Error(ErrorCodes.Conflict, "Venue has events.")).LogResult(logger);
        }
        appDbContext.Venues.Remove(venue);
        await appDbContext.SaveChangesAsync(cancellationToken);
        return Result.Success().LogResult(logger);
    }
    private async Task<bool> VenueExistsByNameAsync(string venueName, CancellationToken cancellationToken = default)
    {
        return await appDbContext.Venues.AnyAsync(v => v.Name == venueName, cancellationToken);
    }
    private async Task<bool> VenueExistsByIdAsync(int Id, CancellationToken cancellationToken = default)
    {
        return await appDbContext.Venues.AnyAsync(v => v.Id == Id, cancellationToken);
    }
}
