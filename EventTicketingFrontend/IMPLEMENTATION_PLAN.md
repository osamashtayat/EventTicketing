# ENCORE — implementation handoff

The ten frontend implementation slices have been implemented in this selected workspace. See IMPLEMENTATION_STATUS.md for milestone checks and VERIFICATION.md for release gates that still need live fixtures. The ordered plan below remains the acceptance checklist; implementation does not imply all live release checks passed. Backend and reference sources remain unchanged.

Deliver one verified milestone at a time. Install dependencies only when implementation is authorized. At each milestone record changed modules, verified behavior, remaining gaps and actual commands/results. A compiled screen is not evidence of API integration.

## Milestone 1 — minimal foundation

Dependencies: architecture review by the implementing session; no API required.

- Create Vite React/TypeScript project, strict tsconfig (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Tailwind integration, lint/typecheck/build/test scripts and lockfile. Resolve compatible stable versions; use the official docs linked in ARCHITECTURE.md.
- Create main, app/App, providers/config/router stubs, one stylesheet entry and semantic tokens. Add required libraries as needed, not a copied reference dependency list. No empty feature folders.
- Establish shared test setup and import-boundary lint rules. Keep real credentials out of fixtures/environment. `.env.example` contains only public API origin.

Acceptance: one minimal page renders, build/typecheck/lint pass, invalid environment shows an actionable configuration error. Route reload works in local preview. Verification: basic render smoke, public configuration validation; no snapshots of trivial boilerplate.

## Milestone 2 — API boundary and connection gate

Depends on 1. Operations: public `GET /api/countries`, `GET /api/events`, `GET /api/events/{id}/availability` against an already-running approved local API when available; no writes required.

- Create lib/api client/errors/query-params/json-codec/types, lib/query client/keys, utils/date-time/money. Introduce feature types/decoders only for these reads. Port verified fields from API_CONTRACT, not a generated unreviewed SDK.
- Implement empty-body handling, unknown-body decoding, ProblemDetails variants, query omission/zero preservation and AbortSignal support. Exact money decoding must happen before native numeric conversion.
- Confirm final HTTPS base URL, trusted certificate, allowed frontend origin and the instance's response shapes. Inspect its OpenAPI if available, recording discrepancies rather than overwriting known controller behavior. Do not apply migrations to make a smoke check pass; report runtime setup separately.

Acceptance: paged responses and raw availability arrays are distinct, decimal max price remains exact, suffixless event UTC parses correctly, and transport/HTTP/contract errors remain distinguishable.

Verification: fixtures for 200 JSON, 200/201/204 empty, malformed success, 400 array/dictionary/null errors, bodyless 401/403, 409, safe 500 and network failure. Round-trip exact JSON numeric money including max price ×20, 25.50 and zero. Test encoded `+` offset, search spaces, status=0, empty filters and cancellation of obsolete reads. Report live smoke as passed, failed or unavailable separately from mock tests.

## Milestone 3 — shell, UI primitives and public discovery

Depends on 2. Operations: events list; paged country/venue lookup reads.

- Create public app layout, Header/navigation, Button/Field/Alert/Pagination/Skeleton primitives; initialize the real local/UTC preference control and its Zustand store.
- Add countries/venues/events read APIs, query options, public exports and filters. EventDiscoveryPage composes filters and EventCard. Use canonical URL state; search submit, filter reset and bounded paged selectors.
- No images, stock, minimum price, genre or popularity fields on discovery cards. Optional venue enrichment deduplicates IDs for this page only.

Acceptance: URL reload/back restores filters and page; country changes clear incompatible venue; page-size 10 default; 0 results differs from an out-of-range page. Time preference updates all displayed event dates and survives reload without storing server data.

Verification: MSW page/filter tests, encoded queries, rapid filter changes, stale result handling, failed venue enrichment. Browser at 375/768/1440px, keyboard navigation, focus visibility and actual color contrast. Corrupt/unavailable preference storage falls back cleanly.

## Milestone 4 — event details and directories

Depends on 3. Operations: event detail, availability, venue detail, country detail; venues filtered by country; events filtered by venue.

- Create app EventDetailsPage, VenueDetailsPage and country-detail composition, feature display components and availability read UI. Treat unknown route IDs before requesting.
- Add directory routes, section-level retry states and default abstract decorative event art. Build quantity selection as local UI with no submission yet; don't show an enabled nonfunctional confirm action.

Acceptance: real schedule, location, description and exact ticket prices display; missing optional values are readable. Sold out, no categories, started event and availability error are different states. Directory collections page rather than relying on unbounded embedded venues.

Verification: invalid/missing ID, suffixless UTC, offset/DST display, blank description/address, zero-price tier, no categories and stock zero. Check event remains visible if venue/availability fails. Test no per-card availability fan-out.

## Milestone 5 — sign-in, registration and session isolation

Depends on 2–4. Operations: register, login with `useCookies=false`, refresh, `/me`.

- Create auth API/forms/queries/public exports, in-memory session vault, app/session coordinator, auth route gates, read-only profile and sign-in dialog. Add the focused dialog dependency now.
- Registration uses firstName/lastName/email/password; success is empty and goes to sign-in. `/me` supplies roles; no JWT decode. Accept optional existing-account 2FA/recovery input if needed; no enrollment/reset-email promises.
- Coordinate refresh, safe-read retry once, local logout, session generation and cache cleanup. Login/refresh tokens and password variables must not be retained in Query/devtools or persisted storage.

Acceptance: every authenticated role can proceed toward booking; local reload requires sign-in; logout/account switch clears private data and suppresses old callbacks. Role gates wait for `/me`; unsafe return URLs rejected.

Verification: bad credentials, duplicate register, password rules, nullable email/empty names, unknown role, bodyless 401, simultaneous expired reads with one refresh, failed refresh, logout during refresh and user switch during a private request. Live local login/CORS smoke uses approved test credentials without logging them; it is not replaced by a mocked token.

## Milestone 6 — create a booking and recover uncertain outcomes

Depends on 4–5. Operations: POST bookings, GET mine, GET own detail, public availability.

- Create bookings types/API/queries/mutations and BookingForm/Summary; add app BookingDetailsPage and MyBookingsPage. Keep the form local while the app sign-in dialog is open.
- Submit eventId + distinct category quantities only; total <=20. Refresh availability before review, surface changed stock/price, then send once. Show server snapshots on confirmation. Put invalidation in the mutation hook, navigation in the page.
- Add explicit unknown-outcome recovery and own-history review. Do not infer that a timeout, client abort or missing history row means the booking failed. No automatic retry, offline queue or POST replay following refresh.

Acceptance: one deliberate click yields one POST; 201 leads to the returned booking ID; price totals are never replaced with current category prices. Confirmation persists even if the follow-up inventory refetch fails. Cached private pages cannot cross sessions.

Verification: total 20 allowed /21 rejected, duplicate/mixed-category cases, insufficient inventory 409, event started, empty/malformed 201, transport loss after server commit, double click, 401, logout while mutation completes. Assert POST count, payload omission of customer/prices, and exact monetary display. Live create/history check only in an approved disposable development fixture; no production booking.

## Milestone 7 — cancellation

Depends on 6. Operations: POST own booking cancel, GET own detail/event/availability/history.

- Create CancelBookingForm, pure cumulative-target builder and cancel mutation. Full sends `{}`, partial sends bookingItemId plus cumulative target. UI may ask for additional quantity, but DTO conversion must be explicit.
- Show original/cancelled/remaining quantities and amounts, deadline with timezone, conflict recovery and retained history. Managers never receive cancel controls for others' bookings.

Acceptance: cancelling one more after one already cancelled sends target two; repeating the same target does not visually double-release; all cancelled maps to status 2; no refund messaging.

Verification: exact 24h equality and just-inside cutoff, no-change replay after cutoff, empty array rejection, foreign item, target decrease/stale tab, cancelledAtUtc only for full cancel. E2E create → partial cancel → full cancel → check updated own history and refreshed availability. Backend SQL race guarantees remain backend tests, not frontend mock claims.

## Milestone 8 — country and venue administration

Depends on 3–5. Operations: country CRUD; venue list/detail/create/delete.

- Add Admin gate, management shell, CountryForm shared fields with explicit POST/PUT adapters, VenueCreateForm and deletion confirmation.
- Preserve full-body PUT rules and country-update 204 behavior. Invalidate country by-name/detail caches as well as lists when names or nested venues change.
- Keep complete venue edit deferred: no capacity response means no reliable prefill. Do not use remembered create values as authoritative read data after reload.

Acceptance: Admin writes work; ordinary user/organizer denied; duplicate names and country/venue delete guards visible. An empty 204 is successful.

Verification: role paths, missing country, has-venues/has-events 409, exact request body fields and relevant cache effects. Verify no invented capacity is displayed and no route exposes an unfinished editor.

## Milestone 9 — event/category workspace and event history

Depends on 7–8. Operations: event/category CRUD, category list, availability, protected event booking history.

- Add event form, category form, workspace composition and read-only event history. Admin can manage the paged catalogue; organizer can create and open a known event ID. Use existing protected history read to establish access for an explicit workspace, not to scan ownership across the catalogue.
- Use UTC-labeled editor input and exact numeric-price serializer. Respect full DTOs, history restrictions and destination ownership on category moves. No fictional “my events” endpoint, publish toggle or attendees directory.

Acceptance: valid create/edit/category allocation works; unrelated organizer gets a clear 403. Manager history paginates and filters status without customer PII or cancellation authority. Any missing ownership read-model remains documented.

Verification: event capacity >venue 400, category over-allocation/capacity-below-booked 409, history delete/reschedule/move guard, category move invalidates old and new availability, exact max monetary serialization. Preserve original booking snapshots after category price/name edits. Recheck all auth failures against API behavior.

## Milestone 10 — account creation and release review

Depends on 8–9. Operation: POST accounts, 201 empty; no account listing.

- Add admin-only new organizer/admin form with explicit role union and temporary password input. Never persist/display password after success. No promotion, user list or profile edit controls.
- Run the focused frontend-quality-review skill; remove real duplication discovered during implementation. Refine narrow/mobile layouts, error recovery, loading states, labels, focus handling and reduced motion.
- Configure production SPA fallback and public API origin/CORS together when deployment is authorized. Do not imply deployment occurred as part of this plan.

Acceptance: typecheck/lint/build and meaningful unit/integration/browser suites pass. Public discovery → sign-in → booking → cancellation works against an approved real local backend. Known gaps remain visible in release notes and are not hidden behind fake data.

Verification: keyboard and 200% zoom, 320–1440px layouts, slower network, API unavailable, session replacement, no raw credentials in logs/storage, no unexpected POST retries. Review route requests against API_CONTRACT; report mock vs live checks separately. Small account 201 and validation tests suffice; don't create redundant snapshots for all form labels.

## Deferred improvements and stopping rules

Backend proposals, not frontend prerequisites: venue capacity in read DTO, owner-aware event list/permission metadata, idempotency for creation, explicit monetary strings, guaranteed offset event timestamps, batch event summaries, production email delivery. Any enhancement needs its own approved backend work and updated contract before dependent UI.

Do not implement a fake full venue editor or owned-event dashboard. Do not silently add payments/media/QR/seats or scrape data to simulate absent API fields. If an endpoint deviates at runtime, record evidence and adapt the affected milestone while continuing independent work. A production-readiness claim requires actual deployment/runtime assessment beyond this architecture phase.

## Phase 1 verification record

- Inspected backend documentation, current custom controllers, DTOs, services, authorization/CORS/session registration and existing integration-test source.
- Inspected reference routes, pages, services, feature hooks/forms, shared interaction components, utilities and styles; no app execution or Supabase calls.
- Cross-checked library decisions with official documentation; no packages installed.
- Documentation validation passed: eight requested Markdown files, all relative links resolved, balanced code fences, and all three skills have valid YAML/name/description frontmatter. The bundled Python skill validator could not run because PyYAML is unavailable; the installed Ruby YAML parser independently validated the frontmatter and naming, with no dependency installation.
- SHA-256 comparison of 228 existing source/document files found no changes to either supplied project. Application tests were intentionally not run for documentation-only work; their existing pass counts are not new verification evidence.
