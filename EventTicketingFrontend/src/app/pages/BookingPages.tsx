import { Link, useParams, useSearchParams } from 'react-router';
import { useSession } from '../../features/auth/public';
import {
  useMyBookings,
  useBooking,
  BookingSummary,
  CancelBookingForm,
  statusLabels,
} from '../../features/bookings/public';
import { useEvent } from '../../features/events/public';
import { positiveId, paging } from '../../lib/api/query-params';
import { Empty, Loading, ErrorPanel, QueryFeedback } from '../../components/ui/Feedback';
import { Pagination } from '../../components/ui/Pagination';
import { formatMoney } from '../../utils/money';
import { formatTime } from '../../utils/date-time';
import { useDisplayPreferences } from '../../stores/display-preferences';
import { RouteError } from './RouteError';
function EventName({ id }: { id: number }) {
  const event = useEvent(id);
  return (
    <Link className="text-link" to={`/events/${id}`}>
      {event.data?.name ?? (event.isError ? 'Event details unavailable' : 'View event')} →
    </Link>
  );
}
export function MyBookingsPage() {
  const { generation } = useSession();
  const [params, setParams] = useSearchParams();
  const status = params.get('status');
  const filter = {
    ...paging(params),
    eventId: positiveId(params.get('eventId')),
    status: status === '0' || status === '1' || status === '2' ? Number(status) : undefined,
  };
  const q = useMyBookings(generation, filter);
  const mode = useDisplayPreferences((s) => s.timeDisplay);
  return (
    <div className="container">
      <p className="eyebrow">THE MOMENTS YOU’VE SAID YES TO</p>
      <h1 tabIndex={-1}>My bookings</h1>
      <p>Confirmed bookings and cancellation history, all in one place.</p>
      <div className="field narrow">
        <label htmlFor="booking-status">Status</label>
        <select
          id="booking-status"
          value={status ?? ''}
          onChange={(e) => {
            const next = new URLSearchParams(params);
            next.delete('pageNumber');
            if (e.target.value) next.set('status', e.target.value);
            else next.delete('status');
            setParams(next);
          }}
        >
          <option value="">All statuses</option>
          <option value="0">Confirmed</option>
          <option value="1">Partially cancelled</option>
          <option value="2">Cancelled</option>
        </select>
      </div>
      {filter.eventId && (
        <p>
          History filtered to this event.{' '}
          <Link className="text-link" to="/bookings">
            Show all bookings
          </Link>
        </p>
      )}
      {q.data ? (
        <>
          <QueryFeedback query={q} />
          {q.data.items.length === 0 && (
            <Empty>
              {q.data.totalCount
                ? 'This page is beyond your bookings.'
                : 'No matching bookings yet.'}
            </Empty>
          )}
          <div className="booking-list">
            {q.data.items.map((b) => (
              <article className="panel" key={b.id}>
                <div className="actions">
                  <h2>
                    <Link to={`/bookings/${b.id}`}>Booking #{b.id}</Link>
                  </h2>
                  <span className={`badge status-${b.status}`}>{statusLabels[b.status]}</span>
                </div>
                <EventName id={b.eventId} />
                <p className="muted">{formatTime(b.createdAtUtc, mode)}</p>
                <p>
                  Remaining {formatMoney(b.remainingAmount)} USD · Original{' '}
                  {formatMoney(b.totalAmount)} USD
                </p>
                <Link className="text-link" to={`/bookings/${b.id}`}>
                  View booking →
                </Link>
              </article>
            ))}
          </div>
          <Pagination
            page={q.data}
            onPage={(page) => {
              const next = new URLSearchParams(params);
              next.set('pageNumber', String(page));
              setParams(next);
            }}
          />
        </>
      ) : q.isError ? (
        <ErrorPanel
          error={q.error}
          retry={() => {
            void q.refetch();
          }}
        />
      ) : (
        <Loading label="Loading your bookings…" />
      )}
    </div>
  );
}
function BookingDetails({ id }: { id: number }) {
  const { generation } = useSession();
  const q = useBooking(generation, id);
  const event = useEvent(q.data?.eventId ?? 0);
  if (!q.data)
    return (
      <div className="container">
        {q.isError ? (
          <ErrorPanel
            error={q.error}
            retry={() => {
              void q.refetch();
            }}
          />
        ) : (
          <Loading />
        )}
      </div>
    );
  return (
    <div className="container">
      <p className="breadcrumb">
        <Link to="/bookings">My bookings</Link> / #{id}
      </p>
      <p className="eyebrow">YOUR BOOKING</p>
      <h1 tabIndex={-1}>
        {q.data.status === 0 ? 'Booking confirmed' : statusLabels[q.data.status]}
      </h1>
      <EventName id={q.data.eventId} />
      <QueryFeedback query={q} />
      <BookingSummary booking={q.data} />
      {event.isError && (
        <ErrorPanel
          error={event.error}
          retry={() => {
            void event.refetch();
          }}
        />
      )}
      {event.isPending && <Loading label="Checking the event schedule…" />}
      <CancelBookingForm
        booking={q.data}
        startDate={event.data?.startDate}
        onComplete={() => document.querySelector<HTMLElement>('h1')?.focus()}
      />
    </div>
  );
}
export function BookingDetailsPage() {
  const id = positiveId(useParams().bookingId);
  return id ? <BookingDetails key={id} id={id} /> : <RouteError />;
}
