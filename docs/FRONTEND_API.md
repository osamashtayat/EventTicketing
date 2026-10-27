# Frontend API reference

Reviewed against the implementation on **2026-10-27**. This describes current behavior,
not planned features. Reusable TypeScript wire types are in [frontend-api.ts](frontend-api.ts).
They are contracts, not a generated SDK. Request examples contain placeholders, not credentials.

## Contents

- [Connection and conventions](#connection-and-conventions)
- [Authentication and accounts](#authentication-and-accounts)
- [Pagination and filters](#pagination-and-filters)
- [Countries](#countries)
- [Venues](#venues)
- [Events](#events)
- [Ticket categories](#ticket-categories)
- [Bookings](#bookings)
- [Errors](#errors)
- [Frontend request examples](#frontend-request-examples)
- [Other mapped Identity endpoints](#other-mapped-identity-endpoints)
- [Current limitations](#current-limitations)

## Connection and conventions

| Setting | Value |
| --- | --- |
| Browser API base URL | `https://localhost:7209` (HTTPS launch profile) |
| Local HTTP listener | `http://localhost:5066`; prefer final HTTPS URL in browsers |
| Interactive reference | `https://localhost:7209/scalar` in Development |
| OpenAPI document | `https://localhost:7209/openapi/v1.json` in Development |
| Allowed Development frontend origins | `http://localhost:5173`, `http://localhost:3000` |
| Production frontend origin configuration | `Cors:AllowedOrigins` or `Cors__AllowedOrigins__0` |

The API process and local SQL Server must be running and pending migrations applied.
If the browser reports an untrusted development certificate, trust it locally with
`dotnet dev-certs https --trust`. Localhost refers to the device running the browser;
a phone needs a separately configured network address/certificate/origin.

Origins must match scheme, host, and port exactly, without a trailing slash. CORS
allows bearer Authorization headers and exposes `Location`. Cross-origin credentialed
cookies are not enabled. Use the final HTTPS URL to avoid preflight redirects.
CORS is browser permission, not API authorization.

- JSON keys use **camelCase**; JSON requests use `Content-Type: application/json`.
- Success responses contain the DTO directly, not `{isSuccess,value}` wrappers.
- Business IDs are integers; user IDs are opaque strings.
- POST create routes normally return 201 and `Location`; registration returns 200;
  admin account creation returns 201 without a body or Location.
- PUT requires the full write body plus `id` equal to the route ID. There are no PATCH routes.
- DELETE returns 204 with no body. Do not call `response.json()` on empty responses.
- Optional query parameters should be omitted when unset, not sent as `null` or empty strings.
- All prices are **USD**, with at most two fractional digits. Money is serialized as
  JSON numbers. Trust server totals; JavaScript numbers cannot preserve exact cents
  at the very large values the API's decimal types permit.
- Event create/update bodies accept exact `MM/dd/yyyy` (e.g. `02/02/2027`) or ISO
  8601 timestamps (e.g. `2027-02-02T18:00:00Z`). Date-only starts mean midnight UTC;
  date-only ends include that entire day (internally the following midnight). For a
  one-day event, use start and end `02/02/2027`. ISO timestamps preserve exact times
  and explicit offsets are normalized to UTC; those end instants are exclusive.
  Equal ISO start/end instants are invalid; identical date-only values are valid.
  Responses remain ISO strings and may omit `Z` after database reads: interpret
  event values without offsets as UTC. Booking timestamps have an explicit offset.
  Query date filters still use ISO strings; MM/dd/yyyy support is scoped to event
  create/update JSON bodies.
- Public browsing does not require a token. All protected calls send
  `Authorization: Bearer <accessToken>`.

## Authentication and accounts

Role names are case-sensitive application constants: `User`, `EventOrganizer`, `Admin`.
An organizer/admin account need not also have User. All authenticated roles can book
for themselves. Role membership alone never grants ownership of another organizer's event.

| Method | Path | Access | Success |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | 200, empty |
| POST | `/api/auth/login?useCookies=false` | Public | 200, Tokens |
| POST | `/api/auth/refresh` | Refresh token in body | 200, Tokens |
| GET | `/api/auth/me` | Authenticated | 200, CurrentUser; no-store |
| POST | `/api/accounts` | Admin | 201, empty |

### Register

```json
{
  "email": "customer@example.com",
  "password": "<password>",
  "firstName": "Example",
  "lastName": "Customer"
}
```

All four fields are required; email must be valid. Identity's current default password
policy requires at least six characters and at least one uppercase letter, lowercase
letter, digit, and non-alphanumeric character. Server validation remains authoritative.
Registration always assigns User. Do not send a role. Registration does not log in or
return tokens and does not currently send a confirmation email. Duplicate usernames
and password errors return 400. Registration errors use the service error-array shape
shown below, not Identity's original built-in registration contract.

### Login and refresh

Login body:

```json
{"email":"customer@example.com","password":"<password>"}
```

Optional login fields: `twoFactorCode`, `twoFactorRecoveryCode` for accounts with 2FA.
Use `useCookies=false` and do not set `useSessionCookies=true`. Failed login returns
401 ProblemDetails; failed attempts participate in Identity's lockout behavior.

Login/refresh response shape (token placeholders; lifetime is illustrative):

```json
{
  "tokenType": "Bearer",
  "accessToken": "<access-token>",
  "expiresIn": 3600,
  "refreshToken": "<refresh-token>"
}
```

Tokens are **opaque**, not JWTs. Do not decode them for user/role information. Use
`expiresIn` from the response, in seconds, rather than hardcoding a lifetime.

Refresh body:

```json
{"refreshToken":"<refresh-token>"}
```

Use the returned pair for future requests. If refresh fails with 401, clear local
session state and ask the user to sign in. Coordinate refresh requests so only one
runs at a time. Do not automatically replay booking creation: it has no idempotency
key and repeated requests can create multiple bookings. An old refresh token is not
promised to be revoked immediately merely because it was used.

There is no custom logout/revoke endpoint. UI logout clears client-held tokens and
profile state; it does not by itself invalidate tokens already issued by the server.
Do not put tokens in URLs, logs, or source code. An in-memory session avoids persisting
tokens; persistent browser storage is a separate frontend security decision.

### Current user

```http
GET /api/auth/me
Authorization: Bearer <access-token>
```

```json
{
  "id": "<user-id>",
  "email": "customer@example.com",
  "firstName": "Example",
  "lastName": "Customer",
  "roles": ["User"]
}
```

`email` can be null; older accounts can have empty names. Roles come from Identity's
database. Refresh/sign in again after role changes so token claims match. Use the
profile to choose navigation; backend authorization remains authoritative. Anonymous
or invalid tokens get 401; a valid principal whose account is missing can get 404.

### Admin creates an organizer or admin

`POST /api/accounts` uses the registration fields plus one allowed role:

```json
{
  "email": "organizer@example.com",
  "password": "<initial-password>",
  "firstName": "Example",
  "lastName": "Organizer",
  "role": "EventOrganizer"
}
```

Role must be `EventOrganizer` or `Admin`. Response is 201 **with no JSON body**. There
is no account-list/edit/promote endpoint yet. This creates a new account, not a role
change for an existing user. First-admin setup is server configuration, not a public route.

## Pagination and filters

Every paged endpoint accepts `pageNumber` (default 1, minimum 1) and `pageSize`
(default 10, range 1–100). Invalid parameters return 400; they are not clamped.
The calculated offset must fit a signed 32-bit integer.

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

`totalCount` is after filters and before pagination. A page beyond the end has empty
items. Count/items use separate queries, so concurrent changes can affect consistency.
Filters combine with AND. Search/city input is trimmed; matching case sensitivity
follows SQL Server collation. Search is substring matching; city is exact matching.
Search and city query strings have maximum length 200.

| List | Additional parameters | Ordering |
| --- | --- | --- |
| Countries | `search` in name/shortName | name, id |
| Venues | `search` in name/address; `countryId`; `city` | name, id |
| Events | `search` in name/description; `venueId`; `countryId`; `city`; `startFrom`; `startTo` | startDate, id |
| Ticket categories | `eventId`; `search` in name/description; `minPrice`; `maxPrice` | name, id |
| Own bookings | `eventId`; `status` | createdAtUtc descending, id descending |
| Event bookings | `status` (event comes from route) | createdAtUtc descending, id descending |

Optional ID filters must be positive. Unmatched filters return an empty page, not 404.
Date bounds apply to event StartDate inclusively; `startFrom <= startTo`. Price bounds
are inclusive and nonnegative; `minPrice <= maxPrice`. There is no client-selected
sort parameter. Use URLSearchParams to encode spaces and UTC offset characters.

Booking status is a **number in responses**:

| Value | Meaning |
| --- | --- |
| 0 | Confirmed |
| 1 | PartiallyCancelled |
| 2 | Cancelled |

Query status accepts the number or name, e.g. `status=1` or `status=PartiallyCancelled`.
Unknown values return 400. No Pending/Expired/Paid state is implemented.

## Countries

All GETs are public. All writes require Admin.

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| GET | `/api/countries` | — | 200, Page<CountrySummary> |
| GET | `/api/countries/{id}` | — | 200, Country |
| GET | `/api/countries/by-name?name=Jordan` | — | 200, Country |
| POST | `/api/countries` | CountryWrite | 201, Country + Location |
| PUT | `/api/countries/{id}` | CountryWrite + id | 204, empty |
| DELETE | `/api/countries/{id}` | — | 204, empty |

CountryWrite:

```json
{"name":"Jordan","shortName":"JO"}
```

Both strings are required. CountrySummary is `{id,name,shortName}`. Country details:

```json
{
  "id": 1,
  "name": "Jordan",
  "shortName": "JO",
  "venues": [{"id":1,"name":"City Hall","city":"Amman","countryId":1,"address":"Main Street"}]
}
```

Name lookup is exact, not a substring search, subject to database collation. Empty
name query returns 400; no matching country returns 404. Names must not duplicate
another country's name (409). Deletion while venues exist returns 409. Nested venues
are not paginated; use `/api/venues?countryId=1` for a paged list. The API does not
currently enforce an ISO-country-code format on shortName.

## Venues

All GETs are public. All writes require Admin.

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| GET | `/api/venues` | — | 200, Page<Venue> |
| GET | `/api/venues/{id}` | — | 200, Venue |
| POST | `/api/venues` | VenueWrite | 201, Venue + Location |
| PUT | `/api/venues/{id}` | VenueWrite + id | 200, Venue |
| DELETE | `/api/venues/{id}` | — | 204, empty |

VenueWrite (capacity is required even though it is absent from read responses):

```json
{"name":"City Hall","city":"Amman","countryId":1,"capacity":500,"address":"Main Street"}
```

Required name/city, positive countryId/capacity. Address may be omitted and defaults
to an empty string. Response:

```json
{"id":1,"name":"City Hall","city":"Amman","countryId":1,"address":"Main Street"}
```

A missing country returns 404. Venue names must be unique (409). Capacity cannot be
reduced below any existing event's capacity or the peak combined capacity of
simultaneous events (409). A venue with events cannot be
deleted (409). Missing venue returns 404.

**Current UI limitation:** the read DTO omits capacity, so a frontend cannot reliably
prefill a venue edit form after reload. Do not derive it from event capacities. Request
an API response enhancement before building a complete venue-edit screen.

## Events

All ordinary GETs and availability are public. POST requires Admin/EventOrganizer.
PUT/DELETE and event history require Admin or the organizer who owns that event.

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| GET | `/api/events` | — | 200, Page<Event> |
| GET | `/api/events/{id}` | — | 200, Event |
| GET | `/api/events/{id}/availability` | — | 200, Availability[] (raw array) |
| GET | `/api/events/{id}/bookings` | — | 200, Page<Booking>; protected |
| POST | `/api/events` | EventWrite | 201, Event + Location |
| PUT | `/api/events/{id}` | EventWrite + id | 200, Event |
| DELETE | `/api/events/{id}` | — | 204, empty |

EventWrite:

```json
{
  "name":"Music Night",
  "description":"Live performances",
  "startDate":"2030-01-03T12:00:00Z",
  "endDate":"2030-01-03T14:00:00Z",
  "capacity":100,
  "venueId":1
}
```

You may instead omit the time by sending:

```json
{"name":"Amman Hall event","description":null,"startDate":"02/02/2027","endDate":"02/02/2027","capacity":5,"venueId":1}
```

`MM/dd/yyyy` is month-first regardless of browser locale. Invalid calendar dates or
malformed strings return 400. PUT accepts the same formats and requires id as usual.
Responses remain ISO timestamps; the server does not echo date-only formatting.
A date-only end of 02/02/2027 returns the exclusive instant 2027-02-03T00:00:00Z
(or the same timestamp without Z after database reads). When filling a calendar-only
end-date field from such a midnight exclusive end, use the preceding calendar day.
The backend does not store which input formatting the client originally used.

Required name, positive capacity/venueId, nondefault dates, end after start.
Description is optional/nullable. Creation of past events is not currently prohibited
by CRUD, but bookings reject events that have already started. Missing venue returns
404; event capacity above venue capacity returns 400. Event names may repeat.
The sum of capacities of all simultaneous events must fit the venue. Start/end
intervals are [start, end): ending exactly when another starts does not overlap.
Create/update rejects a combined overflow with 409 `Event.VenueCapacityConflict`,
including conflicts among three or more events. Updates exclude the current event.
Only capacity active at the same instant is summed; intersecting the same long event
does not imply that two other events overlap one another. No overlap availability
preview is exposed; handle 409 on submission. Existing conflicting schedules are
not automatically changed by this rule.


Event response is the write fields plus `id`, with nullable description:

```json
{"id":1,"name":"Music Night","description":"Live performances","startDate":"2030-01-03T12:00:00Z","endDate":"2030-01-03T14:00:00Z","capacity":100,"venueId":1}
```

Creation assigns organizer ownership from the authenticated caller, including when
an Admin creates an event. Do not send organizerId; updates cannot transfer ownership.
Unrelated organizers get 403 on management/history. Admins can manage any event.

Event capacity cannot fall below category allocations (409). Events with categories
cannot be deleted (409). Any booking history, including fully cancelled bookings,
blocks deletion and changes to dates/venue (409). Name/description and valid capacity
changes remain possible. There is no publish/draft/archive/cancel-event operation.

Event history includes all customers' bookings for that event, including cancellations
unless filtered. It exposes Booking DTOs, not customer names/emails. It is read-only;
it does not let the organizer/admin cancel a customer's booking. An authorized caller
requesting a missing event receives 404.

**Current UI limitation:** responses omit organizerId and list queries have no organizer
filter or `/mine` endpoint. The frontend cannot reliably identify "my events" from
public event data. Server permissions still work; request an owner-aware API contract
before implementing a complete organizer dashboard.

## Ticket categories

All GETs are public. Writes require Admin or the organizer owning the related event.

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| GET | `/api/ticket-categories` | — | 200, Page<TicketCategory> |
| GET | `/api/ticket-categories/{id}` | — | 200, TicketCategory |
| POST | `/api/ticket-categories` | TicketCategoryWrite | 201, TicketCategory + Location |
| PUT | `/api/ticket-categories/{id}` | TicketCategoryWrite + id | 200, TicketCategory |
| DELETE | `/api/ticket-categories/{id}` | — | 204, empty |

TicketCategoryWrite:

```json
{"name":"VIP","description":"Front area","price":25.50,"capacity":40,"eventId":1}
```

Required name, positive capacity/eventId. Price must be 0 through 9999999999999999.99,
with at most two fractional digits. Free tickets are valid. Description may be null.
Category names may repeat. Response adds `id` and contains all the write fields.

Missing category/event returns 404. Combined category allocations cannot exceed event
capacity (409). Moving a category requires access to both source and destination
events. Category capacity cannot be below currently booked quantity (409). Any booking
history blocks deletion and movement to another event (409), even after cancellation.
Price/name changes affect future bookings only; historical snapshots do not change.
A competing category move can return `TicketCategory.RetryRequired` (409).

Category responses omit booked/available quantities. Read event availability for them:

```json
[
  {"ticketCategoryId":1,"name":"VIP","price":25.50,"currency":"USD","capacity":40,"bookedQuantity":5,"availableQuantity":35}
]
```

Availability is advisory, not a reservation, and remains readable even after event
start. A missing event returns 404; invalid event ID returns 400.

## Bookings

All booking routes require authentication. Any role can book **for itself**. Customer
identity is derived from the token. The personal details/cancellation routes return
404 for another customer's booking, even when the caller is Admin or an organizer.
Managers use the separate protected event-history route for read-only visibility.

| Method | Path | Body | Success |
| --- | --- | --- | --- |
| POST | `/api/bookings` | CreateBookingRequest | 201, Booking + Location |
| GET | `/api/bookings/mine` | — | 200, Page<Booking> |
| GET | `/api/bookings/{id}` | — | 200, own Booking |
| POST | `/api/bookings/{id}/cancel` | CancelBookingRequest | 200, own Booking |

CreateBookingRequest:

```json
{
  "eventId":1,
  "items":[{"ticketCategoryId":1,"quantity":2},{"ticketCategoryId":2,"quantity":1}]
}
```

Use positive IDs/quantities, at least one item, distinct categories, and at most **20
tickets total** per booking. All categories must belong to the route-independent
body eventId. Do not send prices, currency, total, status, or customerId. All items
succeed or inventory claims roll back. Insufficient inventory or an already-started
event returns 409; mixed events 400; missing event/category 404.

A successful example, using two tickets priced USD 25.50:

```json
{
  "id": 10,
  "eventId": 1,
  "status": 0,
  "currency": "USD",
  "totalAmount": 51.00,
  "createdAtUtc": "2030-01-01T12:00:00+00:00",
  "cancelledAtUtc": null,
  "items": [{
    "id": 20,
    "ticketCategoryId": 1,
    "categoryName": "VIP",
    "quantity": 2,
    "cancelledQuantity": 0,
    "unitPrice": 25.50,
    "remainingQuantity": 2,
    "originalAmount": 51.00,
    "cancelledAmount": 0,
    "remainingAmount": 51.00
  }],
  "cancelledAmount": 0,
  "remainingAmount": 51.00
}
```

Confirmed means accepted immediately, **not payment received**. Original quantities,
prices/names, currency, and totalAmount are retained after cancellation. remainingAmount
and cancelledAmount describe the active/cancelled portions; they are not payment or
refund records. No QR ticket or assigned-seat data is returned.

### Full cancellation

Send a JSON body, even when cancelling everything:

```http
POST /api/bookings/10/cancel
Authorization: Bearer <access-token>
Content-Type: application/json

{}
```

Omitted/null `items` cancels every remaining ticket of that booking. Inventory is
released on commit and another customer can book those tickets. Repeating a full
cancellation returns the existing state without releasing inventory again.

### Partial cancellation

```json
{"items":[{"bookingItemId":20,"cancelledQuantity":1}]}
```

`bookingItemId` is the **booking item's id**, not ticketCategoryId. cancelledQuantity
is the desired cumulative total, not the number to cancel this time. If 1 is already
cancelled and you want to cancel 1 more, send 2. Unlisted items are unchanged.

Each item must belong to this booking; IDs must be distinct. Each target must be
between its already-cancelled count and original quantity. Targets cannot decrease.
Empty `items: []` is invalid; use `{}` for full cancellation. A repeated partial
request with no changes returns the current state. An old lower target after a newer
cancellation is rejected (400), not treated as a command to restore tickets.

New cancellations require **at least 24 hours before event start**. Exactly 24 hours
is allowed. At fewer than 24 hours, new cancellation returns 409. No-change retries
remain allowed after cutoff. There is no cancellation-count limit across owned
bookings. Fully cancelled status is 2; otherwise any cancellation makes status 1.
cancelledAtUtc is populated only when fully cancelled.

Recognized SQL deadlocks return `Booking.RetryRequired` (409). There is no creation
idempotency key: repeated successful POSTs create separate bookings. Disable double
submission and do not blindly retry creation on timeout/unknown outcomes; consult
own booking history first. Cancellation targets are designed to avoid double release.

## Errors

Handle HTTP status first; do not assume every error has identical JSON or a body.

| Status | Frontend behavior |
| --- | --- |
| 400 | Show validation/input errors; preserve entered values |
| 401 | Refresh once if applicable; otherwise sign in |
| 403 | Caller lacks role/ownership; do not retry as token refresh by default |
| 404 | Missing or inaccessible resource (customer booking ownership is concealed) |
| 409 | Business conflict; reload relevant inventory/state and explain it |
| 500 | Generic error; show traceId for support if supplied |

Service errors are ProblemDetails, with an **array** in errors:

```json
{
  "title":"Operation conflicts with existing data",
  "status":409,
  "traceId":"<trace-id>",
  "errors":[{"code":"Booking.InsufficientAvailability","description":"Not enough tickets are available.","isNone":false}]
}
```

`isNone` is a serialized computed property of Error; frontend code can ignore it.
Some service failures have an empty errors array. Trace/type/detail fields vary.
Automatic controller model validation and built-in Identity validation use an
**object** of field/error-code names mapped to string arrays instead:

```json
{
  "title":"One or more validation errors occurred.",
  "status":400,
  "errors":{"Name":["The Name field is required."]},
  "traceId":"<trace-id>"
}
```

Field keys can use C# casing, nested paths, or Identity error codes. Authorization
middleware may return 401/403 with **no body**. Login failures typically return
ProblemDetails with detail but no errors. Unexpected failures hide exception details;
500 responses do not expose service errors. Registration's custom handler can include
`errors: null` on 500. Normalize both errors forms and fall back to title/detail/status.

Important conflict/error codes (not a complete promise that every error has a code):

| Code | Meaning |
| --- | --- |
| `Booking.InsufficientAvailability` | Requested stock is unavailable |
| `Booking.EventStarted` | Booking window closed at event start |
| `Booking.CancellationClosed` | Fewer than 24 hours remain |
| `Booking.InvalidItem` | Cancellation item is not in this booking |
| `Booking.InvalidCancellationQuantity` | Target exceeds original or decreases cancellation |
| `Booking.RetryRequired` | Recognized competing database update |
| `Booking.MixedEvents` | Categories do not belong to one requested event |
| `Event.Forbidden` | Caller cannot manage this event |
| `Event.HasBookingHistory` | History prevents deletion/rescheduling/venue change |
| `Event.CapacityAllocated` | New event capacity is below category allocations |
| `Event.VenueCapacityConflict` | Peak capacity of simultaneous events exceeds the venue limit |
| `Venue.CapacityBelowOverlappingEvents` | New venue capacity is below its simultaneous event peak |
| `Event.RetryRequired` | Event moved while the update was acquiring venue locks |
| `Event.ExceedsVenueCapacity` | Event capacity exceeds venue capacity (400) |
| `Venue.CapacityBelowEvent` | New venue capacity is below an event capacity |
| `TicketCategory.HasBookingHistory` | History prevents deletion/movement |
| `TicketCategory.CapacityBooked` | Category capacity is below active reservations |
| `TicketCategory.ExceedsEventCapacity` | Combined category allocation exceeds event capacity |

## Frontend request examples

A minimal fetch helper which handles empty bodies, JSON errors, and network errors
without silently retrying mutations:

```ts
const API_BASE = "https://localhost:7209";

class ApiRequestError extends Error {
  constructor(public status: number, public body: unknown) {
    super(`API request failed (${status})`);
  }
}

async function api<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body != null) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const text = await response.text();
  let body: unknown = undefined;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!response.ok) throw new ApiRequestError(response.status, body);
  return body as T; // Use api<void> for empty success bodies.
}
```

Network/TLS/CORS failures reject fetch without an HTTP status; present a connection
message separately from API validation errors. This helper assumes JSON request
bodies; do not use it unchanged for FormData/uploads (no upload API exists).

Example calls using the companion types:

```ts
import type { Tokens, CurrentUser, Page, Event, Booking } from "./frontend-api";

const tokens = await api<Tokens>("/api/auth/login?useCookies=false", {
  method: "POST", body: JSON.stringify({ email, password })
});
const me = await api<CurrentUser>("/api/auth/me", {}, tokens.accessToken);
const query = new URLSearchParams({ search: "music", pageNumber: "1", pageSize: "10" });
const events = await api<Page<Event>>(`/api/events?${query}`);
const booking = await api<Booking>("/api/bookings", {
  method: "POST", body: JSON.stringify({ eventId: 1, items: [{ ticketCategoryId: 1, quantity: 2 }] })
}, tokens.accessToken);
await api<Booking>(`/api/bookings/${booking.id}/cancel`, {
  method: "POST", body: JSON.stringify({})
}, tokens.accessToken);
```

The example assumes email/password are form variables. Use AbortController.signal
for abandoned reads/searches. Do not treat an aborted mutation as proof the server
rolled back; inspect own booking history if the outcome is uncertain.

For event date strings lacking a timezone suffix:

```ts
function eventDate(value: string): Date {
  return new Date(/(?:Z|[+-]\d{2}:\d{2})$/i.test(value) ? value : `${value}Z`);
}
```

Server monetary fields are authoritative. Use Intl.NumberFormat for display and avoid
recalculating booking totals from today's category prices.

## Other mapped Identity endpoints

These routes are mapped by the framework in addition to register/login/refresh/me.
They are listed for completeness, not a claim that a complete email/2FA frontend
workflow has been configured. No production email sender is registered; the custom
registration flow does not send confirmation links. Email confirmation/reset needs
additional backend delivery setup before exposing those screens.

| Method | Path | Access | Request | Success / expected failures |
| --- | --- | --- | --- | --- |
| GET | `/api/auth/confirmEmail` | Public | Query `userId`, `code`; optional `changedEmail` | 200 text; invalid confirmation 401 |
| POST | `/api/auth/resendConfirmationEmail` | Public | `{ "email": "..." }` | 200 empty, including unknown user |
| POST | `/api/auth/forgotPassword` | Public | `{ "email": "..." }` | 200 empty; delivery requires confirmed account |
| POST | `/api/auth/resetPassword` | Public | `{ "email": "...", "resetCode": "...", "newPassword": "..." }` | 200 empty; invalid code/password 400 |
| GET | `/api/auth/manage/info` | Authenticated | None | 200 `{email,isEmailConfirmed}`; missing account 404 |
| POST | `/api/auth/manage/info` | Authenticated | Optional `newEmail`, `newPassword`, `oldPassword` | 200 `{email,isEmailConfirmed}`; validation 400 |
| POST | `/api/auth/manage/2fa` | Authenticated | See below | 200 TwoFactorResponse; validation 400 |

For changing password via manage/info, send newPassword and oldPassword. newEmail
requires the email-change confirmation flow. These routes do not edit first/last name.

2FA request fields: optional nullable `enable`, optional `twoFactorCode`, booleans
`resetSharedKey`, `resetRecoveryCodes`, `forgetMachine` (default false). Response:
`sharedKey`, `recoveryCodesLeft`, `isTwoFactorEnabled`, `isMachineRemembered`, and
optional/null `recoveryCodes`. Even `{}` can initialize an authenticator key. Enabling
2FA requires a valid authenticator code; resetSharedKey disables it until re-enabled.
Treat keys/recovery codes as secrets. Missing accounts can return 404. End-to-end
2FA/email UX was not verified as part of the frontend documentation work.

Framework route behavior was cross-checked with local .NET 10 reference XML,
exported OpenAPI, and the [ASP.NET Core Identity endpoint source](https://github.com/dotnet/aspnetcore/blob/v10.0.0/src/Identity/Core/src/IdentityApiEndpointRouteBuilderExtensions.cs).
The current app overrides registration; its custom contract above takes precedence.

## Current limitations

- Generated OpenAPI currently underdeclares some actual success/error status codes
  and does not fully describe role/ownership restrictions. The endpoint tables here
  reflect controller/service behavior; do not infer authorization from a 200-only schema.
  The overridden registration handler also lacks an inferred request body in generated
  OpenAPI; use the four-field registration contract in this guide.
- Venue responses omit capacity; event responses omit organizerId and offer no
  organizer-specific event list. These require API additions for full edit/dashboards.
- Manager event-booking history has no customer-identifying fields or search.
- No image/media upload, event classification, publish lifecycle, seat assignment,
  payment, refunds, holds, issued tickets/QR, booking-create idempotency, custom logout,
  or account listing/editing/role management endpoint is implemented.
- There is no frontend profile-name edit endpoint. Built-in manage/info is email/password only.
- There is no enforced API maximum length on many write strings; do not infer write
  limits from search filters or assume database/schema limits are client validation.
- A 201 is confirmation, not successful payment. Availability can change between
  displaying it and submitting a booking. Refetch after a stock conflict/cancellation.
- The API can return date strings without UTC suffix and very large numeric monetary
  values; handle the date/precision caveats above explicitly.

Verification for this guide: checked custom controllers, DTOs, service guards,
serialization, middleware, and the actual mapped OpenAPI contract. No account,
booking, application schema, or application configuration was changed for documentation.
