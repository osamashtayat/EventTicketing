import { Link, useNavigate, useSearchParams } from 'react-router';
import { useMe } from '../../../features/auth/public';
import { useEvents, eventFilters } from '../../../features/events/public';
import { Button } from '../../../components/ui/Button';
import { Field } from '../../../components/ui/Field';
import { Empty, Loading, ErrorPanel, QueryFeedback } from '../../../components/ui/Feedback';
import { Pagination } from '../../../components/ui/Pagination';
import { positiveId } from '../../../lib/api/query-params';
import { formatTime } from '../../../utils/date-time';
import { useDisplayPreferences } from '../../../stores/display-preferences';
function EventCatalogue() {
  const [params, setParams] = useSearchParams();
  const q = useEvents(eventFilters(params));
  const mode = useDisplayPreferences((s) => s.timeDisplay);
  return (
    <>
      <form
        className="search-line panel"
        onSubmit={(e) => {
          e.preventDefault();
          setParams({ search: String(new FormData(e.currentTarget).get('search') ?? '') });
        }}
      >
        <Field
          key={params.toString()}
          id="manage-events-search"
          name="search"
          label="Search public events"
          maxLength={200}
          defaultValue={params.get('search') ?? ''}
        />
        <Button type="submit">Search</Button>
      </form>
      {q.data ? (
        <>
          <QueryFeedback query={q} />
          {q.data.items.map((event) => (
            <article className="panel management-row" key={event.id}>
              <div>
                <h2>{event.name}</h2>
                <p className="muted">{formatTime(event.startDate, mode)}</p>
              </div>
              <Link className="button secondary" to={`/manage/events/${event.id}`}>
                Open workspace →
              </Link>
            </article>
          ))}
          {!q.data.items.length && <Empty>No events on this page.</Empty>}
          <Pagination
            page={q.data}
            onPage={(p) => {
              const next = new URLSearchParams(params);
              next.set('pageNumber', String(p));
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
        <Loading />
      )}
    </>
  );
}
export default function ManageEventsPage() {
  const me = useMe();
  const navigate = useNavigate();
  return (
    <div className="container">
      <p className="eyebrow">EVENT WORKSPACE</p>
      <h1 tabIndex={-1}>Make something happen.</h1>
      <Link className="button primary" to="/manage/events/new">
        Create an event ↗
      </Link>
      <form
        className="search-line panel"
        onSubmit={(e) => {
          e.preventDefault();
          const input = e.currentTarget.querySelector('input');
          if (!input) return;
          const id = positiveId(input.value);
          if (id) navigate(`/manage/events/${id}`);
          else {
            input.setCustomValidity('Enter a positive event ID.');
            input.reportValidity();
          }
        }}
      >
        <Field
          id="open-event-id"
          type="number"
          min={1}
          max={2147483647}
          step={1}
          label="Open a known event ID"
          required
          onInput={(e) => e.currentTarget.setCustomValidity('')}
        />
        <Button type="submit">Open workspace</Button>
      </form>
      {me.data?.roles.includes('Admin') ? (
        <>
          <h2>Public event catalogue</h2>
          <EventCatalogue />
        </>
      ) : (
        <p className="muted">
          Create an event or open its known ID. The server checks your access; the API does not
          provide a list of your owned events.
        </p>
      )}
    </div>
  );
}
