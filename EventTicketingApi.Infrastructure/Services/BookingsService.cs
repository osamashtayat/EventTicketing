using System.Linq.Expressions;
using System.Runtime.CompilerServices;
using EventTicketingApi.Application.Contracts;
using EventTicketingApi.Application.DTOs.Bookings;
using EventTicketingApi.Application.DTOs.Common;
using EventTicketingApi.Application.Validation;
using EventTicketingApi.Common.Results;
using EventTicketingApi.Domain;
using EventTicketingApi.Infrastructure.Logging;
using EventTicketingApi.Infrastructure.Identity;
using EventTicketingApi.Infrastructure.Pagination;
using EventTicketingApi.Infrastructure.Persistence;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace EventTicketingApi.Infrastructure.Services;

public class BookingsService(AppDbContext db, ICurrentUser currentUser, TimeProvider clock,
    ILogger<BookingsService> logger, EventAccess eventAccess) : IBookingsService
{
    private static readonly Expression<Func<Booking, BookingDto>> Projection = b => new BookingDto(
        b.Id, b.EventId, b.Status, b.Currency, b.TotalAmount, b.CreatedAtUtc, b.CancelledAtUtc,
        b.Items.OrderBy(i => i.Id).Select(i => new BookingItemDto(i.Id, i.TicketCategoryId,
            i.CategoryName, i.Quantity, i.CancelledQuantity, i.UnitPrice)).ToList());

    private static readonly Func<Booking, BookingDto> MapBooking = Projection.Compile();

    public Task<Result<BookingDto>> CreateBookingAsync(CreateBookingDto dto, CancellationToken cancellationToken = default) =>
        RunMutationAsync(() => CreateCoreAsync(dto, cancellationToken));

    public Task<Result<BookingDto>> CancelBookingAsync(int id, CancelBookingDto dto, CancellationToken cancellationToken = default) =>
        RunMutationAsync(() => CancelCoreAsync(id, dto, cancellationToken));

    public async Task<Result<BookingDto>> GetBookingAsync(int id, CancellationToken cancellationToken = default)
    {
        var booking = await OwnedBookings().Where(b => b.Id == id).Select(Projection).FirstOrDefaultAsync(cancellationToken);
        return (booking is null ? MissingBooking() : Result<BookingDto>.Success(booking)).LogResult(logger);
    }

    public async Task<Result<PagedResult<BookingDto>>> GetMyBookingsAsync(BookingQuery query, CancellationToken cancellationToken = default)
    {
        var validation = ValidateRequest(query, "Query.Invalid", cancellationToken);
        if (!validation.IsSuccess)
            return ToFailure<PagedResult<BookingDto>>(validation).LogResult(logger);
        var bookings = OwnedBookings();
        if (query.EventId.HasValue) bookings = bookings.Where(b => b.EventId == query.EventId.Value);
        var page = await ReadPageAsync(bookings, query, cancellationToken);
        return Result<PagedResult<BookingDto>>.Success(page).LogResult(logger);
    }

    public async Task<Result<PagedResult<BookingDto>>> GetEventBookingsAsync(
        int eventId, EventBookingQuery query, CancellationToken cancellationToken = default)
    {
        if (eventId < 1)
            return Result<PagedResult<BookingDto>>.BadRequest(new Error("Booking.InvalidEvent", "Event ID must be positive.")).LogResult(logger);
        var access = await eventAccess.CheckEventAsync(eventId, cancellationToken);
        if (!access.IsSuccess)
            return ToFailure<PagedResult<BookingDto>>(access).LogResult(logger);
        var validation = ValidateRequest(query, "Query.Invalid", cancellationToken);
        if (!validation.IsSuccess)
            return ToFailure<PagedResult<BookingDto>>(validation).LogResult(logger);
        var bookings = db.Bookings.AsNoTracking().Where(b => b.EventId == eventId);
        var page = await ReadPageAsync(bookings, query, cancellationToken);
        return Result<PagedResult<BookingDto>>.Success(page).LogResult(logger);
    }

    private Task<PagedResult<BookingDto>> ReadPageAsync(
        IQueryable<Booking> bookings, EventBookingQuery query, CancellationToken ct)
    {
        if (query.Status.HasValue) bookings = bookings.Where(b => b.Status == query.Status.Value);
        return bookings.OrderByDescending(b => b.CreatedAtUtc).ThenByDescending(b => b.Id)
            .Select(Projection).ToPagedResultAsync(query, ct);
    }

    public async Task<Result<IReadOnlyList<CategoryAvailabilityDto>>> GetAvailabilityAsync(int eventId, CancellationToken cancellationToken = default)
    {
        if (eventId < 1)
            return Result<IReadOnlyList<CategoryAvailabilityDto>>.BadRequest(new Error("Booking.InvalidEvent", "Event ID must be positive.")).LogResult(logger);
        if (!await db.Events.AnyAsync(e => e.Id == eventId, cancellationToken))
            return Result<IReadOnlyList<CategoryAvailabilityDto>>.NotFound(new Error("Event.NotFound", "Event not found.")).LogResult(logger);
        var items = await db.TicketCategories.AsNoTracking().Where(t => t.EventId == eventId)
            .OrderBy(t => t.Name).ThenBy(t => t.Id).Select(t => new CategoryAvailabilityDto(
                t.Id, t.Name, t.Price, "USD", t.Capacity, t.BookedQuantity)).ToListAsync(cancellationToken);
        return Result<IReadOnlyList<CategoryAvailabilityDto>>.Success(items).LogResult(logger);
    }

    private async Task<Result<BookingDto>> CreateCoreAsync(CreateBookingDto dto, CancellationToken ct)
    {
        var validation = ValidateRequest(dto, "Booking.InvalidInput", ct);
        if (!validation.IsSuccess) return ToFailure<BookingDto>(validation);

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        // Database locks coordinate across API instances and protect event dates during the write.
        var eventEntity = await db.LockEventAsync(dto.EventId, ct);
        if (eventEntity is null) return Result<BookingDto>.NotFound(new Error("Event.NotFound", "Event not found."));
        if (clock.GetUtcNow() >= StartUtc(eventEntity))
            return Result<BookingDto>.Conflict(new Error("Booking.EventStarted", "Booking is closed because the event has started."));

        var booking = new Booking { CustomerId = currentUser.Id!, EventId = dto.EventId, CreatedAtUtc = clock.GetUtcNow() };
        var reservation = await ReserveItemsAsync(booking, dto.Items, ct);
        if (!reservation.IsSuccess) return ToFailure<BookingDto>(reservation);
        booking.TotalAmount = booking.Items.Sum(i => i.Quantity * i.UnitPrice);
        db.Bookings.Add(booking);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Result<BookingDto>.Success(ToDto(booking));
    }

    // All inventory claims participate in the caller's transaction.
    private async Task<Result> ReserveItemsAsync(Booking booking, IEnumerable<CreateBookingItemDto> inputs, CancellationToken ct)
    {
        foreach (var input in inputs.OrderBy(i => i.TicketCategoryId))
        {
            var category = await db.TicketCategories.FromSqlInterpolated(
                $"SELECT * FROM [TicketCategories] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {input.TicketCategoryId}")
                .AsNoTracking().SingleOrDefaultAsync(ct);
            if (category is null)
                return Result.NotFound(new Error("TicketCategory.NotFound", "Ticket category not found."));
            if (category.EventId != booking.EventId)
                return Result.BadRequest(new Error("Booking.MixedEvents", "All categories must belong to the requested event."));
            var claimed = await db.TicketCategories.Where(t => t.Id == category.Id && t.EventId == booking.EventId &&
                    t.Capacity - t.BookedQuantity >= input.Quantity)
                .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.BookedQuantity, t => t.BookedQuantity + input.Quantity), ct);
            if (claimed != 1)
                return Result.Conflict(new Error("Booking.InsufficientAvailability", "Not enough tickets are available."));
            booking.Items.Add(new BookingItem { TicketCategoryId = category.Id, Quantity = input.Quantity,
                UnitPrice = category.Price, CategoryName = category.Name });
        }
        return Result.Success();
    }

    private async Task<Result<BookingDto>> CancelCoreAsync(int id, CancelBookingDto dto, CancellationToken ct)
    {
        var validation = ValidateRequest(dto, "Booking.InvalidCancellation", ct);
        if (!validation.IsSuccess) return ToFailure<BookingDto>(validation);
        var eventId = await OwnedBookings().Where(b => b.Id == id).Select(b => (int?)b.EventId).FirstOrDefaultAsync(ct);
        if (!eventId.HasValue) return MissingBooking();

        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var eventEntity = await db.LockEventAsync(eventId.Value, ct);
        if (eventEntity is null) return MissingBooking();
        var booking = await LockOwnedBookingAsync(id, ct);
        if (booking is null) return MissingBooking();

        var cancellation = BuildCancellationTargets(booking, dto);
        if (!cancellation.IsSuccess) return Result<BookingDto>.BadRequest(cancellation.Errors.ToArray());
        var targets = cancellation.Value!;
        var changes = booking.Items.Where(i => targets.TryGetValue(i.Id, out var target) && target > i.CancelledQuantity)
            .OrderBy(i => i.TicketCategoryId).ToList();
        if (changes.Count == 0) return Result<BookingDto>.Success(ToDto(booking));
        var now = clock.GetUtcNow();
        if (StartUtc(eventEntity) - now < TimeSpan.FromHours(24))
            return Result<BookingDto>.Conflict(new Error("Booking.CancellationClosed", "Cancel at least 24 hours before the event starts."));
        await ReleaseItemsAsync(changes, targets, ct);
        UpdateCancellationStatus(booking, now);
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Result<BookingDto>.Success(ToDto(booking));
    }

    private Result ValidateRequest(object dto, string errorCode, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(currentUser.Id)) return Result.Forbidden(SignInRequired());
        var errors = DtoValidator.Validate(dto, errorCode, ct);
        return errors.Length > 0 ? Result.BadRequest(errors) : Result.Success();
    }

    private Task<Booking?> LockOwnedBookingAsync(int id, CancellationToken ct) =>
        db.Bookings.FromSqlInterpolated(
            $"SELECT * FROM [Bookings] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {id} AND [CustomerId] = {currentUser.Id}")
            .Include(b => b.Items).SingleOrDefaultAsync(ct);

    private static Result<Dictionary<int, int>> BuildCancellationTargets(Booking booking, CancelBookingDto dto)
    {
        var targets = dto.Items?.ToDictionary(i => i.BookingItemId, i => i.CancelledQuantity)
            ?? booking.Items.ToDictionary(i => i.Id, i => i.Quantity);
        if (targets.Keys.Any(itemId => booking.Items.All(i => i.Id != itemId)))
            return Result<Dictionary<int, int>>.BadRequest(new Error("Booking.InvalidItem", "A requested item does not belong to this booking."));
        if (booking.Items.Any(i => targets.TryGetValue(i.Id, out var target) && (target < i.CancelledQuantity || target > i.Quantity)))
            return Result<Dictionary<int, int>>.BadRequest(new Error("Booking.InvalidCancellationQuantity", "Cancellation totals must be between the already cancelled and original quantities."));
        return Result<Dictionary<int, int>>.Success(targets);
    }

    private async Task ReleaseItemsAsync(IEnumerable<BookingItem> changes, IReadOnlyDictionary<int, int> targets, CancellationToken ct)
    {
        foreach (var item in changes)
        {
            var quantity = targets[item.Id] - item.CancelledQuantity;
            var released = await db.TicketCategories.Where(t => t.Id == item.TicketCategoryId && t.BookedQuantity >= quantity)
                .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.BookedQuantity, t => t.BookedQuantity - quantity), ct);
            if (released != 1) throw new InvalidOperationException("Booking inventory is inconsistent.");
            item.CancelledQuantity = targets[item.Id];
        }
    }

    private static void UpdateCancellationStatus(Booking booking, DateTimeOffset now)
    {
        booking.Status = booking.Items.All(i => i.CancelledQuantity == i.Quantity)
            ? BookingStatus.Cancelled : BookingStatus.PartiallyCancelled;
        if (booking.Status == BookingStatus.Cancelled) booking.CancelledAtUtc = now;
    }

    private static Result<T> ToFailure<T>(Result result) => result.FailureKind switch
    {
        FailureKind.Validation => Result<T>.BadRequest(result.Errors.ToArray()),
        FailureKind.NotFound => Result<T>.NotFound(result.Errors.ToArray()),
        FailureKind.Forbidden => Result<T>.Forbidden(result.Errors.ToArray()),
        FailureKind.Conflict => Result<T>.Conflict(result.Errors.ToArray()),
        FailureKind.Failure => Result<T>.Failure(result.Errors.ToArray()),
        _ => throw new InvalidOperationException("Only failed results can be converted.")
    };

    private IQueryable<Booking> OwnedBookings() => db.Bookings.AsNoTracking()
        .Where(b => currentUser.Id != null && b.CustomerId == currentUser.Id);

    private static DateTimeOffset StartUtc(Event eventEntity) =>
        new(DateTime.SpecifyKind(eventEntity.StartDate, DateTimeKind.Utc));

    private static BookingDto ToDto(Booking booking) => MapBooking(booking);

    private static Result<BookingDto> MissingBooking() => Result<BookingDto>.NotFound(new Error("Booking.NotFound", "Booking not found."));
    private static Error SignInRequired() => new("Booking.SignInRequired", "Sign in to manage bookings.");

    private async Task<Result<BookingDto>> RunMutationAsync(Func<Task<Result<BookingDto>>> action,
        [CallerMemberName] string operation = "")
    {
        try { return (await action()).LogResult(logger, operation); }
        catch (Exception ex) when (ex is SqlException { Number: 1205 } ||
            ex is DbUpdateException { InnerException: SqlException { Number: 1205 } })
        {
            return Result<BookingDto>.Conflict(new Error("Booking.RetryRequired", "A competing update occurred. Retry the request."))
                .LogResult(logger, operation);
        }
    }
}
