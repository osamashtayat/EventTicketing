# ENCORE — verified API contract

Reviewed 2026-10-27. This is an implementation blueprint, not a runtime certification. All application endpoints below were checked against local documentation, controllers, DTOs and service implementations. The original analysis started no API process or tests. During frontend implementation, current source was rechecked and live public empty-result reads were verified in Mac Chrome; see VERIFICATION.md. No migrations or real writes were performed.

## Evidence and precedence

Backend root: `/Users/asus/EventTicketingApi`. The supplied nested directory is the HTTP project; contracts and implementations also live in sibling projects. The inspected working tree contains substantial uncommitted additions, including authentication and bookings. HEAD `45ac28bb8bfe435f83c18e094396d9f5c3d2606e` alone does **not** reproduce the inspected contract.

Primary evidence, paths relative to that root:

| Evidence | What it establishes |
| --- | --- |
| `docs/FRONTEND_API.md`, `docs/frontend-api.ts` | Current frontend handoff, wire fields, documented framework routes and known limitations |
| `EventTicketingApi/Controllers/{Countries,Venues,Events,TicketCategories,Bookings,Auth,Accounts}Controller.cs` | Application routes, HTTP methods, success bodies, controller authorization |
| `EventTicketingApi.Application/DTOs/` | Exact request/read/query types, nullability, DataAnnotations |
| `EventTicketingApi.Infrastructure/Services/` | Query behavior, validation, booking/cancellation semantics and history guards |
| `EventTicketingApi.Infrastructure/Identity/EventAccess.cs` | Admin override and organizer ownership checks |
| `EventTicketingApi/Identity/IdentityEndpointExtensions.cs`, `Program.cs` | Framework Identity registration plus custom registration replacement; opaque bearer configuration |
| `EventTicketingApi/Configuration/FrontendCors.cs`, `Properties/launchSettings.json` | CORS policy and local listeners |
| `EventTicketingApi/Controllers/BaseApiController.cs`, `ExceptionHandling/GlobalExceptionHandler.cs` | ProblemDetails variants and safe unexpected errors |
| `docs/BOOKING_DESIGN.md`, implemented section of `docs/BUSINESS_RULES.md` | Accepted immediate booking / USD / 24-hour cancellation baseline |
| `EventTicketingApi.IntegrationTests/{BookingTests,FrontendTests}.cs` | Existing test coverage inspected; historical pass claims were not rerun |

Use current source and the frontend handoff over historical roadmap checkboxes. `docs/ARCHITECTURE.md` retains an initial scaffold description; parts of README and BUSINESS_RULES describe superseded “no bookings”, unspecified currency, pending holds, and cancellation proposals. Those are not current functionality. Source documents provide evidence, not authorization to implement their future phases.

## Connection and common behavior

- Development browser origin: `http://localhost:5173` (also allowed: `http://localhost:3000`). Final API origin: `https://localhost:7209`; HTTP listener `http://localhost:5066` redirects toward HTTPS. Trust the local development certificate before browser verification.
- Proposed frontend variable: `VITE_API_BASE_URL=https://localhost:7209`, with endpoint paths including `/api`. This is public configuration, never a secret. Production origin is unknown; deployment must configure the API's `Cors:AllowedOrigins` for the exact frontend scheme/host/port. No trailing slash or wildcard. CORS exposes `Location`, allows Authorization, and does not enable credentialed cross-origin cookies.
- Camel-case JSON, direct DTO success bodies, integer business IDs, opaque string user IDs. Send JSON Content-Type only for JSON bodies. PUT includes the full write body and matching `id`. No PATCH.
- Read empty success bodies safely: 204 deletes, 204 country update, 200 registration, and 201 account creation. Most resource creation returns a DTO and Location; account creation has neither body nor Location.
- Send event timestamps as UTC ISO strings. The documented meaning of suffixless event `DateTime` responses is UTC; append `Z` only when a suffix is absent. Do not apply that repair indiscriminately to other timestamp types. Booking DateTimeOffset timestamps have an offset. No venue timezone exists.
- Monetary values are JSON numbers in USD; the full range exceeds exact JavaScript number precision. See the explicit decoding decision in ARCHITECTURE.md; frontend decimal strings are an internal representation, not a change to the wire contract.

## Capability matrix

Names below are the actual C# application DTO names. `PagedResult<T>` is the common page envelope. “Any authenticated” includes User, EventOrganizer and Admin; no inherited User role is necessary. “Owner/Admin” means Admin or the EventOrganizer owning the affected event. All requests can also fail for transport/server reasons.

### Countries

| Endpoint | HTTP method | Request DTO / query | Response DTO / success | Access | Supported UI action |
| --- | --- | --- | --- | --- | --- |
| `/api/countries` | GET | `CountryQuery` | 200 `PagedResult<CountrySummaryDto>` | Public | Search/page country choices and directory |
| `/api/countries/{id}` | GET | Integer path id | 200 `GetCountryDto` | Public | Country detail including embedded venues |
| `/api/countries/by-name` | GET | Required `name` query | 200 `GetCountryDto` | Public | Exact name lookup; not autocomplete search |
| `/api/countries` | POST | `CreateCountryDto` | 201 `GetCountryDto` + Location | Admin | Create country |
| `/api/countries/{id}` | PUT | `UpdateCountryDto` | 204 empty | Admin | Save country changes; refetch |
| `/api/countries/{id}` | DELETE | No body | 204 empty | Admin | Delete unused country |

### Venues

| Endpoint | HTTP method | Request DTO / query | Response DTO / success | Access | Supported UI action |
| --- | --- | --- | --- | --- | --- |
| `/api/venues` | GET | `VenueQuery` | 200 `PagedResult<VenueSummaryDto>` | Public | Search/filter/page venues |
| `/api/venues/{id}` | GET | Integer path id | 200 `VenueSummaryDto` | Public | Venue name, city, country and address |
| `/api/venues` | POST | `CreateVenueDto` | 201 `VenueSummaryDto` + Location | Admin | Create venue, including entered capacity |
| `/api/venues/{id}` | PUT | `UpdateVenueDto` | 200 `VenueSummaryDto` | Admin | Update API exists; complete editor deferred because read capacity is absent |
| `/api/venues/{id}` | DELETE | No body | 204 empty | Admin | Delete venue with no events |

### Events

| Endpoint | HTTP method | Request DTO / query | Response DTO / success | Access | Supported UI action |
| --- | --- | --- | --- | --- | --- |
| `/api/events` | GET | `EventQuery` | 200 `PagedResult<EventDto>` | Public | Discovery with text/location/start-date filters |
| `/api/events/{id}` | GET | Integer path id | 200 `EventDto` | Public | Event detail |
| `/api/events/{id}/availability` | GET | Positive path id | 200 `CategoryAvailabilityDto[]`, unpaged raw array | Public | Ticket choice, price and advisory remaining stock |
| `/api/events/{id}/bookings` | GET | `EventBookingQuery` | 200 `PagedResult<BookingDto>` | Owner/Admin | Read event booking history; no customer identity or cancellation authority |
| `/api/events` | POST | `CreateEventDto` | 201 `EventDto` + Location | EventOrganizer/Admin | Create event; caller becomes owner |
| `/api/events/{id}` | PUT | `UpdateEventDto` | 200 `EventDto` | Owner/Admin | Edit allowed fields, subject to history/allocation guards |
| `/api/events/{id}` | DELETE | No body | 204 empty | Owner/Admin | Delete only without categories/history |

### Ticket categories

| Endpoint | HTTP method | Request DTO / query | Response DTO / success | Access | Supported UI action |
| --- | --- | --- | --- | --- | --- |
| `/api/ticket-categories` | GET | `TicketCategoryQuery` | 200 `PagedResult<TicketCategoryDto>` | Public | Page category descriptions / management records for an event |
| `/api/ticket-categories/{id}` | GET | Integer path id | 200 `TicketCategoryDto` | Public | Category detail |
| `/api/ticket-categories` | POST | `CreateTicketCategoryDto` | 201 `TicketCategoryDto` + Location | Owner/Admin | Allocate event inventory and price |
| `/api/ticket-categories/{id}` | PUT | `UpdateTicketCategoryDto` | 200 `TicketCategoryDto` | Owner/Admin | Edit category; moving requires access to both events |
| `/api/ticket-categories/{id}` | DELETE | No body | 204 empty | Owner/Admin | Remove category without any booking history |

Ticket categories are ticket tiers such as VIP; they are **not** an event classification such as music or sport.

### Bookings

| Endpoint | HTTP method | Request DTO / query | Response DTO / success | Access | Supported UI action |
| --- | --- | --- | --- | --- | --- |
| `/api/bookings` | POST | `CreateBookingDto` | 201 `BookingDto` + Location | Any authenticated, self only | Immediately confirm one event's selected tickets |
| `/api/bookings/mine` | GET | `BookingQuery` | 200 `PagedResult<BookingDto>` | Any authenticated, self only | Personal booking history |
| `/api/bookings/{id}` | GET | Integer path id | 200 `BookingDto` | Booking customer only | Personal booking detail |
| `/api/bookings/{id}/cancel` | POST | `CancelBookingDto` (JSON body required) | 200 `BookingDto` | Booking customer only | Full or cumulative partial cancellation |

No global `GET /api/bookings`, booking PUT/DELETE, or separate confirm endpoint exists. Other customers' booking details/cancellations return 404 even to Admin. Event history is a distinct authorized view.

### Authentication and accounts

| Endpoint | HTTP method | Request DTO / query | Response DTO / success | Access | Supported UI action |
| --- | --- | --- | --- | --- | --- |
| `/api/auth/register` | POST | Custom `RegisterDto` | 200 empty | Public | Register User; then sign in separately |
| `/api/auth/login?useCookies=false` | POST | Framework `LoginRequest` | 200 `AccessTokenResponse` (handoff alias `Tokens`) | Public | Sign in with opaque bearer tokens |
| `/api/auth/refresh` | POST | Framework `RefreshRequest` | 200 `AccessTokenResponse` | Refresh token in body | Replace local access/refresh pair |
| `/api/auth/me` | GET | No body | 200 `CurrentUserDto`; no-store | Authenticated | Read identity and roles |
| `/api/accounts` | POST | `CreateAccountDto` | 201 empty | Admin | Create a new organizer or admin account |

Current roles: `User`, `EventOrganizer`, `Admin`, case sensitive. Registration always assigns User; do not submit a role. Admin account creation accepts only EventOrganizer or Admin and does not promote an existing account. No custom logout/revoke endpoint. Logout clears the browser session but does not revoke already-issued server tokens.

Tokens are opaque: never decode as JWT or infer permissions from them. Use `expiresIn` seconds and `/me`. Coordinate one refresh request per session; replace both returned tokens. A failed refresh 401 ends the session. Do not auto-replay booking creation after refreshing. 403 is a permissions response, not a refresh trigger. After role changes, new sign-in/refresh is needed for token claims; `/me` reads database roles and can differ from stale claims. A missing account can produce 404 from `/me`.

## Exact DTO field catalogue

This notation describes JSON fields, not a proposed alternate API. `?` means a property may be omitted in a request; `| null` means null is allowed. Responses below contain their listed fields. Decimal means a JSON numeric decimal token, not a JSON string. CLR integer ranges apply; positive IDs/capacities are at most 2,147,483,647.

| DTO | Fields |
| --- | --- |
| `CreateCountryDto` | `name: string`, `shortName: string` |
| `UpdateCountryDto` | Create fields + `id: integer` |
| `CountrySummaryDto` | `id: integer`, `name: string`, `shortName: string` |
| `GetCountryDto` | Country summary fields + `venues: VenueSummaryDto[]` |
| `CreateVenueDto` | `name: string`, `city: string`, `countryId: integer`, `capacity: integer`, `address?: string` (default empty) |
| `UpdateVenueDto` | Create fields + `id: integer` |
| `VenueSummaryDto` | `id: integer`, `name: string`, `city: string`, `countryId: integer`, `address: string | null`; **no capacity** |
| `CreateEventDto` | `name: string`, `description?: string | null`, `startDate: timestamp`, `endDate: timestamp`, `capacity: integer`, `venueId: integer` |
| `UpdateEventDto` | Create fields + `id: integer` |
| `EventDto` | `id: integer`, `name: string`, `description: string | null`, `startDate: timestamp`, `endDate: timestamp`, `capacity: integer`, `venueId: integer`; **no organizerId** |
| `CreateTicketCategoryDto` | `name: string`, `description?: string | null`, `price: decimal`, `capacity: integer`, `eventId: integer` |
| `UpdateTicketCategoryDto` | Create fields + `id: integer` |
| `TicketCategoryDto` | `id: integer`, `name: string`, `description: string | null`, `price: decimal`, `capacity: integer`, `eventId: integer` |
| `CategoryAvailabilityDto` | `ticketCategoryId: integer`, `name: string`, `price: decimal`, `currency: "USD"`, `capacity: integer`, `bookedQuantity: integer`, `availableQuantity: integer` |
| `CreateBookingItemDto` | `ticketCategoryId: integer`, `quantity: integer` |
| `CreateBookingDto` | `eventId: integer`, `items: CreateBookingItemDto[]` |
| `CancelBookingItemDto` | `bookingItemId: integer`, `cancelledQuantity: integer` |
| `CancelBookingDto` | `items?: CancelBookingItemDto[] | null` |
| `BookingItemDto` | `id`, `ticketCategoryId`, `quantity`, `cancelledQuantity`, `remainingQuantity` (integers); `categoryName: string`; `unitPrice`, `originalAmount`, `cancelledAmount`, `remainingAmount` (decimals) |
| `BookingDto` | `id: integer`, `eventId: integer`, `status: 0 | 1 | 2`, `currency: "USD"`, `totalAmount: decimal`, `createdAtUtc: timestamp`, `cancelledAtUtc: timestamp | null`, `items: BookingItemDto[]`, `cancelledAmount: decimal`, `remainingAmount: decimal` |
| `RegisterDto` | `email: string`, `password: string`, `firstName: string`, `lastName: string` |
| `CreateAccountDto` | Registration fields + `role: "EventOrganizer" | "Admin"` |
| `LoginRequest` | `email: string`, `password: string`, `twoFactorCode?: string`, `twoFactorRecoveryCode?: string` |
| `RefreshRequest` | `refreshToken: string` |
| `AccessTokenResponse` | `tokenType: string`, `accessToken: string`, `expiresIn: integer` (seconds), `refreshToken: string` |
| `CurrentUserDto` | `id: string`, `email: string | null`, `firstName: string`, `lastName: string`, `roles: string[]` (currently the three roles above; unknown roles grant no frontend privilege) |

Status mapping: 0 Confirmed, 1 PartiallyCancelled, 2 Cancelled. There is no Pending, Expired, Paid or Refunded. Historical categoryName/unitPrice and original quantities are snapshots. `totalAmount` stays original after cancellation; cancelled/remaining amounts are separate server values. Fully cancelled only: cancelledAtUtc is populated. Booking responses omit customerId and event name/location; read related event/venue resources if needed.

The backend's `docs/frontend-api.ts` is a useful hand-maintained wire reference. Do not copy it wholesale into a second competing contract file. Extract only the DTOs needed by the current milestone, keep ownership by feature, and explicitly distinguish numeric wire money from exact frontend money. `CurrentUserDto` is string[] in source; tolerate unknown future role strings safely.

## Paging and filtering

All six paged lists accept `pageNumber` default 1, minimum 1, and `pageSize` default 10, range 1–100. `(pageNumber - 1) * pageSize` must fit a signed 32-bit integer. Invalid values return 400; no server clamping. Envelope:

```text
PagedResult<T> = { items: T[], totalCount: integer, pageNumber: integer,
  pageSize: integer, totalPages: integer, hasNextPage: boolean, hasPreviousPage: boolean }
```

Zero results means totalPages 0. Out-of-range pages return empty items, not 404. `hasPreviousPage` follows pageNumber > 1 even on an empty out-of-range page. Count and items are separate reads; concurrent writes may change them between requests.

| Query DTO | Additional parameters | Fixed ordering |
| --- | --- | --- |
| `CountryQuery` | `search` in name/shortName | name, id ascending |
| `VenueQuery` | `search` in name/address; `countryId`; exact `city` | name, id ascending |
| `EventQuery` | `search` in name/description; `venueId`; `countryId`; exact `city`; inclusive `startFrom`, `startTo` on startDate | startDate, id ascending |
| `TicketCategoryQuery` | `eventId`; `search` in name/description; inclusive `minPrice`, `maxPrice` | name, id ascending |
| `BookingQuery` | `eventId`; `status` | createdAtUtc, id descending |
| `EventBookingQuery` | `status`; event ID is in path | createdAtUtc, id descending |

Search/city maximum 200 characters; values are trimmed; SQL collation decides case sensitivity. All supplied filters AND together. Optional ID filters positive; no matches is an empty page. Date lower bound must not exceed upper bound. Price bounds are nonnegative and at most 9999999999999999.99, lower <= upper. Price-filter DTOs do not add the write service's two-decimal validation. Numeric status 0/1/2 or enum names accepted in query; frontend uses numbers consistently. Omit unset values, preserve zero prices/status, encode with URLSearchParams. No sorting parameter, genre filter, event price filter, geospatial query, or published-only filter.

## Validation and business behavior

| Resource | Rules and expected failures |
| --- | --- |
| Countries | Required name/shortName. Exact name duplicate 409; missing 404; delete with venues 409. No enforced ISO shortName format. by-name empty/whitespace 400. Nested venues are unpaged; use venues list for directory. |
| Venues | Required name/city, positive capacity/countryId. Missing country/venue 404; duplicate name 409; lowering capacity below **any single** event capacity 409; delete with events 409. Do not sum capacities of different events. |
| Events | Required name, positive capacity/venueId, nondefault start/end and end > start. Missing venue/event 404; capacity > venue capacity 400. Name duplicates allowed. CRUD permits past dates, but booking closes at start. Reducing below category allocations 409; delete with categories 409. Any booking history blocks deletion and date/venue changes 409, including fully cancelled history. Name/description and valid capacity changes remain available. |
| Categories | Required name, positive capacity/eventId, price 0–9999999999999999.99 with <=2 fractional digits. Free valid; repeated names valid. Sum allocations <= event capacity (409); capacity >= active booked quantity (409). History blocks delete and moving event (409). Price/name edits do not rewrite past bookings. Missing event/category 404; forbidden event 403. Concurrent move can return 409 `TicketCategory.RetryRequired`. |
| Register/accounts | All registration fields required; valid email. Default Identity password: >=6 characters plus uppercase, lowercase, digit, non-alphanumeric. Server authoritative; don't copy reference's min-8 rule as backend policy. Duplicate/invalid password 400. Registration does not log in or send confirmation. |

Most write strings lack an API maximum-length rule. Do not invent one from query limits or database column assumptions. Client helpers are feedback, not authority for capacity, ownership, timing or inventory. There are no ETags/version fields for conditional updates; do not promise conflict-free concurrent editors.

### Booking creation

Submit only eventId and category/quantity items. Items: 1–20 entries, distinct category IDs, each quantity 1–20, total quantity <=20. All categories belong to one requested event. Customer, prices, totals, currency and status come from the server. At `now >= startDate`, 409 `Booking.EventStarted`. Insufficient stock 409; mixed events 400; missing event/category 404. All inventory claims and booking creation commit together or roll back.

```json
{"eventId":12,"items":[{"ticketCategoryId":5,"quantity":2}]}
```

There is no creation idempotency key. A timeout, abort, connection loss, or generic 500 may leave an unknown outcome. Disable duplicate submission; do not automatically retry or replay. Offer own-history reconciliation filtered by event. A matching booking is evidence to inspect, not proof of a particular request; an absent row is not definitive while the original request may still finish. Preserve the uncertainty and require an explicit new user decision before any resubmission. Recognized SQL deadlocks return 409 `Booking.RetryRequired`; after refresh/review the user can retry deliberately.

### Full and partial cancellation

Full: `POST /api/bookings/{id}/cancel` with `{}`. Omitted or null items cancels all remaining items; an empty array is invalid. Partial example:

```json
{"items":[{"bookingItemId":20,"cancelledQuantity":2}]}
```

This requests a **cumulative total of two cancelled tickets** for booking item 20. If already cancelled=1, it releases one more. Do not use ticketCategoryId. IDs distinct, 1–20 items when supplied, targets 0–20 and between each item's already-cancelled and original quantities. Unlisted items unchanged. Lower targets return 400, not reinstatement. New cancellations require `now <= startDate - 24 hours`; equality allowed. Within 24 hours returns 409 `Booking.CancellationClosed`. No-change replays return current state even after cutoff. Cancellation releases inventory once; it does not issue a refund.

## Errors: normalize without discarding meaning

Service ProblemDetails example:

```json
{"title":"Operation conflicts with existing data","status":409,"traceId":"example-trace","errors":[{"code":"Booking.InsufficientAvailability","description":"Not enough tickets are available.","isNone":false}]}
```

Controller/Identity validation example:

```json
{"title":"One or more validation errors occurred.","status":400,"errors":{"Name":["The Name field is required."]}}
```

`errors` may be array, field dictionary, null, empty or missing. Middleware 401/403 may have no body. Login 401 often has detail. `traceId`, type/detail/instance vary. 500 hides exception details and may omit errors. `isNone` may be ignored.

Frontend error union: transport, http, contract; retain HTTP status, traceId, business code/description list, field map and safe fallback message. Parse from unknown; preserve nested field keys such as `Items[0].Quantity`. Feature forms explicitly map CLR names and known codes to fields; unknown keys stay in the form summary. Do not lowercase whole nested paths heuristically or render raw HTML/error body.

| Status | UI response |
| --- | --- |
| 400 | Field/form errors; retain input |
| 401 | Auth coordinator may refresh for safe reads once; otherwise sign-in prompt; no booking replay |
| 403 | Permission message; no automatic refresh; do not claim organizer ownership |
| 404 | Missing/inaccessible resource; own booking ownership deliberately concealed |
| 409 | Explain conflict and refresh affected state; never silently reduce selected quantity |
| 500 | Generic message + traceId when provided; mutation outcome can be unknown |
| No HTTP status | Connection problem; cannot reliably distinguish TLS/CORS/offline in browser code |

Important codes: `Booking.InsufficientAvailability`, `Booking.EventStarted`, `Booking.CancellationClosed`, `Booking.InvalidItem`, `Booking.InvalidCancellationQuantity`, `Booking.MixedEvents`, `Booking.RetryRequired`, `Event.Forbidden`, `Event.HasBookingHistory`, `Event.CapacityAllocated`, `Event.ExceedsVenueCapacity`, `Venue.CapacityBelowEvent`, `TicketCategory.HasBookingHistory`, `TicketCategory.CapacityBooked`, `TicketCategory.ExceedsEventCapacity`. Empty service error arrays are valid: status/message fallback is required.

## Framework routes present but deferred from the initial UI

These are documented and mapped through MapIdentityApi, not custom application workflows independently exercised in this phase. Exact live behavior must be rechecked against the running .NET version before adding screens. There is no production email sender configured, and custom registration sends no confirmation email.

| Method/path | Request | Response / access | UI decision |
| --- | --- | --- | --- |
| GET `/api/auth/confirmEmail` | Query userId, code, optional changedEmail | 200 text; public, invalid confirmation 401 | Defer email workflow |
| POST `/api/auth/resendConfirmationEmail` | `{email}` | 200 empty, public | Defer email workflow |
| POST `/api/auth/forgotPassword` | `{email}` | 200 empty, public; delivery requires confirmed account | Do not promise working reset email |
| POST `/api/auth/resetPassword` | `{email,resetCode,newPassword}` | 200 empty; public, invalid input 400 | Defer until delivery verified |
| GET `/api/auth/manage/info` | None | 200 `{email,isEmailConfirmed}`; authenticated | Optional later account settings |
| POST `/api/auth/manage/info` | Optional newEmail/newPassword/oldPassword | 200 same shape; authenticated; validation 400 | Password change possible; email change needs confirmation flow |
| POST `/api/auth/manage/2fa` | Optional nullable enable, optional twoFactorCode; booleans resetSharedKey/resetRecoveryCodes/forgetMachine default false | 200 `{sharedKey,recoveryCodesLeft,recoveryCodes?,isTwoFactorEnabled,isMachineRemembered}`; authenticated; recoveryCodes nullable | Defer setup/recovery UI; even `{}` can initialize a key |

Login can accept an existing account's 2FA/recovery code without adding 2FA enrollment. Never expose shared keys/recovery codes in ordinary logs. None of these routes edits first/last name.

## Gaps, decisions and verification gates

| Gap / uncertainty | Impact | Chosen frontend behavior |
| --- | --- | --- |
| Venue read capacity omitted | Reliable edit prefill impossible after reload; event form cannot know upper capacity | Ship read/create/delete; defer complete venue edit. Server validates event capacity. Never derive venue capacity from events. |
| No organizerId / permission field / organizer filter | Cannot identify all owned events from public list | Admin management supported; organizer creation and explicit event-ID workspace supported with server permission errors. No “My events” list or inferred ownership. |
| No event media, genre, tags, popularity or featured data | Premium discovery cannot use those as real filters/content | Typography and abstract decorative art; text/date/location discovery only |
| No price range on event list, no batch joins | “From price”/stock per card would require extra reads | Omit price/stock from listing cards; show real availability/prices in detail |
| No payment/refund, seats, QR, hold/expiry | Cannot build checkout, seat map, ticket scan or hold timer | “Confirm booking”, category quantity selection, booking reference; explain no payment processed |
| No create idempotency or request-status lookup | Cannot conclusively reconcile every lost response | Unknown-outcome state and history review; no automatic replay |
| No customer fields in manager booking history | Cannot show attendee names/emails | Booking ID, quantities, state and monetary snapshots only |
| No account directory, role promotion, profile-name edit | Incomplete account administration | Create organizer/admin form and read-only profile only |
| No publish/draft/archive/event cancellation | All event reads public, no release workflow | Explain creation is public; no misleading status controls |
| No server logout/revocation, cookie CORS or persistent-session design | Browser logout is local; durable sign-in needs separate decision | In-memory session, sign-in after reload |
| Suffixless event UTC, no venue timezone | Event local timezone cannot be inferred from city | Normalize documented UTC and label viewer-local/UTC display |
| Numeric decimal range beyond JS exact cents | Native JSON numeric parsing can corrupt amounts | Exact monetary codec before displaying/submitting money; see ARCHITECTURE.md |
| OpenAPI underdeclares responses/auth and custom registration body | Generated client alone may be wrong | Use verified matrix + source; reconcile live OpenAPI during implementation |
| Database migration/runtime state not verified here | Source capability may not be available on the running instance | Runtime smoke gate in milestone 2; never apply migrations to an unknown/shared database |

Backend enhancements are requests for later work, not routes or DTO fields the frontend may assume. Public browsing and personal bookings can ship without the venue/organizer enhancements. Full operational management remains explicitly partial until those contracts improve.
