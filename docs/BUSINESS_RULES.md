# Business rules

This document describes implemented behavior. Future functionality is tracked in
[ROADMAP.md](ROADMAP.md); detailed request/response contracts are in [FRONTEND_API.md](FRONTEND_API.md).

## Accounts and access

- Public registration creates a User. Only Admin can create Admin/EventOrganizer accounts.
- Identity owns password hashing and role membership. Access/refresh tokens are opaque.
- Country, venue, event, and category browsing is public. Country/venue writes require Admin.
- Event creation requires Admin/EventOrganizer and assigns OrganizerId from authentication.
- Event/category management requires Admin or that event's owning EventOrganizer.
- Category moves require access to both source and destination events.
- GET /api/events/mine lists only the signed-in Admin/EventOrganizer's events, with
  standard filters/paging; Admin uses the public list to see all events.
- Customer booking reads and cancellation are owner-only, including for Admin.
  An unowned booking ID returns 404. Separate event history is read-only for Admin
  or the owning organizer and does not disclose customer names/emails.
- Venue read DTOs include capacity. Event read DTOs include organizerId; neither
  ownership nor booking customer identity can be selected through write DTOs.

## Event dates and venue scheduling

- An event belongs to a venue and has positive capacity. End must follow start.
- Event JSON writes accept MM/dd/yyyy or ISO 8601. Calendar-only starts use midnight
  UTC; calendar-only end days are inclusive and become the following midnight.
  Identical calendar dates create a one-day event. Exact timestamps retain their
  times; offsets normalize to UTC. Internal/response end instants are exclusive.
- At every instant, simultaneous event capacities must sum to no more than venue
  capacity. Periods are [start, end); one event ending exactly when another starts
  does not overlap. Updates exclude the current event from existing allocations.
- The validator checks the peak over time, not only pairs or every event that
  intersects a long candidate. With venue capacity 10, simultaneous 5 + 6 conflicts,
  while 5 + 5 fits. Non-simultaneous allocations are not added together.
- A single event above venue capacity returns 400 Event.ExceedsVenueCapacity.
  Combined overlap overflow returns 409 Event.VenueCapacityConflict.
- Venue reductions cannot fall below an individual event or the combined schedule
  peak (409 Venue.CapacityBelowEvent / Venue.CapacityBelowOverlappingEvents).
- Create/reschedule/move and venue edits hold venue locks through validation/commit.
  Event moves lock both venues in ID order before the event lock. External SQL
  writers must not bypass the application scheduling protocol.
- Existing conflicting schedules are not automatically rewritten.

## Category allocations

- Categories belong to one event and require a nonempty name, positive capacity,
  and a USD price from 0 through 9999999999999999.99 with at most two fractional digits.
  Free tickets are valid. Event/category names may repeat.
- Combined category capacity cannot exceed event capacity. Updates exclude their
  existing allocation and validate the destination when moving.
- Capacity cannot fall below BookedQuantity. A database constraint enforces
  0 <= BookedQuantity <= Capacity.
- Category allocation writes and event-capacity changes use transactions and the
  shared event-lock protocol. There is no automatic retry of arbitrary failures.

## Booking creation

- One booking covers one event and distinct category items, with at most 20 tickets
  total. Quantities and IDs are positive; every category must belong to that event.
- The authenticated account becomes CustomerId. All authenticated roles can book
  for themselves. Prices, totals, currency, status, and ownership are server-controlled.
- Creation immediately confirms an accepted reservation, not a paid purchase.
  Booking closes at now >= event start. Availability reads are advisory.
- Each inventory claim is conditional on available capacity. Every claim, booking,
  and item commits in one transaction or all roll back. SQL Server locks coordinate
  requests across API instances; process-local locks are not the protection boundary.
- Item unit price/category name are snapshots. Later changes do not rewrite history.
  USD unit prices use decimal(18,2), total amounts decimal(20,2).
- Status values: Confirmed=0, PartiallyCancelled=1, Cancelled=2. No Pending/Expired/Paid
  state is implemented.
- Recognized booking deadlocks return retryable 409 Booking.RetryRequired. Creation
  has no idempotency key; an uncertain timeout is not proof that the operation failed.

## Cancellation and released inventory

- A customer can cancel all remaining tickets or target any of their own booking items.
- Partial targets are cumulative CancelledQuantity values, not increments. Targets
  cannot decrease or exceed original quantities; foreign/duplicate items are invalid.
- Omitted/null Items cancels everything remaining. An empty Items array is invalid.
- New cancellation requires at least 24 hours before event start; equality is allowed.
  A no-change replay returns current state without releasing inventory again, even
  after cutoff. There is no separate cancellation-count limit across owned bookings.
- Only newly cancelled quantities decrease BookedQuantity. Those tickets become
  available for another customer after commit. Counters, item state, and booking
  status change atomically.
- Original quantities/total remain as history. Remaining/cancelled amounts are
  reported separately. CancelledAtUtc is populated only when fully cancelled.
- Cancellation records do not represent refunds; no payment integration exists.

## History and deletion

- Countries with venues and venues with events cannot be deleted.
- Events with categories or booking history cannot be deleted. Any booking history
  blocks date/venue changes until rescheduling policy is implemented.
- Categories with any booking history cannot be deleted or moved between events,
  even when all bookings were cancelled. Valid price/name edits affect future sales.
- User/event/category booking references restrict deletion rather than cascading
  historical records. Ownership transfer and account anonymization are not implemented.

## Discovery and errors

- PageNumber defaults to 1, PageSize to 10; maximum size is 100. Invalid values are
  rejected, not clamped. Filters combine with AND and ordering is deterministic.
- Unmatched list filters return an empty page. Missing resources return 404 where
  access policy permits disclosure. Forbidden management operations return 403.
- Expected service outcomes use Result/ProblemDetails; unexpected exceptions are
  logged with trace IDs and returned as generic 500 responses without stack traces.
