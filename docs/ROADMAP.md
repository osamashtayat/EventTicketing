# Development roadmap

This is an adjustable learning plan, not a commitment to implement all features.
Checked items describe existing artifacts only. Complete one small task at a time;
move a checkbox only after its completion criteria have been verified.

## Preparation

- [x] Create API, Application, Domain, and Common projects with agreed references.
- [x] Provide project context, architecture proposals, business rules, and agent skills.
- [ ] Agree initial Venue/Event fields, capacity invariants, key strategy, and date/money conventions.

Complete when the developer can explain the boundaries and has a reviewed model
sketch. Current next task: design a Venue with a name, location, and positive capacity.

## Phase 1 — Core foundation

### 1.1 Domain and persistence foundation

- [ ] Implement Venue, then Event and TicketCategory in small reviewed steps.
- [ ] Agree persistence placement before installing EF Core/SQL Server dependencies.
- [ ] Configure a local development database and secret-based connection configuration.
- [ ] Add explicit EF mappings and review the first migration.
- [ ] Add xUnit coverage for the first meaningful domain rules.

Complete when relationships and constraints are explained, the migration can create
a fresh local schema, the solution builds, and positive/invalid capacity cases pass.

### 1.2 Venue and event CRUD

- [ ] Choose controllers or minimal APIs for the first endpoint.
- [ ] Implement one vertical slice, beginning with venue creation and retrieval.
- [ ] Add event CRUD and ticket-category management incrementally.
- [ ] Use DTOs, validation, explicit mapping, appropriate HTTP responses, and basic error handling.
- [ ] Add focused service and HTTP integration tests as behavior is introduced.

Complete when valid operations work, missing resources and invalid input produce
documented responses, entities are not exposed directly, and tests cover those
paths. Treat anonymous write endpoints as a local learning stage until Phase 2.

### 1.3 Discovery

Implemented baseline before accounts/authentication: reusable Application
`PagedResult<T>` and PageQuery plus resource-specific queries for countries, venues,
and events. Filters run before SQL count/paging, with page-size bounds and stable
ordering. SQL Server/HTTP checks passed; richer sort/classification filters remain
future work.

- [x] Add text/location filters and stable pagination for current list endpoints.
- [ ] Add event classification filtering after a classification model is agreed.
- [x] Define deterministic sorting, page-size bounds, and empty-result behavior.

Complete when combined filters and page boundaries are verified, query execution
is bounded, and request/response examples describe the actual API.

## Phase 2 — Authentication and bookings

### 2.1 Accounts and authorization

- [ ] Introduce Identity and JWT with safe configuration and credential handling.
- [ ] Implement registration/sign-in and Administrator, Event Organizer, Customer roles.
- [ ] Enforce resource ownership as well as role checks on existing write operations.
- [ ] Test unauthenticated, forbidden, owner, and authorized administrator cases.

Complete when customers cannot grant themselves privileged roles or access another
customer's bookings and organizers cannot manage another organizer's events.

### 2.2 Booking baseline

- [ ] Agree booking transitions, cancellation policy, and inventory accounting.
- [ ] Implement booking creation, cancellation, availability, and customer history.
- [ ] Make booking/inventory writes atomic and protect against concurrent overselling.
- [ ] Test insufficient capacity, repeated cancellation, rollback, and competing requests.

Complete when inventory never goes below zero or exceeds capacity, cancellation
releases inventory at most once, and SQL Server tests demonstrate transaction and
concurrency behavior. Baseline correctness belongs here even though deeper study
of transactions and concurrency continues in Phase 3.

## Phase 3 — Advanced backend engineering

### 3.1 Temporary reservations and expiration

- [ ] Agree hold duration and confirmation/expiration boundary behavior.
- [ ] Add expiring Pending holds, confirmation, and background cleanup.
- [ ] Make expiration/retry processing safe and add appropriate request idempotency.

Complete when confirmation racing expiration has one valid outcome, expired holds
do not consume sellable inventory indefinitely, and retries do not duplicate bookings
or release inventory twice. Verify using a controllable clock and database integration tests.

### 3.2 Reliability

- [ ] Expand unit/integration coverage and add CI once the repository workflow is ready.
- [ ] Improve exception handling, structured logging, and operational diagnostics.

Baseline now implemented: central HTTP exception handling and console error logging
with trace IDs, plus service-result logging. Further logging sinks, background-job handling, and operational
monitoring remain future work; this does not complete the reliability milestone.
- [ ] Review transaction boundaries and failure recovery under concurrent load.

Complete when failures produce useful responses/logs without secrets, automated
checks run reproducibly, and key booking failure scenarios are documented and tested.

## Phase 4 — Optional production-oriented work

Each item requires a separate scoped design and implementation decision.

- [ ] QR tickets: define issuance, uniqueness, and duplicate-scan behavior; test verification.
- [ ] Email: define delivery triggers and safe retries; verify with a local/test provider.
- [ ] Payments: use a provider sandbox, verified callbacks, reconciliation, and idempotency;
  verify failure/refund paths before any live use.
- [ ] Docker/deployment: reproducible startup, externalized secrets, documented migration
  process, and deployed smoke verification.
- [ ] Reporting/admin UI: agree authorized users and metrics before adding endpoints.
- [ ] Optional React frontend: agree API contracts and verify an end-to-end user flow.

Do not mark the project production-ready merely because these checkboxes are complete;
readiness requires a separate assessment of the actual deployment and requirements.
