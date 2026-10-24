using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Countries;
using EventTicketingApi.Common.Constant;
using EventTicketingApi.Common.Results;
using EventTicketingApi.Domain;
using EventTicketingApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using System.Security.Cryptography.X509Certificates;

namespace EventTicketingApi.Infrastructure.Services;

public class CountryService(AppDbContext appDbContext,IMapper mapper) : ICountriesService
{
    public  async Task<bool> CountryExistsByIdAsync(int countryId, CancellationToken cancellationToken = default)
    {
        return await appDbContext.Countries.AnyAsync(c => c.CountryId == countryId, cancellationToken);
    }
    public  async Task<bool> CountryExistsByNameAsync(string countryName, CancellationToken cancellationToken = default)
    {
        return await appDbContext.Countries.AnyAsync(c => c.Name == countryName, cancellationToken);
    }

    public async Task<Result<GetCountryDto>> CreateCountryAsync(CreateCountryDto createCountryDto, CancellationToken cancellationToken = default)
    {
        try
        {


            var CountryExists = await CountryExistsByNameAsync(createCountryDto.Name, cancellationToken);
            if (CountryExists)
            {
                return Result<GetCountryDto>.Conflict();
            }
            var country = mapper.Map<Country>(createCountryDto);
            await appDbContext.Countries.AddAsync(country, cancellationToken);
            await appDbContext.SaveChangesAsync(cancellationToken);
            return Result<GetCountryDto>.Success(mapper.Map<GetCountryDto>(country));
        }
      catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return Result<GetCountryDto>.Failure(new Error(ErrorCodes.Failure, "Failed to create country"));
        }
    }

    public async  Task<Result> DeleteCountryAsync(int id, CancellationToken cancellationToken = default)
    {
       
       
        try
        {
             var country = await appDbContext.Countries
            .FindAsync(new object[] { id }, cancellationToken);
            if (country is null)
        {
            return Result.NotFound();
        }
            var hasVenues = await appDbContext.Venues
    .AnyAsync(v => v.CountryId == id, cancellationToken);

if (hasVenues)
{
    return Result.Conflict(
        new Error(
            "Country.HasVenues",
            "Cannot delete this country because it has venues."));
}
            appDbContext.Countries.Remove(country);
            await appDbContext.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
   catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return Result.Failure(new Error(ErrorCodes.Failure, "Failed to delete country"));
        }
    }

    public async Task<Result<IReadOnlyList<CountrySummaryDto>>> GetCountriesAsync(CancellationToken cancellationToken = default)
    {
        try
        {

            var countries = await appDbContext.Countries.AsNoTracking().ProjectTo<CountrySummaryDto>(mapper.ConfigurationProvider).ToListAsync(cancellationToken);
            return Result<IReadOnlyList<CountrySummaryDto>>.Success(countries);
        }
catch (Exception ex) when (ex is not OperationCanceledException)
            {
                return Result<IReadOnlyList<CountrySummaryDto>>.Failure(new Error(ErrorCodes.Failure, "Failed to get countries"));
        }
    }

public async Task<Result<GetCountryDto>> GetCountryByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        try
        {
            var country = await appDbContext.Countries.AsNoTracking().Where(c => c.CountryId == id).Include(c => c.Venues).FirstOrDefaultAsync(cancellationToken);
            if(country is null)
            {
                return Result<GetCountryDto>.NotFound();
            }
            return Result<GetCountryDto>.Success(mapper.Map<GetCountryDto>(country));
        }
catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return Result<GetCountryDto>.Failure(new Error(ErrorCodes.Failure, "Failed to get country"));
        }
    }
public async Task<Result<GetCountryDto>> GetCountryByNameAsync(string name, CancellationToken cancellationToken = default)
    {
      
        try
        {
            var country = await appDbContext.Countries.AsNoTracking().Where(c => c.Name == name).Include(c => c.Venues).FirstOrDefaultAsync(cancellationToken);
            if(country is null)
            {
                return Result<GetCountryDto>.NotFound();
            }
            return Result<GetCountryDto>.Success(mapper.Map<GetCountryDto>(country));
        }
       catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return Result<GetCountryDto>.Failure(new Error(ErrorCodes.Failure, "Failed to get country"));
        }
    }

    public async Task<Result> UpdateCountryAsync(int id,UpdateCountryDto updateCountryDto, CancellationToken cancellationToken = default)
    {
        
        try
        {

            var country = await appDbContext.Countries
            .FindAsync(new object[] { id }, cancellationToken);     
       if (country is null)
        {
            return Result.NotFound();
        }
            if (id != updateCountryDto.Id)
            {
                return Result.BadRequest(new Error(ErrorCodes.BadRequest, "Country Id is not matching"));
            }
            var duplicateName = await appDbContext.Countries.AnyAsync(
                c => c.Name == updateCountryDto.Name && c.CountryId != id,
                cancellationToken);
            if (duplicateName)
                {
                    return Result.Conflict(new Error(ErrorCodes.Conflict, "Country name already exists"));
            }
            mapper.Map(updateCountryDto, country);
            await appDbContext.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
       catch (Exception ex) when (ex is not OperationCanceledException)
        {
            return Result.Failure(new Error(ErrorCodes.Failure, "Failed to update country"));
        }
    }

   
}