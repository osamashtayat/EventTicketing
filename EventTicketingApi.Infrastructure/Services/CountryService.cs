using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Infrastructure.Pagination;
using EventTicketingApi.Infrastructure.Logging;
using Microsoft.Extensions.Logging;
using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Countries;
using EventTicketingApi.Common.Constant;
using EventTicketingApi.Common.Results;
using EventTicketingApi.Domain;
using EventTicketingApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using AutoMapper.QueryableExtensions;

namespace EventTicketingApi.Infrastructure.Services;

public class CountryService(AppDbContext appDbContext, IMapper mapper, ILogger<CountryService> logger) : ICountriesService
{
    public async Task<bool> CountryExistsByIdAsync(int countryId, CancellationToken cancellationToken = default)
    {
        return await appDbContext.Countries.AnyAsync(c => c.CountryId == countryId, cancellationToken);
    }
    public async Task<bool> CountryExistsByNameAsync(string countryName, CancellationToken cancellationToken = default)
    {
        return await appDbContext.Countries.AnyAsync(c => c.Name == countryName, cancellationToken);
    }

    public async Task<Result<GetCountryDto>> CreateCountryAsync(CreateCountryDto createCountryDto, CancellationToken cancellationToken = default)
    {
        var CountryExists = await CountryExistsByNameAsync(createCountryDto.Name, cancellationToken);
        if (CountryExists)
        {
            return Result<GetCountryDto>.Conflict().LogResult(logger);
        }
        var country = mapper.Map<Country>(createCountryDto);
        await appDbContext.Countries.AddAsync(country, cancellationToken);
        await appDbContext.SaveChangesAsync(cancellationToken);
        return Result<GetCountryDto>.Success(mapper.Map<GetCountryDto>(country)).LogResult(logger);
    }

    public async Task<Result> DeleteCountryAsync(int id, CancellationToken cancellationToken = default)
    {


        var country = await appDbContext.Countries
.FindAsync(new object[] { id }, cancellationToken);
        if (country is null)
        {
            return Result.NotFound().LogResult(logger);
        }
        var hasVenues = await appDbContext.Venues
.AnyAsync(v => v.CountryId == id, cancellationToken);

        if (hasVenues)
        {
            return Result.Conflict(
                new Error(
                    "Country.HasVenues",
                    "Cannot delete this country because it has venues.")).LogResult(logger);
        }
        appDbContext.Countries.Remove(country);
        await appDbContext.SaveChangesAsync(cancellationToken);
        return Result.Success().LogResult(logger);
    }

    public async Task<Result<PagedResult<CountrySummaryDto>>> GetCountriesAsync(
        CountryQuery query, CancellationToken cancellationToken = default)
    {
        var errors = query.ValidateQuery(cancellationToken);
        if (errors.Length > 0)
        {
            return Result<PagedResult<CountrySummaryDto>>.BadRequest(errors).LogResult(logger);
        }

        var countries = appDbContext.Countries.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            countries = countries.Where(c => c.Name.Contains(search) || c.ShortName.Contains(search));
        }

        var page = await countries.OrderBy(c => c.Name).ThenBy(c => c.CountryId)
            .ProjectTo<CountrySummaryDto>(mapper.ConfigurationProvider)
            .ToPagedResultAsync(query, cancellationToken);
        return Result<PagedResult<CountrySummaryDto>>.Success(page).LogResult(logger);
    }

    public async Task<Result<GetCountryDto>> GetCountryByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        var country = await appDbContext.Countries.AsNoTracking().Where(c => c.CountryId == id).Include(c => c.Venues).FirstOrDefaultAsync(cancellationToken);
        if (country is null)
        {
            return Result<GetCountryDto>.NotFound().LogResult(logger);
        }
        return Result<GetCountryDto>.Success(mapper.Map<GetCountryDto>(country)).LogResult(logger);
    }
    public async Task<Result<GetCountryDto>> GetCountryByNameAsync(string name, CancellationToken cancellationToken = default)
    {

        var country = await appDbContext.Countries.AsNoTracking().Where(c => c.Name == name).Include(c => c.Venues).FirstOrDefaultAsync(cancellationToken);
        if (country is null)
        {
            return Result<GetCountryDto>.NotFound().LogResult(logger);
        }
        return Result<GetCountryDto>.Success(mapper.Map<GetCountryDto>(country)).LogResult(logger);
    }

    public async Task<Result> UpdateCountryAsync(int id, UpdateCountryDto updateCountryDto, CancellationToken cancellationToken = default)
    {

        var country = await appDbContext.Countries
.FindAsync(new object[] { id }, cancellationToken);
        if (country is null)
        {
            return Result.NotFound().LogResult(logger);
        }
        if (id != updateCountryDto.Id)
        {
            return Result.BadRequest(new Error(ErrorCodes.BadRequest, "Country Id is not matching")).LogResult(logger);
        }
        var duplicateName = await appDbContext.Countries.AnyAsync(
            c => c.Name == updateCountryDto.Name && c.CountryId != id,
            cancellationToken);
        if (duplicateName)
        {
            return Result.Conflict(new Error(ErrorCodes.Conflict, "Country name already exists")).LogResult(logger);
        }
        mapper.Map(updateCountryDto, country);
        await appDbContext.SaveChangesAsync(cancellationToken);
        return Result.Success().LogResult(logger);
    }


}