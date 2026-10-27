using EventTicketingApi.Domain;
using Microsoft.EntityFrameworkCore;

namespace EventTicketingApi.Infrastructure.Persistence;

internal static class EventLockExtensions
{
    // Event locks always precede booking/category locks, including management writes.
    public static Task<Event?> LockEventAsync(this AppDbContext db, int eventId,
        CancellationToken cancellationToken, bool track = false)
    {
        if (db.Database.CurrentTransaction is null)
            throw new InvalidOperationException("Event write locks require an active transaction.");
        var query = db.Events.FromSqlInterpolated(
            $"SELECT * FROM [Events] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {eventId}");
        return (track ? query.AsTracking() : query.AsNoTracking()).SingleOrDefaultAsync(cancellationToken);
    }
}
