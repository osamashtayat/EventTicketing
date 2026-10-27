namespace EventTicketingApi.Domain;

public readonly record struct EventCapacityPeriod(DateTime Start, DateTime End, int Capacity);

public static class EventCapacitySchedule
{
    // Intervals are [Start, End): an event ending at 12:00 releases capacity at 12:00.
    public static long GetPeakCapacity(IEnumerable<EventCapacityPeriod> events)
    {
        ArgumentNullException.ThrowIfNull(events);
        var changes = events.SelectMany(e => new[]
        {
            (Time: e.Start, Delta: (long)e.Capacity),
            (Time: e.End, Delta: -(long)e.Capacity)
        });
        long active = 0, peak = 0;
        foreach (var moment in changes.GroupBy(c => c.Time).OrderBy(g => g.Key))
        {
            active += moment.Sum(c => c.Delta);
            peak = Math.Max(peak, active);
        }
        return peak;
    }
}
