import { Link } from 'react-router';
import type { EventDto } from '../types';
import { dateMotif, formatTime } from '../../../utils/date-time';
import { useDisplayPreferences } from '../../../stores/display-preferences';
export function EventCard({ event, venue }: { event: EventDto; venue: string }) {
  const mode = useDisplayPreferences((s) => s.timeDisplay);
  return (
    <article className={`event-card art-${event.id % 3}`}>
      <div className="event-art" aria-hidden="true">
        <span className="art-orbit" />
        <span className="date-motif">{dateMotif(event.startDate, mode)}</span>
        <span className="art-caption">Be there.</span>
      </div>
      <div className="card-content">
        <p className="eyebrow">{venue}</p>
        <h3>
          <Link to={`/events/${event.id}`}>{event.name}</Link>
        </h3>
        <p className="muted text-sm">{formatTime(event.startDate, mode)}</p>
        {event.description && <p className="excerpt">{event.description}</p>}
        <Link className="text-link" to={`/events/${event.id}`}>
          Explore event <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}
