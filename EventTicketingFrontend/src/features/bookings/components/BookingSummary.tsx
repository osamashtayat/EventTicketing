import { Link } from 'react-router';
import { formatMoney } from '../../../utils/money';
import { formatTime } from '../../../utils/date-time';
import { useDisplayPreferences } from '../../../stores/display-preferences';
import { statusLabels } from '../types';
import type { BookingDto } from '../types';
export function BookingSummary({ booking }: { booking: BookingDto }) {
  const mode = useDisplayPreferences((s) => s.timeDisplay);
  return (
    <section className="panel">
      <div className="section-heading compact">
        <h2>Booking #{booking.id}</h2>
        <span className={`badge status-${booking.status}`}>{statusLabels[booking.status]}</span>
      </div>
      <p className="muted">Created {formatTime(booking.createdAtUtc, mode)}</p>
      <Link className="text-link" to={`/events/${booking.eventId}`}>
        View event →
      </Link>
      <div
        className="table-scroll"
        role="region"
        aria-label={`Tickets for booking ${booking.id}`}
        tabIndex={0}
      >
        <table>
          <caption>Historical ticket quantities and prices (USD)</caption>
          <thead>
            <tr>
              <th scope="col">Category</th>
              <th scope="col">Unit price</th>
              <th scope="col">Original</th>
              <th scope="col">Cancelled</th>
              <th scope="col">Remaining</th>
              <th scope="col">Remaining amount</th>
            </tr>
          </thead>
          <tbody>
            {booking.items.map((i) => (
              <tr key={i.id}>
                <th scope="row">{i.categoryName}</th>
                <td>{formatMoney(i.unitPrice)}</td>
                <td>{i.quantity}</td>
                <td>{i.cancelledQuantity}</td>
                <td>{i.remainingQuantity}</td>
                <td>{formatMoney(i.remainingAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="metadata">
        <dt>Original amount</dt>
        <dd>{formatMoney(booking.totalAmount)} USD</dd>
        <dt>Cancelled amount</dt>
        <dd>{formatMoney(booking.cancelledAmount)} USD</dd>
        <dt>Remaining amount</dt>
        <dd>{formatMoney(booking.remainingAmount)} USD</dd>
        {booking.cancelledAtUtc && (
          <>
            <dt>Fully cancelled at</dt>
            <dd>{formatTime(booking.cancelledAtUtc, mode)}</dd>
          </>
        )}
      </dl>
      <p className="muted text-sm">
        These are the server’s booking snapshots. No payment is processed here.
      </p>
    </section>
  );
}
