using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Application.DTOs.Venues;
using EventTicketingApi.Common.Results;

namespace EventTicketingApi.Application.Contracts;

public interface IVenuesService
{
    Task<Result<PagedResult<VenueSummaryDto>>> GetVenuesAsync(VenueQuery query, CancellationToken cancellationToken = default);

    Task<Result<VenueSummaryDto>> CreateVenueAsync(
        CreateVenueDto createVenueDto, CancellationToken cancellationToken = default);

    Task<Result<VenueSummaryDto>> GetVenueByIdAsync(
        int id, CancellationToken cancellationToken = default);

    Task<Result<VenueSummaryDto>> UpdateVenueAsync(
        int id, UpdateVenueDto updateVenueDto, CancellationToken cancellationToken = default);

    Task<Result> DeleteVenueAsync(int id, CancellationToken cancellationToken = default);
}
