using EventTicketingApi.Common.Results;
using EventTicketingApi.Application.DTOs.Venues;
namespace EventTicketingApi.Application.Contracts;

public interface IVenuesService
{
    Task<Result<VenueSummaryDto>> CreateVenueAsync(CreateVenueDto createVenueDto, CancellationToken cancellationToken = default);
    Task<Result<VenueSummaryDto>> GetVenueByIdAsync(int id, CancellationToken cancellationToken = default);
}
