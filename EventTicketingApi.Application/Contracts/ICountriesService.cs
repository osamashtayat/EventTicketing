using EventTicketingApi.Common.Results;
using EventTicketingApi.Domain;
using EventTicketingApi.Application.DTOs.Countries;

namespace EventTicketingApi.Application.Contracts;

public interface ICountriesService
{
     Task<bool> CountryExistsByIdAsync(int id,CancellationToken cancellationToken=default);
    Task<bool> CountryExistsByNameAsync(string name,CancellationToken cancellationToken=default);
    Task<Result<GetCountryDto>> GetCountryByIdAsync(int id,CancellationToken cancellationToken=default);
    Task<Result<GetCountryDto>> GetCountryByNameAsync(string name,CancellationToken cancellationToken=default);
    Task<Result<IReadOnlyList<CountrySummaryDto>>> GetCountriesAsync(CancellationToken cancellationToken=default);
    Task<Result<GetCountryDto>> CreateCountryAsync(CreateCountryDto createCountryDto,CancellationToken cancellationToken=default);
    Task<Result> UpdateCountryAsync(int id, UpdateCountryDto updateCountryDto,CancellationToken cancellationToken=default);
    Task<Result> DeleteCountryAsync(int id,CancellationToken cancellationToken=default);
}
