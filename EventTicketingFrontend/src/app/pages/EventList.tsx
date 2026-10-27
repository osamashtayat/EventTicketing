import { useQueries } from '@tanstack/react-query';
import { useEvents, EventCard } from '../../features/events/public';
import { venueOptions } from '../../features/venues/public';
import type { Params } from '../../lib/api/types';
import { Empty, ErrorPanel, Loading, QueryFeedback } from '../../components/ui/Feedback';
import { Pagination } from '../../components/ui/Pagination';
export function EventList({
  filters,
  onPage,
}: {
  filters: Params;
  onPage: (page: number) => void;
}) {
  const q = useEvents(filters);
  const venueIds = [...new Set(q.data?.items.map((e) => e.venueId) ?? [])];
  const venues = useQueries({ queries: venueIds.map(venueOptions) });
  if (!q.data)
    return q.isError ? (
      <ErrorPanel
        error={q.error}
        retry={() => {
          void q.refetch();
        }}
      />
    ) : (
      <Loading label="Finding events…" />
    );
  return (
    <section aria-label="Event results" aria-busy={q.isFetching}>
      <QueryFeedback query={q} />
      {q.data.items.length === 0 ? (
        <Empty>
          <h2>
            {q.data.totalCount > 0 ? 'This page is beyond the results.' : 'Nothing here just yet.'}
          </h2>
          <p>
            {q.data.totalCount > 0
              ? 'Return to the first page to see matching events.'
              : 'Try a different search or check back for new events.'}
          </p>
        </Empty>
      ) : (
        <div className="event-grid">
          {q.data.items.map((event) => {
            const venue = venues[venueIds.indexOf(event.venueId)];
            return (
              <EventCard
                key={event.id}
                event={event}
                venue={
                  venue?.data
                    ? `${venue.data.name} · ${venue.data.city}`
                    : venue?.isError
                      ? 'Venue details unavailable'
                      : 'Loading venue…'
                }
              />
            );
          })}
        </div>
      )}
      <Pagination page={q.data} onPage={onPage} />
    </section>
  );
}
