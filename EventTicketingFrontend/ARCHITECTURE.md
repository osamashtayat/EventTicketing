# Encore frontend architecture

Encore is a React/TypeScript SPA backed by the Event Ticketing ASP.NET Core API.
The [API reference](../docs/FRONTEND_API.md) is the current backend contract; the
[verification record](VERIFICATION.md) distinguishes mocked checks from live evidence.

## Module boundaries

```text
src/
  app/          route composition, providers, layout, and cross-feature pages
  features/     feature-owned API/types/queries/mutations/components
  components/   domain-neutral UI primitives
  lib/          HTTP/JSON codecs, credential coordination, query infrastructure
  stores/       shared display preferences
  utils/        time, money, and form-value helpers
```

Feature folders include events, venues, countries, ticket-categories, auth, bookings,
and accounts. Pages compose multiple features through public.ts exports. Feature API
modules own endpoint paths and decoders; query hooks own caching and mutations.
Shared modules do not import feature or application components. ESLint enforces
these boundaries. Keep small features flat rather than introducing empty layers or
generic CRUD/repository factories.

## State ownership

| State | Owner |
| --- | --- |
| Server resources/profile and fetching state | TanStack Query |
| Shareable search/filter/page state | URL parameters |
| Form values and local ticket selection | React Hook Form/component state |
| Local/UTC time-display preference | Zustand |
| Access/refresh credentials | Memory-only session vault |

Do not mirror server records or credentials into global persisted stores. Login,
logout, refresh, and account replacement share one credential coordinator. Private
query keys include the session generation; logout/account switch removes private
cache data and late responses cannot update a different session.

## API and runtime contracts

All external JSON is decoded from unknown through feature-owned codecs. Types preserve
required/optional/null fields and tolerate additive fields. PUT uses explicit full
write DTOs plus route/body ID equality, not Partial<ReadDto>. Empty success responses,
paged resources, raw availability arrays, and error variants have distinct handling.

Authentication uses opaque bearer tokens, not JWT decoding. /api/auth/me supplies
profile/roles. Backend permissions remain authoritative. Booking creation is never
automatically retried or replayed on refresh/network failure because it lacks an
idempotency key; uncertain outcomes lead to a history/reconciliation flow.

The backend now exposes venue capacity, event organizerId, and /api/events/mine.
Current frontend decoders/screens still need the changes in the
[contract adoption handoff](../docs/FRONTEND_HANDOFF.md). Do not infer missing read data
or treat backend availability as proof that a screen has been implemented.

## Time and money

Normalize documented suffixless event timestamps as UTC. Event calendar-only writes
use an inclusive end day that becomes an exclusive midnight instant in responses;
exact ISO timestamps preserve their supplied times. Avoid extending an event when
round-tripping its end through an editor.

The shared lossless JSON codec preserves monetary numeric tokens before conversion.
Decoded money uses validated decimal strings and bigint cents for calculations.
Category writes emit exact JSON numeric values, not strings. Booking displays use
server snapshots rather than current category prices.

## Query and mutation behavior

Use canonical filter values for URL parameters, query keys, and requests. Propagate
AbortSignal for abandoned reads. Keep mutation invalidation in its feature hook;
pages own navigation and form resets. Preserve session-generation guards on asynchronous
callbacks. Do not introduce another QueryClient, refresh loop, or server-data cache.

Mutation retries are disabled. A successful create remains successful if a subsequent
refetch fails. Error states preserve form input and distinguish HTTP conflicts from
network, contract, authentication, and uncertain-outcome errors.

## Presentation and access

Semantic tokens are defined in one CSS source. Shared primitives handle consistent
focus, feedback, dialogs, and controls; domain forms/cards remain in their features.
Every screen handles loading, empty, failure, background refresh, and permissions.
Date inputs/deadlines identify their timezone. Keyboard operation, reduced motion,
contrast, and small-screen layout are acceptance criteria.

Role gates wait for current-user information. Event management uses Admin or matching
organizer ownership once the new response contract is adopted. Customer booking
controls never grant managers cancellation rights over other customers' tickets.

## Verification

Run typecheck, architecture/hooks lint, unit/integration tests, production build,
format checks, and the affected browser journeys. Tests cover transport/error shapes,
exact money, time boundaries, cache isolation, no-retry mutations, and cancellation
payloads. Mocked browser tests cannot establish real Identity or SQL concurrency.
Record live verification separately; never use production bookings as test fixtures.
