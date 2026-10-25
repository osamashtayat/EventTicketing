# Event Ticketing API

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
path rather than being automatically retried. Concurrent venue-capacity edits remain
outside this allocation guarantee. No new packages or migrations are required.

Verification: build and 49 temporary real HTTP/SQL Server checks passed, covering
mapping, CRUD, price/quantity bounds, allocation equality/overflow, moves, filtered
paging, cancellation, and competing category allocation/event-capacity writes. Tests
used a separate database that was removed; EventTicketingDb was unchanged.


## Service outcomes, pagination, and filters

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
be reduced to 400. Capacities of different events are not added together. Update rejects
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
These learning endpoints currently have no authentication. Requests that access
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

