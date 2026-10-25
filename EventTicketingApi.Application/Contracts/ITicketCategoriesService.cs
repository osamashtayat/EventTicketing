using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Application.DTOs.TicketCategories;
using EventTicketingApi.Common.Results;

namespace EventTicketingApi.Application.Contracts;

public interface ITicketCategoriesService
{
    Task<Result<PagedResult<TicketCategoryDto>>> GetTicketCategoriesAsync(
        TicketCategoryQuery query, CancellationToken cancellationToken = default);
    Task<Result<TicketCategoryDto>> GetTicketCategoryByIdAsync(int id, CancellationToken cancellationToken = default);
    Task<Result<TicketCategoryDto>> CreateTicketCategoryAsync(
        CreateTicketCategoryDto dto, CancellationToken cancellationToken = default);
    Task<Result<TicketCategoryDto>> UpdateTicketCategoryAsync(
        int id, UpdateTicketCategoryDto dto, CancellationToken cancellationToken = default);
    Task<Result> DeleteTicketCategoryAsync(int id, CancellationToken cancellationToken = default);
}
