# Netherlands Grid Explorer

A working vertical slice of a provenance-first Dutch electricity atlas. Real recorded national generation, load and border-flow data; an explicitly historical asset map; Liander annual postcode baselines; and a separate illustrative demand scenario.

## Run locally

Use the Node version and pnpm version declared by the project. Install with the lockfile, then `pnpm dev`. Sites-managed deployments use the preserved Vinext/Cloudflare integration. The default view works from saved public observations without any API key. Production refresh uses the managed D1 binding `DB`; without it the app explicitly falls back to the saved snapshot.

- `pnpm test` checks units, missingness, time alignment, DST, residuals, scenario segregation and registry identity.
- `pnpm typecheck` checks TypeScript.
- `pnpm build` builds the Worker and client.

The map is loaded separately from the initial UI. Country polygons and province geometry are served locally; no external tile key is required. Natural Earth, PDOK/Kadaster, Energy-Charts, WRI and Liander attribution is retained.

## Views

**Explore**: asset search and technology filters, demand baseline/scenario, five border flows, interval playback, source inspector and JSON export.

**Data sources**: current integration status, evidence and restrictions.

**Methodology**: units, temporal alignment, scope, uncertainty and demand modelling limitations.

## Data contracts

`lib/grid/domain.ts` implements deterministic transformations; `lib/grid/server.ts` handles retrieval and immutable D1 artifact storage; `lib/grid/types.ts` defines observations. Raw source JSON snapshots remain in `research/raw`. The API uses private caching and no secret reaches the client.

`GET /api/grid?date=YYYY-MM-DD` retrieves a day from Energy-Charts with 15-minute caching. It returns exact common intervals, separate source endpoints, delivery mode and warnings. A failed request returns the saved day with a visible warning, never fabricated current data. `GET /api/assets`, `/api/sources` and `/api/provenance?date=` expose the registry and lineage.

`GET /api/ned?point=28&date=2026-09-17` is an initial optional offshore adapter requiring a server-only `NED_API_KEY`. It is not credential-tested or connected to the main view. Finish account/schema/pagination validation before enabling bulk use. Do not put keys into `NEXT_PUBLIC_*` variables or commit them.

## Persistence

D1 stores immutable raw source artifacts, cache references and source checks. SQL migrations are generated from `db/schema.ts`. Repeated identical payloads deduplicate by endpoint/day/hash; revised payloads retain separate identities. Static registry/geometry snapshots are versioned in Git. There is no unattended scheduler yet: refresh occurs on user request. This is not a comprehensive PostGIS-based grid digital twin.

## Research and data preparation

Read `docs/RESEARCH.md` before expanding adapters. It corrects several assumptions from the initial build brief. `scripts/prepare-research.py` reproduces map and registry files from the checked-in downloads. `scripts/prepare-annual.py` aggregates only same-prefix Liander postcode clusters and retains ambiguous rows separately.

City and province demand is intentionally synthetic in scenario mode. Real annual postcode SJV is an expected annual-use baseline, not actual metered consumption and not a whole-city total. Historical plants may be retired or repowered. No individual plant output or domestic line flow is invented.

## Verification limitation

The build, typecheck and data tests pass. Supported browser preview infrastructure was unavailable in this session; desktop/mobile interaction and screenshot fidelity are not yet verified. See `docs/RESEARCH.md` for the remaining acceptance gates.

## Grid infrastructure and provider roadmap

Select **Grid** to explore 110–380 kV OSM line sections, cables and substation records. The independent ODbL derivative dataset and attribution are downloadable from the inspector. It is not a validated electrical network model. See `docs/DATA_ROADMAP.md` for dataset-level NED, ENTSO-E, TenneT, congestion, DSO, CBS and weather integration gates.

Choose ENTSO-E direct above the map to drive the national replay with direct load and generation mix, alongside Energy-Charts physical-border flows. Forecasts and day-ahead prices remain available in the header panel. Configure the server-only `ENTSOE_API_KEY` and redeploy; see [integration and validation notes](docs/ENTSOE.md).
