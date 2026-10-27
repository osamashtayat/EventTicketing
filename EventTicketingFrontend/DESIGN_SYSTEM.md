# ENCORE — design system and interaction specification

Implemented visual direction, 2026-10-27. Website name: Encore; project name: Event Ticketing Frontend. The design must communicate only capabilities confirmed in [API_CONTRACT.md](API_CONTRACT.md).

## Identity and hierarchy

Use a warm editorial event catalogue: midnight navigation, off-white reading surfaces, generous typography, coral actions and quiet borders. An event's name, schedule and location are the primary content. Price and available quantities become prominent on its detail page where the API supplies them. Avoid a hotel-admin aesthetic for public browsing; management uses denser controls within the same visual language.

Start with Georgia for expressive headings and the platform sans-serif stack for forms/body/navigation; this gives a usable typographic pairing without a font download or licensing assumption. Optional licensed self-hosted fonts can replace those tokens later. Use sentence case, restrained tracking and tabular numbers for booking quantities/amounts. Keep document root at the user's default font size.

## Token source

`src/styles/tokens.css` owns semantic CSS custom properties; globals.css imports Tailwind and the token definitions once. Map semantic variables into Tailwind v4 theme variables, with `@theme inline` when mapping to other CSS variables. Do not duplicate palettes in JS, component style objects and another global stylesheet. Use the official [Vite setup](https://tailwindcss.com/docs/installation/using-vite) and [theme-variable model](https://tailwindcss.com/docs/theme) for the version chosen at implementation.

| Token | Initial value | Use |
| --- | --- | --- |
| `--surface-canvas` | `#F7F4EE` | Warm page background |
| `--surface-card` | `#FFFFFF` | Reading cards and forms |
| `--surface-dark` | `#111827` | Midnight navigation/hero |
| `--text-primary` | `#20242A` | Body/headings on light surfaces |
| `--text-muted` | `#59616D` | Secondary text on light surfaces |
| `--text-inverse` | `#F7F4EE` | Text on midnight surfaces |
| `--accent` | `#F97857` | Coral primary button background, with charcoal text |
| `--accent-hover` | `#F56540` | Hover background, with charcoal text |
| `--accent-ink` | `#A73720` | Text links on off-white/white |
| `--border-subtle` | `#D7D3CB` | Decorative dividers |
| `--border-control` | `#737B87` | Input boundary on light surfaces |
| `--focus-ring` | `#1D4ED8` | Light-surface focus ring; use off-white ring on dark surfaces |
| `--success-ink` / surface | `#166534` / `#DCFCE7` | Confirmed booking |
| `--warning-ink` / surface | `#854D0E` / `#FEF3C7` | Partially cancelled / attention |
| `--danger-ink` / surface | `#B42318` / `#FEE4E2` | Errors and cancellation actions |

Coral is not the default small-text color on white, and white text is not the default on coral. Verify actual combinations at implementation: normal text >=4.5:1, large text and meaningful control boundaries >=3:1. Do not assume a named token makes every combination accessible. State badges include text, not color alone.

| Scale | Values |
| --- | --- |
| Space | 4, 8, 12, 16, 24, 32, 48, 64, 96px (rem equivalents) |
| Typography | Caption 0.875rem; body/control 1rem with 1.5 line-height; subheading 1.25–1.5rem; page heading clamp(2rem, 5vw, 4rem); event hero max 4.5rem |
| Radius | Controls 8px; cards 16px; panels 24px; pill only for badges |
| Width | Content max 1200px; reading max 68ch; form max 640px |
| Shadow | Cards use subtle border first; elevated dialog 0 16px 48px rgba(17,24,39,.18) |
| Motion | 120–180ms opacity/color; optional 2px card lift; no global transition on every element |
| Layers | Base 0, sticky header 20, menu 30, dialog overlay/content 50/51 |

Respect prefers-reduced-motion; skeletons can be static. Avoid parallax, carousels and countdown urgency. The API creates no ticket holds, so no reservation countdown may appear.

## Layouts and navigation

Public shell: keyboard skip link, ENCORE home link, Events and Venues navigation, country discovery secondary link, sign-in/account entry and time-display control. Desktop uses a concise horizontal header; mobile uses a labeled menu button with keyboard-accessible disclosure. It closes after navigation and restores focus appropriately. Use aria-current on active links.

Account pages use the same shell, with My bookings and Profile links. Role-aware Manage navigation appears after `/me` resolves. Management shell uses a compact secondary navigation; on small screens it becomes a disclosure or wrapping navigation. Never reserve a fixed wide sidebar on phones. All shells use normal document scrolling, one main landmark and one primary page heading.

At roughly 640px move from single-column forms/cards to two-column discovery; at 1024px use three cards and a two-column detail layout. Break at content needs rather than device names. Page gutters 16px small, 24px medium, 32px large. Verify 320, 375, 768, 1024 and 1440px plus 200% zoom. Tables may scroll within a labeled region, never force the whole page sideways. Touch controls target at least 44px in each dimension.

Desktop event detail places a roughly 360px booking panel alongside narrative content, sticky below the header if it fits. Mobile stacks it in reading order and may use a “Choose tickets” anchor bar that scrolls to the form; it must not cover content, errors or focused controls. No duplicate mounted booking form with separate quantities.

## Page composition and real data

### Discovery

Use a short editorial introduction, one search field, then an expandable filter row. Supported filters: country selector, venue selector, exact city text, start-date bounds and an Upcoming toggle. Country/venue selectors use paged searches with Load more; don't assume the first 100 records are complete. Changing country clears incompatible venue selection. Labels explain exact city matching and the timezone for date bounds. Search submit applies filters to the URL; clearing filters resets page 1. No genre chips, price slider, popularity sort or “featured” badges without backend data.

Cards show event name, date/time, optional description excerpt and venue label when loaded. Fetch distinct venues for the current page only, reuse per-ID caches, and avoid blocking event cards on enrichment. Display “Venue details unavailable” with a link to the event if enrichment fails; never render a raw ID as though it were a venue name. Event date ordering comes from the server. No client sorting/filtering of only the current page while presenting it as the full result set.

There is no image URL. Use deterministic abstract line/circle artwork or a quiet color field with a large date motif. It is decoration (`aria-hidden`), not a fabricated event photo. Do not reuse the reference's hotel imagery. Event title is a real link; avoid nested interactive elements inside a clickable card. No “from $…” or stock label on discovery cards without the extra availability call; the initial design omits both.

Pagination shows filtered totalCount and actual current page, previous/next based on the envelope. On out-of-range empty pages offer First page; do not display “0 of 0” when the server reports existing matches. Retain results during a same-filter page transition with a fetching indication. Back/forward restores URL filters and page.

### Event detail and booking

Show name, full schedule with timezone, venue/city/address, plain-text description with paragraphs, and category choice panel. Empty description is handled gracefully. Missing address does not become a made-up map location. No seat diagram, organizer profile or social proof is available.

Availability rows use category name, exact USD unit price, availableQuantity and a labeled quantity control. Capacity is not available stock. Zero price reads “Free” with USD context in the summary. Zero availability disables that category. If every category is unavailable, show sold out; if the raw array is empty, show “Tickets are not available for this event yet.” If the event has started, show booking closed even if availability remains positive.

Selection summary states quantities, estimated total, cancellation deadline and “No payment is processed here.” Primary action: “Confirm booking”; unauthenticated: “Sign in to book.” Show the 20-ticket combined limit and explain quantities may become unavailable. Refresh availability before final review, preserve selection, and require acknowledgment if price/stock changed. There is no price-lock/quote guarantee; final server snapshots can still differ and must be displayed accurately after creation.

Submit once and disable duplicate controls. A 201 leads to “Booking confirmed”, reference number, event link and server snapshots. Never say “Payment successful”, “Tickets emailed”, “Refund issued” or show a fabricated QR. If the response is lost, use “We could not confirm the result. Check your bookings before trying again,” with history navigation and refresh. Do not re-enable a prominent retry as though nothing could have happened.

### My bookings and cancellation

List newest first with numeric-status labels mapped to Confirmed / Partially cancelled / Cancelled, event link, date and remaining/original amount. Event-name enrichment is cached and optional; booking history remains usable if an event lookup fails. Use returned historical category names/prices, not current category records.

Booking detail shows original, cancelled and remaining quantities and amounts. Full cancellation requires a confirmation dialog naming the event/booking and affected remaining tickets. Partial cancellation can ask “How many more tickets?” in the UI, then the feature's target builder adds alreadyCancelled to obtain the API's cumulative target. Show the resulting remaining quantities before submission. Zero extra cancellation is a no-op; do not send an empty items array. Refetch the booking on stale-target 400 instead of decrementing locally.

Display an explicit deadline at start minus 24 hours, timezone included. At exactly 24 hours, cancellation remains allowed; client clock is advisory and server 409 is authoritative. A missing event time prevents claiming eligibility; offer a retry for the schedule. Cancellation changes booking records and stock, not payments. All-cancelled history remains visible. Manager history has no customer cancellation buttons.

### Directories and management

Country page: country name and shortName text (not an assumed ISO flag), then paged venues. Venue page: name, city, country, nullable address and its paged events; no capacity figure. Management country form shares create/edit fields. Venue creation includes required capacity; the complete venue editor stays absent until the response contract supplies it.

Event editor uses an explicitly labeled UTC date/time input, venue search and capacity. Server capacity errors remain visible because venue responses cannot provide the upper bound. With booking history, explain rejected rescheduling/deletion; don't invent archive or cancel-event actions. Creation is public immediately: no publish/draft switch. Category editor supports actual names, descriptions, USD prices and allocation capacity. Category movement/deletion conflicts explain historical protections.

Organizer entry offers Create event and Open event by ID. Server permission checks govern an explicit workspace; no “My events” list or ownership badge inferred from public data. Admin can manage the paged event list. Admin account form creates a new organizer/admin only; there is no user directory to populate.

## Shared components and forms

| Component | Contract / behavior |
| --- | --- |
| Button / LinkButton | Explicit button type; primary/secondary/danger variants; pending label; icon name for icon-only controls |
| Field | Explicit id, label, hint and errors; connects aria-describedby and aria-invalid; no children.props introspection |
| Input / Textarea / Select | Native semantics first, visible focus; no placeholder-only labels |
| QuantityInput | Integer keyboard input, named increment/decrement, typed empty state, bounded by real form rules |
| Dialog | Accessible title/description, trapped focus, Escape, focus restoration, background inertness; busy close behavior explicit |
| Alert / FormErrorSummary | Safe text, appropriate live announcement, links to invalid fields; error not toast-only |
| Pagination | Controlled props from page metadata; URL decisions remain with page |
| EmptyState / SectionError / Skeleton | Separate no-data/failed/loading concepts; useful next action |
| Badge / DefinitionList | Textual state and readable booking metadata |
| Table | Semantic table/caption/headers for management; no schema-driven grid engine |

EventCard, AvailabilityRows, BookingSummary and CancelBookingForm are feature components, not shared ui. Desktop/mobile filters may share field definitions but not a generic screen generator. Prefer inline confirmations and page status messages; no notification system is needed just to copy the reference.

Forms retain entered values on failure, focus the first invalid input or error summary, and allow password managers (`email`, `current-password`, `new-password` appropriately). Convert blank inputs deliberately, never with a silent Number('') => 0. Required and optional fields match the contract. Description is plain text; do not render it as HTML. Password guidance follows actual Identity defaults. Use React Hook Form for form lifecycle; pure feature validation/DTO builders remain independently testable.

## State and accessibility acceptance

Every async section must specify pending, ready, refreshing, empty, failed and permission states. Auth checks have their own pending state; no brief flash of protected content. Stock conflicts retain selections for review, not silent quantity reduction. Expired sessions preserve non-secret local input when practical, but credentials never persist across routes/storage.

Keyboard verification covers discovery filters, all form controls, dialogs, mobile navigation and pagination. Focus moves to the page heading after route navigation and meaningful completion; browser Back remains useful. Use text+icon for errors, reduced motion, sufficient contrast, 200% zoom, and no hidden focus under sticky elements. Test long event/venue names, missing descriptions/addresses, empty categories, very large exact amounts and a slow connection. Do not count an automated accessibility scan as a substitute for these interaction checks.
