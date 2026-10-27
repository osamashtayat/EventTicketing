import { useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '../../../components/ui/Button';
import { Field } from '../../../components/ui/Field';
import { Dialog } from '../../../components/ui/Dialog';
import { Alert, ErrorPanel } from '../../../components/ui/Feedback';
import { useBeforeDeadline } from '../../../lib/use-deadline';
import { vault } from '../../../lib/auth/session-vault';
import { cancellationDeadline, formatTime } from '../../../utils/date-time';
import { useDisplayPreferences } from '../../../stores/display-preferences';
import { useCancelBooking } from '../mutations';
import { buildCancellation, quantity } from '../validation';
import type { BookingDto, CancelBooking } from '../types';
export function CancelBookingForm({
  booking,
  startDate,
  onComplete,
}: {
  booking: BookingDto;
  startDate: string | undefined;
  onComplete: () => void;
}) {
  const { register, control, handleSubmit, reset } = useForm<{
    additional: Record<string, string>;
  }>({ defaultValues: { additional: {} } });
  const additional = useWatch({ control, name: 'additional' });
  const mode = useDisplayPreferences((s) => s.timeDisplay);
  const deadline = startDate ? cancellationDeadline(startDate) : undefined;
  const before = useBeforeDeadline(deadline ?? '9999-12-31T00:00:00Z', true);
  const mutation = useCancelBooking();
  const [full, setFull] = useState(false);
  const [review, setReview] = useState<CancelBooking | undefined>();
  const [error, setError] = useState<unknown>();
  const lock = useRef(false);
  async function submit(body: CancelBooking) {
    if (lock.current) return;
    lock.current = true;
    setError(undefined);
    try {
      const result = await mutation.mutateAsync({ id: booking.id, body });
      if (result.generation === vault.generation()) {
        setFull(false);
        setReview(undefined);
        reset();
        onComplete();
      }
    } catch (e) {
      setError(e);
      setReview(undefined);
    } finally {
      lock.current = false;
    }
  }
  if (booking.status === 2)
    return <p role="status">All tickets in this booking have been cancelled.</p>;
  return (
    <section className="panel">
      <h2>Change of plans?</h2>
      {deadline ? (
        <p>
          Cancellation deadline: <strong>{formatTime(deadline, mode)}</strong>. Eligibility follows
          the server clock; exactly 24 hours before the event is allowed.
        </p>
      ) : (
        <Alert>
          The event schedule is unavailable. Retry the schedule before checking cancellation
          eligibility.
        </Alert>
      )}
      {deadline && !before && (
        <Alert>The cancellation deadline has passed. No new cancellations are available.</Alert>
      )}
      {deadline && before && (
        <>
          <p>Cancel some tickets, or all remaining tickets. Your booking stays in your history.</p>
          <form
            className="form-stack"
            onChange={() => setReview(undefined)}
            onSubmit={(event) => {
              void handleSubmit((values) => {
                setError(undefined);
                try {
                  setReview(buildCancellation(booking, values.additional));
                } catch (e) {
                  setError(e);
                }
              })(event);
            }}
          >
            {booking.items
              .filter((i) => i.remainingQuantity > 0)
              .map((item) => {
                let count = 0;
                try {
                  count = quantity(additional[String(item.id)] ?? '');
                } catch {
                  /* Validation runs at review. */
                }
                return (
                  <Field
                    key={item.id}
                    id={`cancel-${item.id}`}
                    label={`Additional tickets to cancel: ${item.categoryName}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={item.remainingQuantity}
                    step={1}
                    disabled={mutation.isPending}
                    hint={`${item.cancelledQuantity} already cancelled. ${Math.max(0, item.remainingQuantity - count)} would remain.`}
                    {...register(`additional.${item.id}`)}
                  />
                );
              })}
            <div className="actions">
              <Button type="submit" variant="secondary" disabled={mutation.isPending}>
                Review partial cancellation
              </Button>
              <Button
                variant="danger"
                disabled={mutation.isPending}
                onClick={() => {
                  setError(undefined);
                  setFull(true);
                }}
              >
                Cancel all remaining tickets
              </Button>
            </div>
          </form>
          {review && (
            <div className="review">
              <h3>Review cancellation</h3>
              {review.items?.map((target) => {
                const item = booking.items.find((i) => i.id === target.bookingItemId);
                return item ? (
                  <p key={item.id}>
                    {item.categoryName}: {target.cancelledQuantity} cancelled in total,{' '}
                    {item.quantity - target.cancelledQuantity} remaining.
                  </p>
                ) : null;
              })}
              <Button
                variant="danger"
                disabled={mutation.isPending}
                onClick={() => {
                  void submit(review);
                }}
              >
                {mutation.isPending ? 'Cancelling…' : 'Confirm partial cancellation'}
              </Button>
            </div>
          )}
        </>
      )}
      {error != null && !full && <ErrorPanel error={error} />}
      <p className="muted text-sm">
        Cancellation releases ticket availability. No payment or refund is processed here.
      </p>
      <Dialog
        open={full}
        onOpenChange={setFull}
        title={`Cancel booking #${booking.id}?`}
        description={`This cancels all ${booking.items.reduce((n, i) => n + i.remainingQuantity, 0)} remaining tickets for booking #${booking.id}. Your booking stays in history.`}
        busy={mutation.isPending}
      >
        {error != null && <ErrorPanel error={error} />}
        <Button
          variant="danger"
          disabled={mutation.isPending || !before || !deadline}
          onClick={() => {
            void submit({});
          }}
        >
          {mutation.isPending ? 'Cancelling…' : 'Confirm full cancellation'}
        </Button>
      </Dialog>
    </section>
  );
}
