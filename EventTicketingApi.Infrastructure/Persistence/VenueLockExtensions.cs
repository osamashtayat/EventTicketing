using EventTicketingApi.Domain;
using Microsoft.EntityFrameworkCore;

namespace EventTicketingApi.Infrastructure.Persistence;

internal static class VenueLockExtensions
{
    // Schedule writes lock venues in ID order before locking an existing event.
    public static Task<Venue?> LockVenueAsync(this AppDbContext db, int venueId,
        CancellationToken cancellationToken, bool track = false)
    {
        if (db.Database.CurrentTransaction is null)
            throw new InvalidOperationException("Venue write locks require an active transaction.");
        var query = db.Venues.FromSqlInterpolated(
            $"SELECT * FROM [Venues] WITH (UPDLOCK, HOLDLOCK) WHERE [Id] = {venueId}");
        return (track ? query.AsTracking() : query.AsNoTracking()).SingleOrDefaultAsync(cancellationToken);
    }
}
