# Verification record

## Map startup repair

Production logs showed repeated HTTP 404 responses for `/_next/static/chunks/maplibre-gl-worker.mjs`, including the user request at 2026-09-18T12:55:52.660Z. MapLibre's automatic relative worker path did not survive bundling. The map now sets its worker URL to Vite's emitted `?worker&url` asset, which bundles the shared runtime. Loading, error and timeout states keep failures visible. The production artifact regression check verifies the referenced worker exists and has no missing shared-module reference. TypeScript and production build pass. Rendered browser checks remain blocked by unavailable supervised preview infrastructure; they are not claimed as passed.

- Data-domain tests: 14 passed.
- TypeScript: passed with final data-baseline additions.
- Production Worker/client build: passed with final data-baseline additions.
- SQLite schema: applied in memory; duplicate raw payload deduplicated; revised hash retained.
- Liander annual aggregation: 1,614 same-prefix aggregates plus 665 mixed-prefix records exactly reproduce source electricity sum.
- Preview: unavailable environment service, confirmed by start and status. No alternate browser path attempted.
- Browser interaction, mobile viewport, visual screenshot comparison and WebMCP execution: not run.

## Visual comparison ledger

Concept selected: generated desktop atlas layout, white surface, navy type, teal controls. Reference inspected with view_image. Latest rendered screenshot unavailable because preview infrastructure is unavailable. Copy, three-rail layout, typography, white/blue palette, geographic map treatment and mobile layout were implemented in source; none has a rendered fidelity sign-off.

Intentional changes: recorded system metrics replace illustrative dashes; Eemshaven correctly labelled coal; no operational claim for old registry records; annual postcode baseline added after verified data retrieval; unknown plant output remains blank; method and freshness are independent. Above-the-fold copy is implementation-specific and truthful about recorded snapshots. No claim of exact concept fidelity is made.

## Map container sizing repair

The user screenshot after the worker fix showed a loaded interface with an empty map panel and no loading/error overlay. Recent production error logs were empty. Source inspection found equal-specificity `.actual-map { position: absolute }` and lazily imported `.maplibregl-map { position: relative }`; the latter can collapse the empty container to zero height. Explicit inline position, inset, width and height now preserve the map panel dimensions regardless of stylesheet load order. A ResizeObserver calls map.resize() after tab visibility or responsive size changes and disconnects on unmount. Browser rendering remains unverified because the supervised preview service is unavailable.

## Infrastructure release

- Sixteen domain and infrastructure checks pass, including real GeoJSON geometry, unique source IDs, manifest counts and voltage/operator filtering.
- The map worker packaging regression remains a separate post-build check.
- TypeScript and production build checked for this release.
- Existing explicit map dimensions and ResizeObserver are retained.
- Browser QA remains unavailable through the supported preview service. New map clicks, search, mobile layout and download interaction have not received a rendered-browser sign-off.

## Demand and catalogue expansion
The recorded Demand tab now opens a published CBS annual residential choropleth, replacing unavailable current-city markers. The national timeline and annual map have separate year/unit labels. Stations includes unknown-voltage distribution objects; Generation has a station overlay and a separate historical registry selector. Asset selection never changes national observations.

TypeScript and production build checked; data invariants cover postcode-year uniqueness, missing-value preservation, unique OSM identities, null rated capacities and site/turbine distinctions. Existing national feed, high-voltage and bundled-worker regressions retained. Supervised browser preview is unavailable: visual rendering, responsive layout, pointer hit testing and download interactions are not browser-verified. The 19 MB demand GeoJSON is lazy loaded and may load slowly on constrained connections.

Final imported expansion: 3,359 wind/solar objects, including 758 solar sites; all three expansion invariant tests pass. Source retrieval scope is limited explicitly, rather than accepting incomplete timed-out responses.

## Sidebar readability revision
User screenshot showed a clipped coverage paragraph, a one-row result viewport and tiny generation-mix labels. The sidebar now has a compact layer selector, collapsible dataset/overlay controls, larger scrolling results and paged navigation through all producer/station matches. Coverage opens a keyboard-accessible drawer. Generation mix is a full-card button opening all source values and conditional percentage shares; opening it pauses timeline playback. Existing data and map selection semantics are unchanged. TypeScript/build checked. Supervised preview status still fails because its mailbox is unavailable, so desktop/mobile rendering and drawer/pagination interaction are not browser-verified.

## Public regional data and freshness release
- New tests cover real CBS GM joins, units, exclusion of unallocated/foreign areas, null vs zero, invalid dates, Amsterdam midnight, previous-day fallback, historical request isolation and complete elapsed interval selection.
- Geometry checked valid before and after coverage-preserving simplification. All 342 municipality keys matched both annual tables; all five shipped metrics have published values.
- Typecheck/build and existing domain/network/map-worker regression tests are required for this release.
- Managed preview rechecked: unavailable (`/tmp/sites-previewd/requests` mailbox missing). No unmanaged browser/server workaround used. Rendered layout and interactive browser QA therefore remain unverified in this environment.

## NED credential incorporation
- Runtime NED_API_KEY configured as a Sites secret; no key written to code, exports or browser assets.
- Direct API test was blocked by api.ned.nl Cloudflare error 1010 (HTTP 403, browser signature denied). This is not evidence of an invalid key. No bypass or identity spoofing attempted; no successful upstream data claim.
- Offshore registry selections with NED point IDs request modelled values through the server. Requests align on exact UTC interval start, preserve MW/MWh distinction and show unavailable/error states.
- Pagination follows only the official HTTPS utilizations path, rejects redirects, caps pages and preserves latest revisions per interval. Collection and destination checks have regression tests.
- Provincial generation and forecasts remain pending live response validation. Existing national Energy-Charts balance is unchanged.

## TenneT direct connection — 18 September 2026
- TENNET_API_KEY is a production server secret; existing NED secret preserved.
- Authenticated GET /publications/v1/balance-delta-high-res/latest succeeded (HTTP 200), returning 150 twelve-second intervals, 17:29:36–17:59:36 UTC. Provider response retained as a credential-free regression fixture.
- Strict informationType/unit/interval/quantity checks; nulls distinct from zero; UTC handling follows latest-endpoint specification. No summed balance inferred from potentially overlapping components.
- Balancing drawer shows aFRR, IGCC, mFRRda, PICASSO and MARI provider in/out MW fields with its own observation selector and timestamp. It never changes national generation/load or follows the historical map timeline.
- D1 atomic lease limits upstream attempts across workers to one per 60 seconds, including failures. Verified actual lease statement with SQLite: initial acquisition, rejected concurrent retry, expiry. Successes archived by content hash; failures preserve cached timestamps and show an explicit stale warning. No unattended polling or backfill endpoint.
- Targeted parser tests and TypeScript checks pass. Managed preview remains unavailable in this environment; visual QA is unverified.

## Comparison and connection diagnostics
- Municipality ranking sorts a copy, preserves numeric zero and places nulls last. CSV includes every filtered match, explicit units, quoted values and formula-safe text; null stays empty.
- Balancing chart uses UTC timestamps for horizontal position and breaks lines across nulls or absent intervals. Selected values remain available in the table; JSON download includes the source URL and retrieval timestamp.
- Direct connection checks request same-origin server routes only and download a small allowlisted report without headers, credentials or raw provider payloads. A deployed NED success is not assumed; the previous local 1010 block remains unresolved until a successful check.
- Native worker error logs reviewed: one cancelled /api/grid request; no NED failure event in the returned error sample. This does not establish NED availability.
- Eight targeted comparison/NED/TenneT tests pass; TypeScript checks pass. Managed preview remains unavailable, so rendered QA is not claimed.
