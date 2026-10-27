import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useForm, useWatch } from 'react-hook-form';
import type { AvailabilityDto } from '../../ticket-categories/public';
import { Button } from '../../../components/ui/Button';
import { Field } from '../../../components/ui/Field';
import { Alert, Empty, ErrorPanel } from '../../../components/ui/Feedback';
import { ApiError } from '../../../lib/api/errors';
import { vault } from '../../../lib/auth/session-vault';
import { useBeforeDeadline } from '../../../lib/use-deadline';
import { formatMoney, estimate } from '../../../utils/money';
import { cancellationDeadline, formatTime } from '../../../utils/date-time';
import { useDisplayPreferences } from '../../../stores/display-preferences';
import { buildBooking, quantity } from '../validation';
import { useCreateBooking } from '../mutations';
import type { BookingDto, CreateBooking } from '../types';
function fingerprint(availability: AvailabilityDto[], request: CreateBooking) {
  return JSON.stringify(
    request.items.map((i) => {
      const a = availability.find((a) => a.ticketCategoryId === i.ticketCategoryId);
      return [i.ticketCategoryId, i.quantity, a?.price, a?.availableQuantity];
    }),
  );
}
export function BookingForm({
  eventId,
  startDate,
  availability,
  refreshAvailability,
  authenticated,
  onSignIn,
  onCreated,
}: {
  eventId: number;
  startDate: string;
  availability: AvailabilityDto[];
  refreshAvailability: () => Promise<AvailabilityDto[]>;
  authenticated: boolean;
  onSignIn: () => void;
  onCreated: (booking: BookingDto) => void;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { isSubmitting },
  } = useForm<{ quantities: Record<string, string> }>({ defaultValues: { quantities: {} } });
  const values = useWatch({ control, name: 'quantities' });
  const mode = useDisplayPreferences((s) => s.timeDisplay);
  const open = useBeforeDeadline(startDate);
  const mutation = useCreateBooking();
  const lock = useRef(false);
  const [error, setError] = useState<unknown>();
  const [uncertain, setUncertain] = useState(false);
  const [review, setReview] = useState<
    | { request: CreateBooking; fingerprint: string; changed: boolean; generation: number }
    | undefined
  >();
  const [ack, setAck] = useState(false);
  const selected = availability.map((a) => {
    let q = 0;
    try {
      q = quantity(values[String(a.ticketCategoryId)] ?? '');
    } catch {
      /* Invalid input is reported on review. */
    }
    return { price: a.price, quantity: q };
  });
  const mayShowTerminal = !uncertain && !mutation.isPending && error == null;
  if (!open && mayShowTerminal)
    return <Empty>Booking has closed because this event has started.</Empty>;
  if (!availability.length && mayShowTerminal)
    return <Empty>Tickets are not available for this event yet.</Empty>;
  if (mayShowTerminal && availability.every((a) => a.availableQuantity === 0))
    return <Empty>This event is sold out.</Empty>;
  const changedSinceReview =
    review !== undefined && fingerprint(availability, review.request) !== review.fingerprint;
  return (
    <form
      className="form-stack"
      onChange={() => setReview(undefined)}
      onSubmit={(event) => {
        void handleSubmit(async (form) => {
          setError(undefined);
          setReview(undefined);
          if (!authenticated) {
            onSignIn();
            return;
          }
          try {
            const before = buildBooking(eventId, form.quantities, availability);
            const latest = await refreshAvailability();
            const request = buildBooking(eventId, form.quantities, latest);
            setAck(false);
            setReview({
              request,
              fingerprint: fingerprint(latest, request),
              changed: fingerprint(availability, before) !== fingerprint(latest, request),
              generation: vault.generation(),
            });
          } catch (e) {
            setError(e);
          }
        })(event);
      }}
    >
      {availability.map((a) => (
        <div className="ticket-row" key={a.ticketCategoryId}>
          <b>{a.name}</b>
          <p>
            {a.price === '0.00' ? 'Free' : formatMoney(a.price)} <small>USD each</small>
          </p>
          <p className="muted text-sm">{a.availableQuantity} available</p>
          <Field
            id={`quantity-${a.ticketCategoryId}`}
            label={`Quantity for ${a.name}`}
            type="number"
            inputMode="numeric"
            min={0}
            max={Math.min(20, a.availableQuantity)}
            step={1}
            disabled={a.availableQuantity === 0 || isSubmitting || mutation.isPending || uncertain}
            {...register(`quantities.${a.ticketCategoryId}`)}
          />
        </div>
      ))}
      <div className="booking-total">
        <span>Estimated total (USD)</span>
        <strong>{formatMoney(estimate(selected))}</strong>
      </div>
      <p className="muted text-sm">
        Up to 20 tickets per booking. Availability and final prices are confirmed by the server. No
        payment is processed here.
      </p>
      <p className="text-sm">
        Cancellation deadline: {formatTime(cancellationDeadline(startDate), mode)}. The server makes
        the final eligibility check.
      </p>
      {error != null && <ErrorPanel error={error} />}
      {uncertain ? (
        <Alert>
          <p>We could not confirm the result. Check your bookings before trying again.</p>
          <p>A missing booking does not prove the original request failed. It may still finish.</p>
          <Link className="text-link" to={`/bookings?eventId=${eventId}`}>
            Check my bookings →
          </Link>
          <Button
            variant="secondary"
            onClick={() => {
              setUncertain(false);
              setReview(undefined);
              mutation.reset();
            }}
          >
            I checked history; start a new review
          </Button>
        </Alert>
      ) : (
        <>
          {!review && (
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {isSubmitting
                ? 'Refreshing tickets…'
                : authenticated
                  ? 'Review booking'
                  : 'Sign in to book'}
            </Button>
          )}
          {review && (
            <section className="review" aria-label="Booking review">
              <h3>Review your booking</h3>
              <p>
                {review.request.items.reduce((s, i) => s + i.quantity, 0)} tickets ·{' '}
                {formatMoney(estimate(selected))} estimated
              </p>
              {review.changed && (
                <label className="check">
                  <input
                    type="checkbox"
                    checked={ack}
                    onChange={(e) => {
                      e.stopPropagation();
                      setAck(e.target.checked);
                    }}
                  />
                  I have reviewed the updated price or availability.
                </label>
              )}
              {review.generation !== vault.generation() && (
                <Alert>
                  Your session changed. Edit the selection to review this booking again.
                </Alert>
              )}
              {changedSinceReview && (
                <Alert>
                  Availability changed again. Review your booking again before confirming.
                </Alert>
              )}
              <div className="actions">
                <Button
                  disabled={
                    mutation.isPending ||
                    changedSinceReview ||
                    review.generation !== vault.generation() ||
                    (review.changed && !ack)
                  }
                  onClick={async () => {
                    if (lock.current || review.generation !== vault.generation()) return;
                    lock.current = true;
                    setError(undefined);
                    try {
                      const result = await mutation.mutateAsync(review.request);
                      if (result.generation === vault.generation()) onCreated(result.booking);
                    } catch (e) {
                      setError(e);
                      if (
                        !(e instanceof ApiError) ||
                        e.kind === 'transport' ||
                        e.kind === 'contract' ||
                        (e.status ?? 0) >= 500
                      )
                        setUncertain(true);
                      setReview(undefined);
                      if (e instanceof ApiError && e.status === 401) onSignIn();
                    } finally {
                      lock.current = false;
                    }
                  }}
                >
                  {mutation.isPending ? 'Confirming…' : 'Confirm booking'}
                </Button>
                <Button
                  variant="secondary"
                  disabled={mutation.isPending}
                  onClick={() => setReview(undefined)}
                >
                  Edit selection
                </Button>
              </div>
            </section>
          )}
        </>
      )}
    </form>
  );
}
