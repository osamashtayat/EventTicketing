# Event Ticketing API

**Frontend handoff:** [complete API reference](docs/FRONTEND_API.md) and
[TypeScript wire contracts](docs/frontend-api.ts), covering all current routes,
authentication, permissions, examples, filters, and response limitations.

## Shared venue scheduling capacity

Event POST/PUT accepts date-only `MM/dd/yyyy`, for example start `02/02/2027` and
end `02/02/2027` for a one-day event, in addition to ISO timestamps. Date-only starts
mean midnight UTC; date-only ends include the selected day and become the next
midnight internally. Exact ISO timestamps keep their supplied times. Reversed or
invalid ranges return 400. Responses stay ISO with the internal exclusive end.
No converter is applied globally to booking dates or event query filters.

Event create/update checks the sum of capacities of all simultaneous events against
venue capacity, with HTTP 409 `Event.VenueCapacityConflict` on overflow. Periods use
[start, end): events that finish exactly when another starts do not overlap. The
validator checks the peak simultaneous load across the requested window, excludes
the current event during updates, and supports more than two events. For a venue
of 10, overlapping 5 + 6 is rejected, while 5 + 5 is accepted. Two non-overlapping
6-capacity events may share a long 4-capacity event because their peak is only 10.

Venue updates also reject a capacity below the full schedule's peak (409
`Venue.CapacityBelowOverlappingEvents`). Create, reschedule/move, and venue edits
share venue database locks through commit; moves lock both venues in ID order.
Booking/category operations retain their event-first locks after the schedule's
venue locks. Public browsing and existing ownership/history restrictions remain.

No migration/package is needed. Existing schedules are not silently modified.
The full suite includes real SQL/HTTP concurrency cases for competing creates,
rescheduling, and venue reduction, plus interval boundaries, equality, containment,
three-way overlaps, update self-exclusion, and non-simultaneous overlaps.

## Frontend connection

`GET /api/auth/me` requires an authenticated request and returns only the caller's
Id, Email, FirstName, LastName, and Roles. Send `Authorization: Bearer <accessToken>`.
Anonymous/invalid-token requests receive 401. Responses are marked no-store; password
hashes, security stamps, and tokens are never included. Roles are read from Identity's
database; after changing a role, sign in again to update token authorization claims.
UI role-based navigation does not replace server authorization.

CORS uses `Cors:AllowedOrigins`, with exact origins and no trailing slash. Development
allows `http://localhost:5173` and `http://localhost:3000`. Other environments default
to an empty list; configure the deployed frontend origin in environment-specific
settings or `Cors__AllowedOrigins__0`. Do not put paths or wildcard origins there.
Bearer requests can use Authorization and Content-Type headers, and JavaScript can
read the Location response header. Credentialed cross-origin cookies are not enabled.
Unlisted origins get no Access-Control-Allow-Origin header; CORS is a browser rule,
not an API authorization mechanism.

Call the API's final HTTPS URL directly (for example `https://localhost:7209`) so
browser preflights do not encounter HTTP-to-HTTPS redirects. Use login with
`useCookies=false`, then fetch `/api/auth/me` for the current profile/roles. Refresh
expired tokens through the existing refresh endpoint. The frontend can now build
browsing, login, booking, and management screens against these endpoints.

Verification: 45 total tests pass, including real-token current-user responses,
anonymous/invalid-token failures, allowed/denied preflights, CORS headers on 401,
Location exposure, and origin configuration validation. No migration is needed.

## Bookings

[Accepted design](docs/BOOKING_DESIGN.md): immediate confirmation, USD, and cancellation
at least 24 hours before event start (equality is allowed). Any authenticated role
can book for itself. Individual booking reads and cancellation are customer-scoped; unowned IDs
return 404, including for admins. Admins and the event owner can separately read
all bookings through the authorized event-history endpoint. Public availability contains no customer information.

| Method/path | Behavior |
| --- | --- |
| POST /api/bookings | EventId and category/quantity items; 201 with Location |
| GET /api/bookings/mine | Paged own history; eventId/status filters |
| GET /api/bookings/{id} | Own booking details |
| GET /api/events/{id}/bookings | Admin/owning organizer event history, with status/paging |
| POST /api/bookings/{id}/cancel | `{}` cancels all remaining tickets |
| GET /api/events/{eventId}/availability | Public capacity/booked/available and USD prices |

Partial cancellation body: `{"items":[{"bookingItemId":1,"cancelledQuantity":2}]}`.
CancelledQuantity is the desired cumulative total, not an increment. The server checks
that items belong to the booking and quantities never exceed purchased tickets.
Cancelled tickets become available for someone else immediately after commit.
Replays never release inventory twice. At fewer than 24 hours before start, new
cancellations return 409; no-op replays still return the current state.

A booking contains one event, distinct categories, and up to 20 tickets. Prices,
customer identity, USD currency, and totals are server-controlled. Responses preserve
original TotalAmount and quantities and expose CancelledAmount/RemainingAmount.
Status values are Confirmed=0, PartiallyCancelled=1, Cancelled=2. Snapshot unit prices
use decimal(18,2), totals decimal(20,2). Existing category prices are treated as USD.
No payment/refund, holds, issued tickets, or create-request idempotency is implemented.

Booking mutations lock their event during short database transactions and conditionally
claim/release category inventory. All items succeed or all roll back. Recognized SQL
deadlocks return retryable 409; unexpected errors go through the existing error handler.
Categories with booking history cannot be deleted/moved, capacity cannot fall below
booked tickets, and events with history cannot be deleted/rescheduled/moved. Cancelled
bookings retain these history protections. Price/name changes affect new bookings only.

Apply the reviewed `AddBookings` migration to your local configured database before
running the updated API (it also applies any earlier pending migrations):

```sh
dotnet ef database update --project EventTicketingApi.Infrastructure --startup-project EventTicketingApi -- --environment Development
```

No application database migration was applied during implementation. The migration
adds Bookings/BookingItems, a zero-initialized BookedQuantity counter, indexes, foreign
keys, and check constraints; it removes no existing business data.

`BookingsService` shares authentication/DTO validation in ValidateRequest and extracts
inventory reservation, owned-booking locking, cancellation-target validation, inventory
release, and status updates into private helpers. Creation/cancellation still own their
transaction boundaries. Personal and event history share filtering, ordering, paging,
and DTO projection. Event history performs role and ownership checks in the service,
not just in the controller. It is read-only and does not grant cancellation rights.
An unrelated organizer receives 403; an authorized caller requesting a missing event
receives 404. It includes bookings from every customer of that event, including
cancelled ones unless status is filtered, without returning customer email/credentials.

### Booking integration tests

`EventTicketingApi.IntegrationTests` uses xUnit and real HTTP/Identity/SQL Server.
Start local SQL Server on port 1434, configure API User Secrets or the environment
variable EVENT_TICKETING_TEST_CONNECTION, then run:

```sh
dotnet test EventTicketingApi.slnx
```

Tests reject nonlocal database servers and use unique temporary databases, which are
deleted afterward. The application's database is never used for test writes. The
SQL login needs permission to create/drop these temporary databases. Twelve tests passed,
including ownership, released-ticket rebooking, cutoff boundaries, race conditions,
rollback, history guards, and monetary bounds. Existing NuGet warnings remain.

## Authorization and event ownership

Reads for countries, venues, events, and ticket categories remain public. Country
and venue writes require Admin. Event creation requires Admin or EventOrganizer;
the service assigns OrganizerId from the signed-in account, never the request body.
Event update/delete and ticket-category writes require Admin or the event's owning
EventOrganizer. Category moves require access to both source and destination events.
Ownership stays unchanged on event updates; ownership transfer is not implemented.
Unauthenticated writes return 401, insufficient roles/ownership return 403, and
missing resources return 404 for permitted callers. Controllers enforce roles;
shared Infrastructure EventAccess enforces ownership in event/category services.
Application's ICurrentUser is implemented in API using authentication claims;
Domain references only the string user ID and remains independent of Identity.

Before running the updated API, apply the reviewed migration:

```sh
dotnet ef database update --project EventTicketingApi.Infrastructure --startup-project EventTicketingApi -- --environment Development
```

`AddEventOrganizer` adds a required, indexed foreign key to AspNetUsers with no
cascade delete. Existing events receive the Admin user with the lowest user ID
(sorted by SQL Server); this is a backfill policy, not an account creation timestamp.
If events exist without an Admin, migration fails instead of inventing an owner.
It creates no accounts and removes no events. Ownership migration was tested only
in isolated databases, not applied to the application's database.

Verification: real Identity bearer tokens and isolated SQL Server HTTP checks cover
public reads, 401/403, organizer ownership, Admin overrides, category moves between
owners, owner spoofing, and legacy-event backfill. Test databases are deleted afterward.
Existing package vulnerability warnings remain.

## Identity role setup

The API calls `Infrastructure/Identity/IdentitySeeder.cs` during startup to create
missing `User`, `EventOrganizer`, and `Admin` roles through Identity's RoleManager.
Existing roles are left in place. Apply the Identity migration to the configured
database before starting the API. Database or role-creation failures stop startup;
startup does not apply migrations automatically. This seeds role definitions only:
it does not create accounts or assign role membership during registration.

`IAuthService` is implemented by Infrastructure's `AuthService`. Public registration
at `POST /api/auth/register` accepts email, password, firstName, and lastName and
always assigns User, even if a client includes an extra role field. The API replaces
Identity's built-in registration handler at that route; login, refresh, and other
Identity endpoints retain their `/api/auth` URLs. Registration returns 200 or 400;
unexpected failures use the safe 500 response. Password rules and hashing are owned
by Identity. Existing accounts are not automatically assigned roles.

`POST /api/accounts` requires an authenticated Admin and accepts the same fields plus
`role`, limited to Admin or EventOrganizer. It returns 201 with no response body;
anonymous callers receive 401 and other roles receive 403. Both creation flows reuse
one service helper and one transaction for account creation and role assignment.
Failures roll back both writes. Controllers/handlers only translate HTTP; validation,
Identity operations, and logging live in the service. Credentials are never logged.

### First admin

First-admin bootstrapping is off by default. In API User Secrets or environment
configuration, set `BootstrapAdmin:Enabled` to true, `BootstrapAdmin:Email` to a new
account email, and `BootstrapAdmin:Password` to a strong password. Optional
`BootstrapAdmin:FirstName` and `BootstrapAdmin:LastName` default to Initial and
Administrator. Environment variables use double underscores, for example
`BootstrapAdmin__Enabled`. Keep credentials out of tracked configuration files.

After applying the Identity migration, start the API. If no Admin exists, it creates
that account and assigns Admin using the same transactional service. It skips when
an Admin already exists, never resets a password, and never promotes an existing
public account. Invalid configuration or a duplicate account causes startup failure
with error codes only. Disable bootstrapping and remove its password from configuration
after the first successful setup. No account or database was created during implementation.
Concurrent multi-instance bootstrap is not supported; run initial setup on one instance.

Sign in through `/api/auth/login?useCookies=false` as the admin and send its access
token as `Authorization: Bearer <token>` to `/api/accounts`. The created admins and
organizers can then sign in through the same login endpoint. Business endpoint permissions and ownership are described above.

Verification: solution build and nine isolated HTTP checks with fake services and
authentication covered registration replacement, input errors, anonymous/forbidden
access, Admin creation, organizer creation, and invalid roles. These checks do not
prove real SQL persistence, transaction rollback, bootstrap, or Identity token behavior.

## Ticket-category HTTP slice

`ITicketCategoriesService` and its DTOs/mapping profile live in Application;
Infrastructure's `TicketCategoryService` handles validation, persistence, transactions,
and result logging. `TicketCategoriesController` handles only HTTP and uses the shared
failure response helper. DI registration is in Program.cs.

| Method | Route | Success |
| --- | --- | --- |
| GET | `/api/ticket-categories` | 200 with a filtered page |
| GET | `/api/ticket-categories/{id}` | 200 with category data |
| POST | `/api/ticket-categories` | 201 with category data and a Location header |
| PUT | `/api/ticket-categories/{id}` | 200 with updated category data |
| DELETE | `/api/ticket-categories/{id}` | 204 |

List filters: EventId, Search (name/description substring), MinPrice, MaxPrice, plus
PageNumber and PageSize. Price bounds are inclusive; MinPrice must not exceed MaxPrice.
Ordering is Name then Id; defaults and bounds reuse PageQuery/PagedResult.

Create/update share validation: required name, positive event ID and capacity,
existing event, and price from 0 through 9999999999999999.99 with at most two decimal
places. Invalid input returns 400; missing category/event returns 404; exceeding the
event's remaining allocation returns 409. Free categories are allowed. Names do not
have a uniqueness restriction. PUT checks route/body IDs and excludes the current
category's allocation. Moving a category validates capacity against its destination
event. Deleting a category removes its allocation; there are no bookings yet to protect.

Category create/update and event update use serializable database transactions so
allocation checks and writes cannot interleave into an over-allocation. Transactions
may deadlock under contention; a database-aborted request follows the global error/log
path rather than being automatically retried. Venue scheduling edits now also coordinate through venue locks as described above. No new packages or migrations are required.

Verification: build and 49 temporary real HTTP/SQL Server checks passed, covering
mapping, CRUD, price/quantity bounds, allocation equality/overflow, moves, filtered
paging, cancellation, and competing category allocation/event-capacity writes. Tests
used a separate database that was removed; EventTicketingDb was unchanged.


## Service outcomes, pagination, and filters

Application's `Validation/DtoValidator.cs` centralizes null/cancellation guards and
DataAnnotations validation for registration, events, ticket categories, and paging
queries. Callers supply their existing error code and handle Result creation and
logging. Resource-specific date, price, and database rules remain in their services.

All public Result-returning methods in CountryService, VenueService, EventService, and TicketCategoryService
use Infrastructure's shared `LogResult` helper. It returns the same Result unchanged
and logs the method name, outcome, error codes, and request activity ID. Failure is
Error, Validation/Conflict are Warning, NotFound is Information, and Success is Debug.
The Development configuration enables service Debug logs, so successful outcomes are
visible in the API terminal too; other environments use the default Information level.
Bool existence checks are ordinary queries, not failed Result outcomes. Common remains
independent of logging. New Result-returning service methods should call `.LogResult(logger)`
at their return boundary; private validation helpers do not log again. Exceptions still
flow to GlobalExceptionHandler with their stack trace. Values, DTOs, error descriptions,
query strings, and request bodies are not recorded by the result helper. Expected
service-error responses include the same `traceId` used in those logs.

**List response change:** GET `/api/countries`, `/api/venues`, `/api/events`, and `/api/ticket-categories` now
return a `PagedResult<T>` object instead of a raw array:

```json
{
  "items": [],
  "totalCount": 0,
  "pageNumber": 1,
  "pageSize": 10,
  "totalPages": 0,
  "hasNextPage": false,
  "hasPreviousPage": false
}
```

PageNumber defaults to 1 and PageSize to 10. Both must be positive; PageSize cannot
exceed 100 and the offset must fit a SQL/EF integer. Invalid queries return 400 rather
than silently clamping. Pages beyond the last return empty items with the filtered
count. TotalCount is measured after filters and before paging. Count and page execute
as two queries, so concurrent changes can occur between them. All queries are read-only,
with deterministic ordering and SQL Count/Skip/Take before materialization.

| Resource | Query filters | Ordering |
| --- | --- | --- |
| Countries | Search (name or short name) | Name, CountryId |
| Venues | Search (name or address), CountryId, City | Name, Id |
| Events | Search (name or description), VenueId, CountryId, City, StartFrom, StartTo | StartDate, Id |

Filters combine with AND. Search uses a trimmed substring; City uses trimmed exact
matching. Case sensitivity follows the SQL Server column collation. Event date bounds
are inclusive and apply to StartDate; send UTC timestamps consistently. StartFrom must
not follow StartTo. Optional country/venue filter IDs must be positive; an ID with no
matches returns an empty page. Query DTO validation also runs within services to protect
non-HTTP callers. The existing country-details endpoint still embeds venues; its nested
collection is not paginated. Use `/api/venues?countryId=...` for a paged venue view.

Examples:

```http
GET /api/countries?search=Jo&pageNumber=1&pageSize=10
GET /api/venues?countryId=1&city=Amman&pageNumber=2&pageSize=10
GET /api/events?search=Music&venueId=1&startFrom=2027-01-01T00:00:00Z&pageSize=20
```

Verification: compilation and 34 temporary SQL Server/HTTP checks passed, covering
page boundaries/defaults/order, combined filters and filtered totals, SQL paging,
invalid direct and HTTP queries, cancellation, result-log levels/privacy, trace
correlation, and the global exception handler. The isolated test database was removed;
EventTicketingDb was unchanged. No package or migration was needed for this change.


## Errors and logging

Unexpected request exceptions are handled in API's `GlobalExceptionHandler`,
registered before the endpoints. Country and venue services no longer swallow
exceptions in repeated catch-all blocks; events use the same central path.
The built-in `ILogger` console provider records the exception/stack trace, HTTP
method, request path (without query string), and `TraceId`. Look in the terminal
running `dotnet run`, or container stdout with `docker compose logs <api-service>`
once an API service is containerized. These console logs are not durable log files.
Do not enable EF sensitive-data logging or log credentials/request bodies.

Clients receive HTTP 500 `application/problem+json` with a generic title and a
`traceId`, never the raw exception or stack trace, including in Development.
Search server logs for that trace ID to correlate a reported failure. Expected
400/404/409 results still use `BaseApiController`; their service outcomes are logged
separately from unexpected exceptions as described below. Aborted requests are left to ASP.NET Core cancellation handling.
Background jobs and calls made outside the HTTP pipeline will need their own
boundary handling when introduced.

Verification: 13 temporary checks exercised real service failures without a database,
safe HTTP responses, original exception capture, trace correlation, query exclusion,
validation, and cancellation across Development/Production. No new logging package
or database/schema change was introduced.

## Event HTTP slice

`EventsController` uses Application's `IEventsService`, implemented by Infrastructure's
`EventService`. DTOs and the AutoMapper profile live in Application. The controller
only handles HTTP and delegates business decisions to the service; failure responses
reuse `BaseApiController`.

| Method | Route | Success |
| --- | --- | --- |
| GET | `/api/events` | 200 with a filtered page ordered by start date and ID |
| GET | `/api/events/{id}` | 200 with event data |
| POST | `/api/events` | 201 with event data and a Location header |
| PUT | `/api/events/{id}` | 200 with updated event data |
| DELETE | `/api/events/{id}` | 204 |

Create/update share service validation: required input, positive capacity and venue
ID, nondefault dates with end after start, an existing venue, and event capacity no
greater than venue capacity. Oversized events return 400. Venue updates return 409
if the new capacity is below any existing event's capacity; equality is valid.
For example, a venue with an event capped at 400 cannot be reduced to 300, but can
be reduced to 400. Capacities are added only while their time intervals overlap. Update rejects
mismatched route/body IDs and a capacity below existing ticket-category allocations.
Deletion returns 409 while ticket categories exist. Event names need not be unique.
No database schema change is needed. Examples are in the `.http` file; send UTC dates
consistently with the current `DateTime` model. The current API includes event search/pagination as described above; publication,
authentication, reservations, and payments remain future work.

Verification: solution build and 19 temporary checks using real HTTP and an isolated
SQL Server database passed. The checks covered mapping configuration, persisted
create/update/delete, missing records/venue, input rules, category guards, and
cancellation. They did not exercise concurrent category changes. The temporary
database was removed and the application's database was not modified. Existing
NuGet vulnerability warnings remain outside this slice.

## Venue HTTP slice

`VenuesController` exposes POST `/api/venues`, GET `/api/venues/{id}`,
PUT `/api/venues/{id}`, and DELETE `/api/venues/{id}` through `IVenuesService`.
Create returns 201 with the response DTO and a Location header; get and update
return 200 with a venue summary; delete returns 204. Update requires matching
route/body IDs. Input DTO validation returns 400; service failures use the shared
controller helper for 400/404/409/500 responses. Request samples are included in
`EventTicketingApi/EventTicketingApi.http`. Venue listing is now paginated and filterable as described above.
Database behavior must be verified against the local SQL Server instance; the
controller HTTP checks use a fake service and do not establish persistence guarantees.

## Country HTTP slice

The API now has a `CountriesController` backed by `ICountriesService`. After a
fresh build and restart, inspect the routes in Scalar at
`https://localhost:7209/scalar` using the HTTPS launch profile. Request examples
are in `EventTicketingApi/EventTicketingApi.http`.

| Method | Route | Success |
| --- | --- | --- |
| GET | `/api/countries` | 200 with a filtered page of summaries |
| GET | `/api/countries/{id}` | 200 with country details and venues |
| GET | `/api/countries/by-name?name=Jordan` | 200 with country details and venues |
| POST | `/api/countries` | 201 with details and a Location header |
| PUT | `/api/countries/{id}` | 204; route and body IDs must match |
| DELETE | `/api/countries/{id}` | 204 |

Request DTO annotations are validated by `[ApiController]`. Service failures map
to 400 (validation), 404 (missing), 409 (conflict), or 500 (unexpected failure).
Reads are public; writes now follow the authorization rules above. Requests that access
the database require the local SQL Server container, connection configuration,
and applied migrations described during setup. The original scaffold overview
below records the starting point rather than this slice's implementation status.

A learning and portfolio backend inspired by event ticketing platforms. The goal
is to practice realistic REST API design, relational modeling, service design,
authentication, transactions, concurrency, and testing through small steps that
the developer implements and understands.

## Technology direction

Current: C#, .NET 10, ASP.NET Core, built-in DI, LINQ, and OpenAPI document generation.
Planned foundation: EF Core, SQL Server, RESTful endpoints, DTOs, and validation.
Later: Identity and JWT, xUnit, structured error handling and logging, background
processing, Docker, email, payments, and optionally React. Git/GitHub are the
intended version-control workflow; remote and CI setup are not configured here.
Packages and infrastructure will be introduced only when a milestone needs them.


## Planned capabilities

- Event and venue management, event search, filtering, and pagination.
- Ticket categories with prices, capacity, and sales availability.
- Registration, sign-in, and Administrator, Event Organizer, and Customer roles.
- Booking creation, history, cancellation, and availability tracking.
- Transactional inventory updates, concurrency protection, temporary holds,
  expiration, and appropriate idempotency.
- Optional QR tickets, email, payments, reporting, administration UI, and frontend.

These are plans, not implemented or tested capabilities.

## Development guide

- [Agent instructions](AGENTS.md): how Codex should assist without taking over learning.
- [Architecture](docs/ARCHITECTURE.md): current structure, proposed boundaries, and open decisions.
- [Roadmap](docs/ROADMAP.md): incremental tasks and completion criteria.
- [Business rules](docs/BUSINESS_RULES.md): proposed invariants and questions to resolve.

