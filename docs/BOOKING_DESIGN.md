# Booking and inventory design

Implemented booking semantics and transaction boundaries.

- Immediate confirmation, no payment or temporary holds in the current booking flow.
- All existing ticket prices and booking snapshots are USD (two decimal places).
- Customers may cancel any number of their own active tickets, partially or fully,
  at least 24 hours before event start. Exactly 24 hours is allowed.
- Partial cancellation requests specify each booking item's desired cumulative
  CancelledQuantity, not an increment. Repeating the same request releases no extra
  inventory. Omitting Items cancels all remaining tickets. Decreasing a cancellation
  target is rejected; cancelled tickets cannot be reinstated.
- Confirmed, PartiallyCancelled, and Cancelled are the booking states. Preserve
  original quantity/total; return cancelled and remaining amounts separately.
- No cancellation-count limit. The 20-ticket creation request bound stays;
  it does not limit how many already-owned tickets may be cancelled across bookings.
- Any authenticated account can book for itself; no cross-customer admin override.


## Scope and customer flow

Start with immediate confirmation: browse availability, sign in, submit categories
and quantities for one event, receive a Confirmed booking. Customers can view their
own history and cancel at least 24 hours before the event starts. Confirmed means an accepted
reservation, not a paid order. Payments, temporary holds, expiry, and QR tickets
are later milestones. No Pending state without an expiry/confirmation workflow.

## Model

- Booking: Id (int), CustomerId (string), EventId, Status (Confirmed/PartiallyCancelled/Cancelled),
  CreatedAtUtc, nullable CancelledAtUtc (DateTimeOffset), Currency, TotalAmount, Items.
- BookingItem: Id, BookingId, TicketCategoryId, positive Quantity, CancelledQuantity (0 through Quantity), UnitPrice and
  CategoryName snapshots. Unique (BookingId, TicketCategoryId). TotalAmount is the
  sum of quantity times snapshot price; later price changes do not alter history.
- TicketCategory gains server-maintained BookedQuantity, with database constraint
  0 <= BookedQuantity <= Capacity. Available = Capacity - BookedQuantity.
- Infrastructure maps CustomerId to Identity without a Domain dependency on Identity.
  Restrict deletion of referenced users/events/categories and preserve cancelled history.
  Index bookings by customer/date/ID and items by category. Unit prices use
  decimal(18,2); totals use decimal(20,2), accommodating 20 maximum-price tickets.

## Endpoints and input

| Method/path | Purpose | Success |
| --- | --- | --- |
| POST /api/bookings | Create for signed-in account | 201 with DTO and Location |
| GET /api/bookings/mine | Paged history; status/event filters | 200 |
| GET /api/bookings/{id} | Own booking details | 200 |
| GET /api/events/{id}/bookings | Admin/owning organizer paged event history | 200 |
| POST /api/bookings/{id}/cancel | Cancel own booking | 200 with DTO |
| GET /api/events/{eventId}/availability | Public category availability | 200 |

Create input: EventId and Items containing TicketCategoryId and Quantity. The
server supplies CustomerId, status, prices, currency, and total. Example:

```json
{"eventId":12,"items":[{"ticketCategoryId":5,"quantity":2}]}
```

Any authenticated role can book for itself; no separate role needed.
Individual booking/cancellation routes stay caller-only. Admins and the owning
organizer may separately read event-wide booking history; they cannot cancel another
customer's booking. An unowned or missing booking returns
404; anonymous access 401; invalid input 400; insufficient inventory or a started
event 409. Public availability never includes customer information.

## Creation and inventory

Validate nonempty items, positive quantities, no duplicate category IDs, a bounded
request (at most 20 tickets total), existing event/categories, and that all
categories belong to that event. This request bound is not a per-customer limit.
Use UTC dates and TimeProvider. At now >= event start, reject creation. Reject new cancellations when fewer than
24 hours remain. Replays with no new cancellation return the current state.

Within one SQL transaction, validate the event and process categories in ID order.
Atomically claim inventory with a conditional update:

```sql
UPDATE TicketCategories
SET BookedQuantity = BookedQuantity + @quantity
WHERE Id = @categoryId AND EventId = @eventId
  AND Capacity - BookedQuantity >= @quantity;
```

One affected row means success. Otherwise reject and roll back every prior claim.
Hold category write locks while reading price/name and saving snapshots. Persist
booking/items and inventory in the same transaction. Protect the event timing check
against concurrent event edits within that transaction. An availability read never
reserves inventory. In-process locks cannot protect multiple API instances.

Acquire locks in consistent order. SQL Server deadlocks remain possible: roll back
and return a retryable conflict for a recognized deadlock, not arbitrary exceptions.
Client retries without idempotency can create separate bookings; do not call them
duplicate-safe. Idempotency needs its own explicit implementation before payment work.

## Cancellation

Within one transaction, lock the event then booking. Check ownership before exposing
booking data. Calculate the requested cumulative targets for each item; every target
must be between its previous cancelled count and original quantity. All requested
items must belong to the booking and cannot repeat. If no quantities change, return
the current state without releasing inventory or enforcing a new cutoff.

For new cancellations, require now <= event start minus 24 hours. Decrement each
category's BookedQuantity only by its newly cancelled quantity, in category ID order.
Update item CancelledQuantity and derive the booking status. Set CancelledAtUtc only
when fully cancelled. Commit counters, items, and status together. Never delete
booking items or change original totals/prices. Return remaining and cancelled totals.

Example partial request: {"items":[{"bookingItemId":1,"cancelledQuantity":2}]}.
To cancel all remaining tickets: {}. Deadlocks return retryable conflicts; retries
use the same cumulative targets so cancellation does not release inventory twice.

## Existing management guards

- Category capacity cannot fall below BookedQuantity (service check and DB constraint).
- Categories with any booking history cannot be deleted or moved between events,
  even when bookings were cancelled. Price/name edits affect new bookings only.
- Events with booking history cannot be deleted, moved to another venue, or have
  their dates changed until rescheduling/cancellation policy is implemented.
- Existing event/category allocation guards stay in place. Account deletion must
  not erase booking history; anonymization and organizer cancellation are separate.

## Responsibilities and verification

Application: DTOs, query, IBookingsService. Domain: Booking, BookingItem, BookingStatus.
Infrastructure: service, transactions, ownership checks, mappings/migrations. API:
thin authenticated endpoints. Reuse current validation, paging, logs, and Results.

Verify real SQL Server races for the last ticket, multi-item rollback, cancellation
races and repeated cancellation, and booking versus category-capacity changes.
Also test ownership, spoofed customer/prices, mixed-event/duplicate inputs, immutable
price snapshots, cutoff boundaries with controlled time, and management history guards.
Use isolated databases and real Identity tokens for persistence/HTTP verification.

## Verification and evolution

The AddBookings migration defines the schema. Apply versioned migrations to each
target database before running the API. Existing prices are interpreted as USD.
Tests use real SQL Server, Identity tokens, and controlled time for inventory,
ownership, cancellation, concurrency, and historical-value checks.

Event history uses EventBookingQuery (status, paging) and BookingDto. EventAccess
performs service ownership checks; controller attributes enforce roles. Personal
history additionally filters by EventId. Creation idempotency, payment, expiry,
and refunds are separate roadmap items.
