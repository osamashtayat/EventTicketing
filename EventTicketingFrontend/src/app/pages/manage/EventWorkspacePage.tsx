import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useSession } from '../../../features/auth/public';
import { useEvent, EventForm, useDeleteEvent } from '../../../features/events/public';
import { VenueSelect } from '../../../features/venues/public';
import { CategoryManager } from '../../../features/ticket-categories/public';
import { useEventBookings, BookingSummary } from '../../../features/bookings/public';
import { positiveId } from '../../../lib/api/query-params';
import { vault } from '../../../lib/auth/session-vault';
import { DeleteDialog } from '../../../components/ui/DeleteDialog';
import { Pagination } from '../../../components/ui/Pagination';
import { Empty, Loading, ErrorPanel, QueryFeedback } from '../../../components/ui/Feedback';
import { RouteError } from '../RouteError';
function Workspace({ id }: { id: number }) {
  const { generation } = useSession();
  const [params, setParams] = useSearchParams();
  const status = params.get('status');
  const history = useEventBookings(generation, id, {
    pageNumber: positiveId(params.get('historyPage')) ?? 1,
    pageSize: 10,
    status: status === '0' || status === '1' || status === '2' ? Number(status) : undefined,
  });
  const event = useEvent(id);
  const remove = useDeleteEvent();
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  if (history.isError)
    return (
      <div className="container">
        <h1 tabIndex={-1}>Event workspace unavailable</h1>
        <ErrorPanel
          error={history.error}
          retry={() => {
            void history.refetch();
          }}
        />
      </div>
    );
  if (!history.data)
    return (
      <div className="container">
        <Loading label="Checking event access…" />
      </div>
    );
  if (!event.data)
    return (
      <div className="container">
        {event.isError ? (
          <ErrorPanel
            error={event.error}
            retry={() => {
              void event.refetch();
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
        <Link to="/manage/events">Manage events</Link> / #{id}
      </p>
      <h1 tabIndex={-1}>{event.data.name}</h1>
      <Link className="text-link" to={`/events/${id}`}>
        View public event →
      </Link>
      {saved && <p role="status">Event saved.</p>}
      <QueryFeedback query={event} />
      <section className="panel">
        <h2>Edit event</h2>
        <EventForm
          key={id}
          existing={event.data}
          venueChoice={(value, onChange) => (
            <VenueSelect value={value} onChange={onChange} id="workspace-venue" />
          )}
          onSaved={() => setSaved(true)}
        />
      </section>
      <CategoryManager
        eventId={id}
        page={positiveId(params.get('categoryPage')) ?? 1}
        onPage={(page) => {
          const next = new URLSearchParams(params);
          next.set('categoryPage', String(page));
          setParams(next);
        }}
      />
      <section>
        <div className="section-heading">
          <div>
            <p className="eyebrow">READ-ONLY SERVER RECORDS</p>
            <h2>Event booking history</h2>
          </div>
        </div>
        <p className="muted">
          History does not expose customer identities or permission to cancel another customer’s
          booking.
        </p>
        <div className="field narrow">
          <label htmlFor="history-status">History status</label>
          <select
            id="history-status"
            value={status ?? ''}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.delete('historyPage');
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
        <QueryFeedback query={history} />
        {history.data.items.map((booking) => (
          <BookingSummary key={booking.id} booking={booking} />
        ))}
        {history.data.items.length === 0 && <Empty>No bookings on this history page.</Empty>}
        <Pagination
          page={history.data}
          onPage={(page) => {
            const next = new URLSearchParams(params);
            next.set('historyPage', String(page));
            setParams(next);
          }}
        />
      </section>
      <section className="panel">
        <h2>Delete event</h2>
        <p>
          Deletion is permanent. The server rejects events with categories or any booking history.
        </p>
        <DeleteDialog
          name={event.data.name}
          description="Delete this public event? Category and booking-history guards are checked by the server."
          onDelete={async () => {
            const submittedGeneration = vault.generation();
            await remove.mutateAsync(id);
            if (submittedGeneration === vault.generation()) navigate('/manage/events');
          }}
        />
      </section>
    </div>
  );
}
export default function EventWorkspacePage() {
  const id = positiveId(useParams().eventId);
  return id ? <Workspace key={id} id={id} /> : <RouteError />;
}
