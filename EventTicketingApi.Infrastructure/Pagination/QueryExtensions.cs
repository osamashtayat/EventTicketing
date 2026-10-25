using System.ComponentModel.DataAnnotations;
using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Common.Results;
using Microsoft.EntityFrameworkCore;

namespace EventTicketingApi.Infrastructure.Pagination;

internal static class QueryExtensions
{
    public static Error[] ValidateQuery(this PageQuery query)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(query, new ValidationContext(query), results, validateAllProperties: true);
        return results.Select(r => new Error("Query.Invalid", r.ErrorMessage!)).ToArray();
    }

    // Call only after validation, filtering, and deterministic ordering.
    public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
        this IQueryable<T> query, PageQuery page, CancellationToken cancellationToken)
    {
        var totalCount = await query.CountAsync(cancellationToken);
        var items = await query.Skip((page.PageNumber - 1) * page.PageSize)
            .Take(page.PageSize).ToListAsync(cancellationToken);
        return new PagedResult<T>(items, totalCount, page.PageNumber, page.PageSize);
    }
}
