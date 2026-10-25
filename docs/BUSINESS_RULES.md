# Business rules

The event CRUD service now validates required input, positive capacity, valid date
order, venue existence, and route/body ID agreement. It rejects a capacity below
existing ticket-category allocations and deletion while categories exist. Event
names may repeat. Category create/update and event capacity updates now use serializable
transactions for allocation checks and writes. Event create/update now also requires capacity no
greater than the selected venue's capacity (400, `Event.ExceedsVenueCapacity`).
Venue updates reject a capacity below any existing event there (409,
`Venue.CapacityBelowEvent`). Equality is allowed in both directions. Compare
against each event, not the sum of capacities across events, since events can
occur at different times. These are service-level checks, not database constraints
or guarantees against simultaneous event/venue changes.

The remaining detailed policies below are **proposed defaults**, not all implemented
or accepted. Review them before their milestone. Open questions must be resolved
before dependent code is written.

## Implemented ticket-category rules

- Create/update requires an existing event, nonempty name, positive category capacity,
  and a nonnegative price that fits decimal(18,2). Reject additional fractional digits
  rather than silently rounding them. Zero price is valid; currency is not yet modeled.
- Sum of category capacities cannot exceed event capacity. Exclude the current category
  on updates and check the destination event if EventId changes. Equality is valid.
- Use a serializable transaction across the allocation check and save; event capacity
  updates participate in the same isolation boundary. Aborted transactions are rolled
  back; automatic deadlock retry is not implemented.
- Category deletion is currently allowed because bookings do not exist. Add booking
  history/issued-ticket safeguards before introducing those capabilities.
- Category names may repeat. List filtering is by event, name/description, and inclusive
  price range; page rules reuse the shared query and result types.

## Events, venues, and ticket categories

- A venue has a positive capacity. An event belongs to a venue and has a positive
  attendance capacity no larger than that venue's capacity.
- Ticket categories are allocations within an event. Their combined allocations
  must not exceed event capacity. Availability cannot exceed the relevant allocation.
- A capacity reduction or venue change cannot invalidate existing committed tickets
  or active holds. Increasing capacity must still respect venue/event limits.
- Ticket quantities are positive integers. Prices are nonnegative decimal amounts
  with an explicit currency. Free tickets are allowed as a proposed default.
- Event end must follow start. Sales, if time-limited, must have valid ordered bounds
  and close no later than the event start under the proposed policy.
- Preserve booked event/category history. Restrict destructive deletion once bookings
  exist until an explicit cancellation/archival policy is agreed.

Open: field limits, draft/published/cancelled event lifecycle, overlapping venue
use, sales windows, event-start cutoff, allocation changes, and organizer cancellation.
Event classification and ticket category are different concepts.

## Inventory and overselling

For category capacity C, confirmed quantity Q, and unexpired held quantity H:

`available = C - Q - H`, with `Q + H <= C` and `available >= 0`.

Apply the equivalent invariant at event capacity. Pending holds consume inventory;
Cancelled and Expired bookings do not. A hold is only active before its expiry
instant. Define one authoritative database accounting approach before implementation:
an expired hold must be released or excluded consistently even if cleanup is delayed.

An availability read is advisory. Booking must atomically check/claim capacity and
write the booking/items in one transaction. Choose a database-enforced concurrency
strategy (for example, conditional inventory updates or a concurrency token with
bounded retry and revalidation); a read-then-write check alone is insufficient.
In-process locks do not protect multiple API instances. For bookings with multiple
items, either all claims succeed or the entire operation rolls back. Prove this
using concurrent requests against SQL Server before marking bookings complete.

## Proposed booking lifecycle

| From | To | Preconditions / inventory effect |
| --- | --- | --- |
| New | Pending | Authorized customer; atomically claim inventory; set expiry once holds exist |
| Pending | Confirmed | Hold is valid and confirmation succeeds; held quantity becomes confirmed, without claiming twice |
| Pending | Cancelled | Authorized cancellation; release the held inventory once |
| Pending | Expired | Expiry reached; release held inventory once |
| Confirmed | Cancelled | Cancellation policy allows it; release confirmed inventory once |

Cancelled and Expired are terminal. Reject other transitions. Once holds exist,
at `now >= expiresAt` confirmation must fail; confirmation racing expiration must
resolve atomically to one outcome. Repeated cancellation/expiration must not release
capacity again. A later phase may create and confirm in one operation without exposing
a temporary hold; agree the Phase 2 flow before coding. Never leave Pending inventory
indefinitely allocated without an explicit resolution policy.

Proposed booking shape: one event per booking, multiple ticket-category items,
one customer owner. Store quantity and unit-price/currency snapshots; totals follow
those snapshots, not later price changes. Do not mix currencies within one booking.

## Cancellation, access, and retry policies

- Proposed customer cancellation cutoff: before event start. The exact cutoff,
  eligibility for confirmed tickets, and refund rules remain undecided.
- Customers can access/cancel only their own bookings. Organizers manage only their
  own events and categories. Administrator overrides require an explicit policy.
- Privileged roles cannot be selected through ordinary public registration.
- Once idempotency is introduced, scope a key to the authenticated caller/operation,
  return the original outcome for an identical retry, and reject reuse with a
  different payload. Define key lifetime and failure handling when implementing it.
- Background expiration and future payment callbacks must tolerate repeated delivery
  without duplicate confirmation, inventory release, or payment effects.

## Decisions required before the relevant implementation

1. Initial key types, field constraints, date/time convention, currency and precision.
2. Event visibility/lifecycle and what happens to bookings when an organizer cancels.
3. Capacity allocation/accounting strategy, booking limits per customer/request,
   and initial booking confirmation flow.
4. Cancellation deadline, refunds, fees/taxes, and administrator powers.
5. Hold duration, expiry accounting, processing cadence, and retry/idempotency semantics.
6. Payment provider and its relationship to booking confirmation (Phase 4).

Record accepted decisions here and in architecture where appropriate; add tests
for the agreed invariants instead of silently turning assumptions into requirements.
