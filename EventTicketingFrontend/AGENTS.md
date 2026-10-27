# ENCORE — instructions for frontend coding agents

## Scope and source of truth

ENCORE is an event-discovery and immediate-booking frontend for the existing ASP.NET Core API. This folder now contains the implemented frontend and its architecture documents. Read IMPLEMENTATION_STATUS.md and VERIFICATION.md for completed slices and verification limits. Implement only the work authorized by the user; documentation-only tasks must not install dependencies, scaffold application code or change backend sources.

Read [ARCHITECTURE.md](ARCHITECTURE.md), the relevant operation in [API_CONTRACT.md](API_CONTRACT.md), and the current milestone in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Use [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md) for presentation. Keep these files and `.agents/skills/` at the frontend root. In the shared repository, the backend projects and documentation live in the parent directory (`../EventTicketingApi`, `../EventTicketingApi.Application`, `../EventTicketingApi.Infrastructure` and `../docs`). The original backend inspection used `/Users/asus/EventTicketingApi`; use the current repository checkout for further work. The reference `/Users/asus/Desktop/the-wild-oasis` is evidence of useful patterns, not a source to overwrite or copy wholesale.

The backend working tree includes uncommitted implemented capabilities. Historical roadmap/scaffold prose is not an API contract. Verify the current documentation and source before adding an operation; do not invent an endpoint or silently add backend functionality to finish a frontend screen.

## Stack and boundaries

- React, strict TypeScript, Vite, Tailwind CSS, TanStack Query, Zustand and React Router. Resolve compatible versions and commit a lockfile during authorized implementation. Additional packages must solve a demonstrated problem; approved recommendations and rationale are in ARCHITECTURE.md.
- App pages compose features. Feature API modules own HTTP paths/DTO decoding; Query hooks own caching and mutations. Shared UI is domain-neutral. Pages own navigation; components own presentation/local interaction.
- No sibling-feature runtime imports, shared-to-feature imports, or feature-to-app imports. Public feature exports define composition boundaries. The two allowed type-only dependencies and pure shared query-key registry are described in ARCHITECTURE.md.
- Start with flat api/types/queries/mutations files inside each feature. Split when needed, never create empty layers, generic CRUD factories or repository abstractions.

## Contract invariants

- Use only confirmed methods/fields and full PUT DTOs with route/body ID equality. Handle empty success bodies, paged lists and unpaged availability distinctly.
- Authentication is opaque bearer, not JWT. `/me` owns role information. Credential vault is memory-only; never cache/persist tokens/passwords or put them in keys/logs/URLs. Session replacement clears private Query data and guards late responses.
- Booking creation has no idempotency. Never automatically retry/replay it, queue it offline, or treat an abort as rollback. Implement unknown-outcome recovery.
- Cancellation uses bookingItemId and cumulative cancelledQuantity; `{}` means full, `[]` is invalid. Server controls stock, prices, ownership and the inclusive 24-hour cutoff.
- Read venue capacity and organizer ownership are unavailable. Do not fabricate them. Confirmed booking does not mean paid; no payment, refund, QR, media upload, genre or seat-map functionality exists.
- Normalize documented suffixless event timestamps as UTC. Preserve exact numeric monetary tokens at the JSON boundary using the selected codec; frontend MoneyAmount strings must serialize back as JSON numbers for category writes.

## State, reuse and typing

- Query owns every server resource/profile, fetching state and mutation cache effect. URL owns shareable filters/page. Local form state stays local. Zustand persists only the actual shared time-display preference; no server mirrors/global basket.
- Reuse one owner for time, money, HTTP errors, query keys and feature operations. Extract repeated code when its responsibility/reason to change is the same. Similar screens with different rules can stay separate.
- Enable strict typing, noUncheckedIndexedAccess and exactOptionalPropertyTypes. Do not use `any`, unchecked response assertions or non-null assertions to bypass uncertain data. Parse unknown external data; validate required fields, preserve nullability, and tolerate additive fields.
- Separate form values, decoded read DTOs and write bodies. Use explicit conversions, positive integer route parsing and pure feature validation. Do not submit `Partial<ReadDto>` as PUT.
- Components use PascalCase; hooks use `use` names only for React behavior. Pure functions do not become hooks. Export named operations; avoid index barrels that create hidden cycles. Keep each mutation's invalidation in its hook; navigation/reset stays with caller.

## Styling and testing

- Tailwind semantic tokens come from one CSS source. Domain-specific cards/forms remain in their features. Prefer native controls and semantic tables; use the chosen accessible dialog primitive.
- Every screen handles loading, empty, error, background refresh and permission states. Preserve form input on failure. Label controls and timezones; keyboard focus, reduced motion, contrast and small screens are acceptance criteria.
- Run typecheck, lint, build and tests appropriate to the change. Test behavior at contract/state boundaries: errors, empty bodies, money/date precision, query serialization, private cache isolation, booking no-retry and cumulative cancellation. Avoid tests that merely repeat labels or implementation details.
- Browser-verify the affected journey. Mock tests cannot establish CORS, real bearer auth or SQL inventory guarantees. Distinguish passed mocked/live checks and anything unavailable. Never apply database changes or run writes against an unknown/shared database.
- Complete one independently verifiable milestone before expanding scope. Update documentation when an authorized decision changes; report concrete changes, verification and remaining limitations.

## Focused workflows

- [frontend-architecture](.agents/skills/frontend-architecture/SKILL.md): implement a feature within these boundaries.
- [api-integration](.agents/skills/api-integration/SKILL.md): verify an operation and its typed boundary.
- [frontend-quality-review](.agents/skills/frontend-quality-review/SKILL.md): review actual behavior, duplication and maintainability.

Skills support authorized work; their existence does not authorize installations, backend changes, deployment or database mutations.
