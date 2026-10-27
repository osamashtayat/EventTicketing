using EventTicketingApi.Infrastructure.Identity;
using EventTicketingApi.Application.Validation;
using System.Data;
using AutoMapper;
using AutoMapper.QueryableExtensions;
using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Application.DTOs.TicketCategories;
using EventTicketingApi.Common.Results;
using EventTicketingApi.Domain;
using EventTicketingApi.Infrastructure.Logging;
using EventTicketingApi.Infrastructure.Pagination;
using EventTicketingApi.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EventTicketingApi.Infrastructure.Services;

public class TicketCategoryService(
    AppDbContext appDbContext, IMapper mapper, ILogger<TicketCategoryService> logger, EventAccess eventAccess) : ITicketCategoriesService
{
    public async Task<Result<PagedResult<TicketCategoryDto>>> GetTicketCategoriesAsync(
        TicketCategoryQuery query, CancellationToken cancellationToken = default)
    {
        var errors = query.ValidateQuery(cancellationToken);
        if (errors.Length > 0)
        {
            return Result<PagedResult<TicketCategoryDto>>.BadRequest(errors).LogResult(logger);
        }

        var categories = appDbContext.TicketCategories.AsNoTracking();
        if (query.EventId.HasValue)
        {
            categories = categories.Where(t => t.EventId == query.EventId.Value);
        }
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var search = query.Search.Trim();
            categories = categories.Where(t => t.Name.Contains(search) ||
                (t.Description != null && t.Description.Contains(search)));
        }
        if (query.MinPrice.HasValue)
        {
            categories = categories.Where(t => t.Price >= query.MinPrice.Value);
        }
        if (query.MaxPrice.HasValue)
        {
            categories = categories.Where(t => t.Price <= query.MaxPrice.Value);
        }

        var page = await categories.OrderBy(t => t.Name).ThenBy(t => t.Id)
            .ProjectTo<TicketCategoryDto>(mapper.ConfigurationProvider)
            .ToPagedResultAsync(query, cancellationToken);
        return Result<PagedResult<TicketCategoryDto>>.Success(page).LogResult(logger);
    }

    public async Task<Result<TicketCategoryDto>> GetTicketCategoryByIdAsync(
        int id, CancellationToken cancellationToken = default)
    {
        var dto = await appDbContext.TicketCategories.AsNoTracking().Where(t => t.Id == id)
            .ProjectTo<TicketCategoryDto>(mapper.ConfigurationProvider).FirstOrDefaultAsync(cancellationToken);
        return (dto is null ? Result<TicketCategoryDto>.NotFound(MissingCategory())
            : Result<TicketCategoryDto>.Success(dto)).LogResult(logger);
    }

    public async Task<Result<TicketCategoryDto>> CreateTicketCategoryAsync(
        CreateTicketCategoryDto dto, CancellationToken cancellationToken = default)
    {
        if (!eventAccess.CanManage)
        {
            return Result<TicketCategoryDto>.Forbidden(EventAccess.Denied()).LogResult(logger);
        }

        var errors = ValidateInput(dto, cancellationToken);
        if (errors.Length > 0)
        {
            return Result<TicketCategoryDto>.BadRequest(errors).LogResult(logger);
        }

        await using var transaction = await appDbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);
        await appDbContext.LockEventAsync(dto.EventId, cancellationToken);
        var allocation = await ValidateAllocationAsync(dto, null, cancellationToken);
        if (!allocation.IsSuccess)
        {
            return AllocationFailure(allocation).LogResult(logger);
        }

        var category = mapper.Map<TicketCategory>(dto);
        appDbContext.TicketCategories.Add(category);
        await appDbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Result<TicketCategoryDto>.Success(mapper.Map<TicketCategoryDto>(category)).LogResult(logger);
    }

    public async Task<Result<TicketCategoryDto>> UpdateTicketCategoryAsync(
        int id, UpdateTicketCategoryDto dto, CancellationToken cancellationToken = default)
    {
        if (!eventAccess.CanManage)
        {
            return Result<TicketCategoryDto>.Forbidden(EventAccess.Denied()).LogResult(logger);
        }

        if (id != dto.Id)
        {
            return Result<TicketCategoryDto>.BadRequest(new Error("TicketCategory.IdMismatch",
                "Route ID and body ID must match.")).LogResult(logger);
        }
        var errors = ValidateInput(dto, cancellationToken);
        if (errors.Length > 0)
        {
            return Result<TicketCategoryDto>.BadRequest(errors).LogResult(logger);
        }

        var sourceEventId = await appDbContext.TicketCategories.AsNoTracking().Where(t => t.Id == id)
            .Select(t => (int?)t.EventId).SingleOrDefaultAsync(cancellationToken);
        if (!sourceEventId.HasValue)
        {
            return Result<TicketCategoryDto>.NotFound(MissingCategory()).LogResult(logger);
        }

        await using var transaction = await appDbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);
        foreach (var eventId in new[] { sourceEventId.Value, dto.EventId }.Distinct().Order())
            await appDbContext.LockEventAsync(eventId, cancellationToken);
        var category = await appDbContext.TicketCategories.FindAsync(new object[] { id }, cancellationToken);
        if (category is null)
        {
            return Result<TicketCategoryDto>.NotFound(MissingCategory()).LogResult(logger);
        }
        if (category.EventId != sourceEventId.Value)
        {
            return Result<TicketCategoryDto>.Conflict(new Error("TicketCategory.RetryRequired",
                "The category moved during this request. Retry the operation.")).LogResult(logger);
        }
        var access = await eventAccess.CheckEventAsync(category.EventId, cancellationToken);
        if (!access.IsSuccess)
        {
            return Result<TicketCategoryDto>.Forbidden(EventAccess.Denied()).LogResult(logger);
        }
        if (dto.Capacity < category.BookedQuantity)
        {
            return Result<TicketCategoryDto>.Conflict(new Error("TicketCategory.CapacityBooked",
                "Capacity cannot be less than the active booked quantity.")).LogResult(logger);
        }
        if (dto.EventId != category.EventId && await appDbContext.BookingItems.AnyAsync(i => i.TicketCategoryId == id, cancellationToken))
        {
            return Result<TicketCategoryDto>.Conflict(new Error("TicketCategory.HasBookingHistory",
                "Cannot move a category with booking history.")).LogResult(logger);
        }
        var allocation = await ValidateAllocationAsync(dto, id, cancellationToken);
        if (!allocation.IsSuccess)
        {
            return AllocationFailure(allocation).LogResult(logger);
        }

        mapper.Map(dto, category);
        await appDbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Result<TicketCategoryDto>.Success(mapper.Map<TicketCategoryDto>(category)).LogResult(logger);
    }

    public async Task<Result> DeleteTicketCategoryAsync(int id, CancellationToken cancellationToken = default)
    {
        if (!eventAccess.CanManage)
        {
            return Result.Forbidden(EventAccess.Denied()).LogResult(logger);
        }

        var sourceEventId = await appDbContext.TicketCategories.AsNoTracking().Where(t => t.Id == id)
            .Select(t => (int?)t.EventId).SingleOrDefaultAsync(cancellationToken);
        if (!sourceEventId.HasValue)
        {
            return Result.NotFound(MissingCategory()).LogResult(logger);
        }

        await using var transaction = await appDbContext.Database.BeginTransactionAsync(
            IsolationLevel.Serializable, cancellationToken);
        await appDbContext.LockEventAsync(sourceEventId.Value, cancellationToken);
        var category = await appDbContext.TicketCategories.FindAsync(new object[] { id }, cancellationToken);
        if (category is null)
        {
            return Result.NotFound(MissingCategory()).LogResult(logger);
        }
        if (category.EventId != sourceEventId.Value)
        {
            return Result.Conflict(new Error("TicketCategory.RetryRequired",
                "The category moved during this request. Retry the operation.")).LogResult(logger);
        }
        var access = await eventAccess.CheckEventAsync(category.EventId, cancellationToken);
        if (!access.IsSuccess)
        {
            return Result.Forbidden(EventAccess.Denied()).LogResult(logger);
        }

        if (await appDbContext.BookingItems.AnyAsync(i => i.TicketCategoryId == id, cancellationToken))
        {
            return Result.Conflict(new Error("TicketCategory.HasBookingHistory",
                "Cannot delete a category with booking history.")).LogResult(logger);
        }

        appDbContext.TicketCategories.Remove(category);
        await appDbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Result.Success().LogResult(logger);
    }

    private static Error[] ValidateInput(CreateTicketCategoryDto dto, CancellationToken cancellationToken)
    {
        var errors = DtoValidator.Validate(dto, "TicketCategory.InvalidInput", cancellationToken).ToList();
        if (dto.Price != decimal.Round(dto.Price, 2))
        {
            errors.Add(new Error("TicketCategory.PricePrecision", "Price must have at most two decimal places."));
        }
        return errors.ToArray();
    }

    // Must run in the same serializable transaction as the write.
    private async Task<Result> ValidateAllocationAsync(
        CreateTicketCategoryDto dto, int? categoryId, CancellationToken cancellationToken)
    {
        var access = await eventAccess.CheckEventAsync(dto.EventId, cancellationToken);
        if (!access.IsSuccess)
        {
            return access;
        }

        var capacity = await appDbContext.Events.AsNoTracking().Where(e => e.Id == dto.EventId)
            .Select(e => (int?)e.Capacity).FirstOrDefaultAsync(cancellationToken);
        if (!capacity.HasValue)
        {
            return Result.NotFound(new Error("Event.NotFound", "Event not found."));
        }

        var allocated = await appDbContext.TicketCategories
            .Where(t => t.EventId == dto.EventId && t.Id != (categoryId ?? 0))
            .SumAsync(t => (long?)t.Capacity, cancellationToken) ?? 0;
        if (allocated + dto.Capacity > capacity.Value)
        {
            return Result.Conflict(new Error("TicketCategory.ExceedsEventCapacity",
                "Combined ticket-category capacity cannot exceed event capacity."));
        }

        return Result.Success();
    }

    private static Result<TicketCategoryDto> AllocationFailure(Result result) =>
        result.FailureKind switch
        {
            FailureKind.NotFound => Result<TicketCategoryDto>.NotFound(result.Errors.ToArray()),
            FailureKind.Forbidden => Result<TicketCategoryDto>.Forbidden(result.Errors.ToArray()),
            _ => Result<TicketCategoryDto>.Conflict(result.Errors.ToArray())
        };

    private static Error MissingCategory() => new("TicketCategory.NotFound", "Ticket category not found.");
}
