import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router';
import { useEvent } from '../../features/events/public';
import { useVenue } from '../../features/venues/public';
import { useEventAvailability } from '../../features/ticket-categories/public';
import { positiveId } from '../../lib/api/query-params';
import { useDisplayPreferences } from '../../stores/display-preferences';
import { formatTime } from '../../utils/date-time';
import { BookingForm } from '../../features/bookings/public';
import { SignInForm, useSession } from '../../features/auth/public';
import { Dialog } from '../../components/ui/Dialog';
import { signIn } from '../session';
import { Loading, ErrorPanel, QueryFeedback } from '../../components/ui/Feedback';
import { RouteError } from './RouteError';
function EventDetails({ id }: { id: number }) {
  const [signInOpen, setSignInOpen] = useState(false);
  const session = useSession();
  const navigate = useNavigate();
  const event = useEvent(id);
  const venue = useVenue(event.data?.venueId ?? 0);
  const availability = useEventAvailability(id);
  const mode = useDisplayPreferences((s) => s.timeDisplay);
  if (!event.data)
    return event.isError ? (
      <div className="container">
        <ErrorPanel
          error={event.error}
          retry={() => {
            void event.refetch();
          }}
        />
      </div>
    ) : (
      <div className="container">
        <Loading />
      </div>
    );
  return (
    <div className="container">
      <p className="breadcrumb">
        <Link to="/events">Events</Link> / {event.data.name}
      </p>
      <QueryFeedback query={event} />
      <div className="detail-grid">
        <section>
          <p className="eyebrow">MAKE IT A DATE</p>
          <h1 tabIndex={-1}>{event.data.name}</h1>
          <div className="event-schedule">
            <p>
              <b>Starts</b>
              <br />
              {formatTime(event.data.startDate, mode)}
            </p>
            <p>
              <b>Ends</b>
              <br />
              {formatTime(event.data.endDate, mode)}
            </p>
          </div>
          <div className={`detail-art event-art art-${id % 3}`} aria-hidden="true">
            <span className="art-orbit" />
            <span className="art-caption">A moment worth being there for.</span>
          </div>
          <section className="panel">
            <h2>The experience</h2>
            <p className="description">
              {event.data.description?.trim() || 'The organizer has not added a description yet.'}
            </p>
          </section>
          <section className="panel">
            <h2>The place</h2>
            {venue.data ? (
              <>
                <h3>
                  <Link to={`/venues/${venue.data.id}`}>{venue.data.name}</Link>
                </h3>
                <p>{venue.data.city}</p>
                <p className="muted">
                  {venue.data.address?.trim() || 'Street address is not provided.'}
                </p>
                <QueryFeedback query={venue} />
              </>
            ) : venue.isError ? (
              <ErrorPanel
                error={venue.error}
                retry={() => {
                  void venue.refetch();
                }}
              />
            ) : (
              <Loading label="Loading venue…" />
            )}
          </section>
        </section>
        <aside className="panel booking-panel" aria-label="Ticket availability">
          <p className="eyebrow">YOUR PLACE IN THE MOMENT</p>
          <h2>Choose tickets</h2>
          {availability.data ? (
            <>
              <QueryFeedback query={availability} />
              <BookingForm
                eventId={id}
                startDate={event.data.startDate}
                availability={availability.data}
                authenticated={session.active}
                onSignIn={() => setSignInOpen(true)}
                refreshAvailability={async () => {
                  const result = await availability.refetch();
                  if (result.error) throw result.error;
                  if (!result.data) throw new Error('Availability is not ready.');
                  return result.data;
                }}
                onCreated={(booking) => navigate(`/bookings/${booking.id}`)}
              />
            </>
          ) : availability.isError ? (
            <ErrorPanel
              error={availability.error}
              retry={() => {
                void availability.refetch();
              }}
            />
          ) : (
            <Loading label="Checking tickets…" />
          )}
          <p className="muted text-sm">No payment is processed here.</p>
        </aside>
      </div>
      <Dialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        title="Sign in to book"
        description="Your ticket selection stays here while you sign in."
      >
        <SignInForm onSignIn={signIn} onSuccess={() => setSignInOpen(false)} />
      </Dialog>
    </div>
  );
}
export function EventDetailsPage() {
  const id = positiveId(useParams().eventId);
  return id ? <EventDetails key={id} id={id} /> : <RouteError />;
}
