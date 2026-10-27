# Product roadmap

Implemented behavior is described in the [API reference](FRONTEND_API.md) and
[business rules](BUSINESS_RULES.md). This roadmap separates shipped backend capabilities,
remaining frontend integration, and future product scope.

## Implemented

- [x] ASP.NET Core API with Application, Domain, Infrastructure, and Common boundaries.
- [x] SQL Server persistence, explicit EF mappings, and versioned migrations.
- [x] Country, venue, event, and ticket-category CRUD with validation and error responses.
- [x] Public discovery filters, bounded pagination, and deterministic ordering.
- [x] Identity registration/login/refresh, roles, admin account creation, and current-user profile.
- [x] Organizer ownership checks and protected event-wide booking history.
- [x] Immediate USD bookings, historical price/name snapshots, personal history, and availability.
- [x] Full/partial cancellation at least 24 hours before start with inventory release.
- [x] Transactional inventory protection, concurrent-request tests, and retained booking history.
- [x] Peak simultaneous venue-capacity checks, including rescheduling and venue reductions.
- [x] Same-day calendar event inputs and exact ISO timestamp support.
- [x] Venue capacity/event owner response fields and an authenticated owned-event listing.
- [x] Central exception handling, structured outcome logging, trace IDs, and explicit CORS.
- [x] React/TypeScript discovery, auth, customer booking/cancellation, and management workspaces.
- [x] Backend xUnit coverage; frontend unit/browser verification recorded separately.

## Next delivery

- [ ] Adopt expanded venue/event contracts in frontend runtime decoders and fixtures.
- [ ] Enable admin venue editing with actual capacity prefilled from the API.
- [ ] Add organizer My events and ownership-aware workspace controls.
- [ ] Verify the complete authenticated browser-to-API booking/cancellation journey
  against an isolated local fixture, beyond mocked frontend browser checks.
- [ ] Add booking-create idempotency for safe client retries and uncertain outcomes.
- [ ] Add CI with reproducible frontend checks and SQL Server integration tests.

The concrete frontend changes and acceptance criteria are in the
[frontend integration handoff](FRONTEND_HANDOFF.md).

## Product extensions

- [ ] Temporary ticket holds, explicit expiry, and background cleanup.
- [ ] Sandbox payment integration with verified callbacks and reconciliation.
- [ ] Ticket issuance, QR check-in, and duplicate-scan protection.
- [ ] Email delivery for account/booking workflows, including retries.
- [ ] Event classification and a defined publication/cancellation lifecycle.
- [ ] Account/profile administration beyond current account creation.
- [ ] Deployment configuration, production SPA routing/CORS, and persistent diagnostics.

Assigned seats, refund policy, organizer event cancellation, and production operating
requirements need explicit designs before implementation. Passing current tests is
not a production-readiness certification.
