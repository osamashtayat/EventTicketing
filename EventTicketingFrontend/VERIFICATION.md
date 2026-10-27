# Encore — verification record

Date: 2026-10-27 (Asia/Amman). Project: Event Ticketing Frontend.

## Automated checks

| Check | Result |
| --- | --- |
| Strict TypeScript, including unchecked-index/optional-property and unused-code checks | Passed |
| ESLint React hooks and enforced architecture/import boundaries | Passed |
| Prettier source formatting | Passed |
| Vitest unit/integration tests | 35 passed across 11 files |
| Chrome mocked browser suite against isolated production preview | 15 passed |
| Production Vite build | Passed |
| Dependency audit during lockfile update | 0 reported vulnerabilities |

Coverage includes exact numeric money round trips and maximum-price totals; canonical URL encoding including offset `+`, status=0 and zero price; empty success bodies; malformed required responses; error arrays/dictionaries/bodyless responses; event UTC/calendar validation; inclusive cancellation cutoff; bounded deadline timers; query cancellation; refresh coalescing/failure; logout during refresh/private reads; private-cache removal; no protected write replay; 20-ticket validation; cumulative cancellation targets; full PUT bodies; category movement cache invalidation; empty account creation and no retained credential variables/results; and intended semantic color contrast.

Browser fixtures exercise discovery at 320/375/768/1024/1440px, 200% CSS zoom reflow, keyboard mobile navigation, UTC persistence, route IDs, independent detail failures, sign-in/reload isolation, quantity preservation through the sign-in dialog, double-click single submission, unknown outcomes (including a sold-out refresh), server snapshot confirmation, partial/full cancellation/history, admin 204 and 409 handling, organizer workspace access and exact price writes, and empty account creation.

Captured [desktop](artifacts/discovery-desktop.png) and [mobile](artifacts/discovery-mobile.png) layouts are explicitly **mocked test fixtures**, not events claimed to exist in the live API. Both layouts were visually inspected. A development-server regression run encountered page reloads during form entry; the final suite uses a separate production preview without hot reload and all 15 tests passed.

## Live Mac browser verification

The initial connection attempt failed before the API was available. After the user confirmed it was running, inspected the existing Chrome Scalar API reference and made a fresh read-only request to:

`https://localhost:7209/api/events?pageSize=1`

Chrome displayed:

```json
{"items":[],"totalCount":0,"pageNumber":1,"pageSize":1,"totalPages":0,"hasNextPage":false,"hasPreviousPage":false}
```

Opened `http://localhost:5173/events` in that Mac Chrome profile. The Encore title/header/footer rendered, public requests decoded successfully, and discovery showed “Nothing here just yet.” / “0 results”. Expanded country/venue choices also completed without connection errors. This establishes a live public browser → HTTPS API → decoded empty-result journey from the configured frontend origin. No certificate bypass or proxy was used.

## Review fixes

- Kept uncertain booking outcomes visible even if an inventory refetch becomes sold out.
- Disabled quantity changes during availability review and invalidated old reviews after a session change.
- Prevented expired deadline timers from looping; strict invalid calendar dates and incompatible wire money strings now fail at the boundary.
- Restored dialog focus and moved focus to async page headings.
- Suppressed stale private mutation error effects after account replacement.
- Moved category management interaction into its owning feature and shared actual password validation rules.
- Added strict boundary linting and removed unused category detail code. All source was formatted.

## Remaining limits

Live authentication, refresh claims, nonempty event/availability decoding, management writes, booking/cancellation, and SQL inventory/concurrency guarantees were not exercised. The live catalogue is empty; no approved test credentials or disposable database fixture were supplied. Mock tests do not certify these backend behaviors.

Venue editing and a complete organizer-owned event list remain intentionally deferred for missing API read fields. Production SPA routing/CORS requires configuration for the selected host. No backend files, database state or deployed site were changed.
