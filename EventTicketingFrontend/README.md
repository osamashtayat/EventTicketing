# Event Ticketing Frontend

**Encore** is the website name. This project implements the supplied ENCORE architecture as a React and strict TypeScript SPA for the existing ASP.NET Core Event Ticketing API.

## Run locally

Requirements: Node.js 22.12 or newer (verified with Node 24) and npm. From the repository root:

```sh
cd EventTicketingFrontend
npm ci
cp .env.example .env.local
npm run dev
```

Open **http://localhost:5173/events**. The development server binds to the loopback interface. Use `localhost` in the browser because that is the API's configured CORS origin.

`.env.local` is already prepared in this working copy with the public development API origin:

```dotenv
VITE_API_BASE_URL=https://localhost:7209
```

The API must be running separately and its development HTTPS certificate trusted by the browser. The frontend does not proxy away CORS or disable certificate verification. Invalid/missing configuration shows an actionable error. No secrets belong in Vite environment variables.

## Implemented journeys

- Event discovery with URL search, country, venue, exact city, inclusive UTC date bounds, upcoming events and pagination. Paged searchable selectors load further choices on demand.
- Event details, independent venue/availability sections, exact USD prices, local/UTC time preference, country and venue directories.
- Registration, opaque bearer sign-in (including optional existing 2FA/recovery codes), coordinated refresh, read-only profile and local logout. Sessions end on reload.
- Local ticket selection, fresh availability review, explicit acknowledgement of changed price/stock, single-submit booking, uncertain-outcome reconciliation, own history and detail.
- Cumulative partial cancellation and full cancellation confirmation, historical quantities/prices, explicit timezone/deadline and retained cancelled bookings.
- Admin country CRUD and venue creation/deletion, event/category CRUD, limited organizer workspace, read-only manager history, and new organizer/admin account creation.

The API remains authoritative for ownership, timing, stock, prices and capacity. Booking confirmation does not mean payment. The application includes no payment, refund, QR, hold timer, invented media, seat map or inferred organizer ownership.

## Verification

```sh
npm run check          # strict typecheck, boundary/hooks lint, unit/integration tests, build
npm run format:check
npm run test:e2e       # isolated mocked browser journeys; uses installed Google Chrome
```

The browser suite builds the app and uses an isolated production preview on port 4173, avoiding development hot reloads while forms are being exercised. The live development browser remains on port 5173. The default browser channel is `chrome`. For a machine without Google Chrome, install Playwright Chromium and select it:

```sh
npx playwright install chromium
PLAYWRIGHT_CHANNEL=chromium npm run test:e2e
```

The browser suite intercepts API requests. Its booking/account/cancellation operations affect fixtures only. It cannot establish real bearer authentication, CORS, SQL transactions or production readiness. See [VERIFICATION.md](VERIFICATION.md) for actual results and live read-only smoke evidence, and [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for milestone records.

## Source organization

`src/app` composes routes, navigation, session coordination and cross-feature pages. Each `src/features/*` module owns its API decoders, named operations, Query hooks, validation and domain components. Shared transport, query keys, credentials, time and money have single owners. ESLint enforces feature boundaries and app imports through `public.ts`.

TanStack Query owns server data. URL parameters own shareable filters/pages. React Hook Form owns local form state. Zustand persists only the validated local/UTC display preference. Tokens and passwords never enter persistent storage or Query variables/results. Prices use `lossless-json` before numeric conversion, validated decimal strings in decoded DTOs and bigint cents for arithmetic; category writes serialize exact JSON numbers.

Use the root architecture, contract, design and milestone documents with `.agents/skills/` when extending the application. The frontend lives in `EventTicketingFrontend/`, alongside the backend projects at the repository root. The lockfile is version-controlled for reproducible installs.

## API limitations and deployment

The venue read contract omits capacity, so a complete venue editor is deferred. Organizer ownership/list metadata is absent, so organizers create events or open a known ID, with access checked through protected event history. There is no account directory, promotion workflow or profile-name editor.

The current live catalogue is empty. Full live sign-in → booking → cancellation still needs an approved test account and a confirmed disposable database with event inventory. No real writes were performed.

For a future deployment, set an HTTPS `VITE_API_BASE_URL` at build time, configure the exact frontend origin in backend CORS, and configure the chosen static host to serve `index.html` for frontend deep links. Do not rewrite API routes to the SPA. No deployment was performed.
