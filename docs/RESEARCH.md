# Data feasibility findings

Reviewed 18 September 2026. This file supersedes unsupported availability claims in the initial planning conversation.

## Working sources

### Energy-Charts system observations

Downloaded the OpenAPI contract and actual v2 JSON for `public_power` and `cbpf`, for 17 September and the available part of 18 September. Public generation uses MW; physical borders use GW and positive means import. A full 96-interval historical day was retrieved. Five borders were present: Belgium, Denmark, Germany, Norway and United Kingdom. Generation and flows have independent latest timestamps, so the app joins exact UTC interval starts instead of mixing the newest values from different times.

Endpoints:
- https://api.energy-charts.info/openapi.json
- https://api.energy-charts.info/v2/public_power?country=nl&start=2026-09-17
- https://api.energy-charts.info/v2/cbpf?country=nl&start=2026-09-17

The source specifies CC BY 4.0 with Energy-Charts attribution. Current OpenAPI rate guidance is normally two requests/minute per endpoint, with burst allowance and dynamic reductions; respect HTTP 429 and Retry-After. The app caches each day/endpoint for 15 minutes. No automatic retry storm or unattended poller is installed. GET retrieval persists successful immutable payloads by SHA-256 in D1. Raw provider-reported values can still contain estimates or revisions: the UI does not call every series direct measured telemetry.

Generation is the sum of nine explicitly named production series. Commercial trading, renewable percentages and load are excluded from that sum. Missing components remain null. The supply residual is descriptive; public generation and load coverage may differ, and storage is not separately observed. It cannot be interpreted as measured losses.

### Liander annual baseline

Actual file:
https://www.liander.nl/-/media/files/open-data/kleinverbruikdata/verbruiksdata-kv-2026.csv?d=20260610T123456Z&v=1

Documentation:
https://www.liander.nl/-/media/files/open-data/kleinverbruikdata/toelichting-verbruiksbestand-kleine-aansluitingen-vanaf-2025.pdf?d=20260423T111814Z&v=1

The downloaded serialization has one quoted tab-separated string per CSV row. A two-pass parser handles it. The file has 268,814 rows including gas; only 147,770 ELK rows are used. Standard annual consumption totals 12,069,705,474 kWh over 3,397,203 small electricity connections in this file. The reference date is 1 January 2026. Documentation explicitly states SJV is expected annual use based on the previous year, not actual metered consumption. It excludes the missing large-consumer layer and is not a full Dutch or city total.

The app exposes 1,614 postcode4 aggregates. A cluster with start and end in different postcode4 prefixes is held in a separate unresolved remainder (665 rows), never arbitrarily assigned to its first postcode. Prefix totals plus the remainder reproduce the file sum. These postcode values are not joined to municipality polygons yet. Attribution: Liander 2026; Liander retains IP/database rights.

### Geography and assets

PDOK returned all twelve provinces via its OGC API:
https://api.pdok.nl/kadaster/brk-bestuurlijke-gebieden/ogc/v1/collections/provinciegebied/items?f=json

Natural Earth supplies contextual country geometry under public-domain terms. Asset data comes from the WRI Global Power Plant Database v1.3.0 repository, CC BY 4.0. WRI states maintenance ended in 2022. The import retains 69 records in European Netherlands; overseas records are outside this grid scope. All old capacities, ownership and operating status are flagged as historical and unverified. This is not 69 confirmed operating plants.

Two additions were checked against operator pages: Hollandse Kust Zuid (1,529 MW on the Vattenfall factsheet) and Borssele I & II (752 MW on Ørsted's page). Their display coordinates are approximate offshore centres inferred from described areas, not surveyed points or grid-connection locations. No plant output is invented.

- https://github.com/wri/global-power-plant-database
- https://github.com/nvkelso/natural-earth-vector
- https://www.vattenfall.nl/over-vattenfall/onze-parken/onze-windparken/windpark-hollandse-kust-zuid/
- https://orsted.nl/wind-op-zee/borssele-1-en-2

## Sources with blockers or corrections

### Liander transport

https://d1tszkbk95ekzu.cloudfront.net/report_ATO-NH.csv

Downloaded 673 rows spanning 26 May through 2 June 2026. Fields are `datetime`, `realised_load [MW]`, `day_ahead_forecast [MW]`. There is no station or sub-grid ID. Absolute raw actual values reach 838,446,659 despite the MW heading. Do not silently divide by a million or invert signs: those interpretations are hypotheses, not verified semantics. This file is quarantined from balances and demand modelling. The page's general description of sub-grids is not proof of the payload's geographic granularity or freshness.

### NED

The current catalogue specifies national electricity load (type 59), while provincial geography is supported for solar and onshore wind. Parameter enums are not a Cartesian guarantee that every type exists at every geographic point. The offshore page identifies farm-level production as modelled and currently reports model substitution during an ENTSO-E interruption. `Current` is not equivalent to `Measured`. Storage enum support does not establish a public Dutch battery feed.

The guide's introductory example says timezone 1 is UTC, while its detailed table defines 0=UTC and 1=CET. The prepared offshore adapter follows the detailed definition, uses explicit UTC intervals and is marked untested with credentials. A key is required. No key was requested, created or exposed. The attempted OpenAPI JSON request returned HTTP 403.

- https://ned.nl/nl/datacatalogus
- https://ned.nl/nl/handleiding-api
- https://ned.nl/nl/dataportaal/energie-productie/elektriciteit/windenergie-op-zee

### RWE

The public page returned an application shell. The JavaScript URL referenced by that shell returned HTTP 403. This does not prove the service lacks output, but no reliable machine feed, identifiers, terms or latency were validated. No attempt was made to bypass controls. RWE output remains disconnected.

https://www.rwe-production-data.com/en/list/all/NL/

### Enexis and Stedin

Enexis currently distributes requested datasets by an email form. No request was sent. Its congestion station profile is described as an example, not live telemetry. Stedin catalogue access does not establish live local load; its files still require schema review. Direct TenneT and ENTSO-E credentials, unit feeds, KNMI weather and REMIT events remain later integrations.

## Implementation decisions

1. Use real Energy-Charts observations for the first national view.
2. Keep asset capacity separate from output and keep unknown output null.
3. Make age/delivery separate fields from method; “stale” is not an estimation method.
4. Show Liander annual postcode baselines in their own units and scope.
5. Put synthetic city/province allocations in an explicitly separate scenario. Arbitrary weights are not confidence-calibrated estimates.
6. Keep domestic power-line flows absent until suitable public measurements or a separately validated network model exist.
7. Use worker-compatible D1 for the deployed vertical slice; PostgreSQL/PostGIS remains an option for a future large ingest service. Do not pretend PostGIS was deployed.

## Verification and remaining acceptance gates

Passed: 14 domain tests, TypeScript check, production build; SQLite migration plus idempotent insert/revision check; unique registry IDs; exact postcode energy reconciliation.

Browser verification is unavailable: the supported preview service reports an unavailable mailbox, and no preview session exists. The documented preview policy prohibits inventing an alternate dev-server path. Desktop/mobile interactions, visual fidelity and WebMCP registration remain unverified. The generated design reference is a concept, not a screenshot of the implementation. No browser-test pass is claimed.

Still unmet from the original aspirational MVP: fifty currently verified operating assets, two asset-output feeds, a validated regional transport anchor, five validated municipal estimates, unattended ingest, complete DSO/topology coverage, credentialed NED/ENTSO-E integration and browser QA. They remain explicit follow-up milestones. Credentials alone will not solve missing geographical crosswalks or access restrictions.

See `research/artifacts.json` for raw artifact hashes, `research/liander-annual-profile.json` for the annual baseline audit and `lib/grid/sources.ts` for the in-app source register.

## Infrastructure and provider expansion — 18 September

The new OpenStreetMap Overpass snapshot contains 6,210 objects. After excluding 2,762 internal bays/busbars/substation wiring objects, 3,448 remain: 1,747 overhead line sections, 1,157 cable sections and 544 substation records. Only objects tagged with at least one of 110, 150, 220 or 380 kV were queried. Missing voltage tags and other voltage classes are omitted; this is not a complete network census. Substation ways/relations use bounding-box centres for display. Entire cross-border ways touching the query area are retained. Object IDs are stable OSM type/id pairs; nearby records are not automatically merged. Data, derivative GeoJSON, license and raw SHA-256 are preserved separately from other source databases. Reproduce with scripts/prepare-network.py and research/overpass-query.txt. The initial GET returned 406; the supported form-encoded POST completed successfully.

Official TenneT Balance Delta High Res OpenAPI 1.5.0 was extracted from its public specification page into research/tennet-balance-delta-openapi.json. It uses the apikey header; the latest endpoint returns a delayed 30-minute UTC window. It allows a maximum of 1 request/second and 10/minute. A catalogue and schema review is not a credentialed connection. Metered injections are described as national transmission-visible consumption, not local DSO-station telemetry.

The Netbeheer Nederland capacity site separates withdrawal/injection and TenneT/DSO/combined views. The public Esri-hosted mirror advertises weekly refreshes. Its referenced August 2023 terms limit use to Esri software and restrict redistribution, so its geometry was not downloaded or integrated into MapLibre. Official application links are provided instead. The original publisher's public application is reachable, but its data contract and reuse rights need further work. Congestion status is not line utilisation; queue quantities are not waiting durations.

See docs/DATA_ROADMAP.md for the refined product questions, provider priorities, correlation rules and acceptance gates.

## 18 September 2026: demand and station expansion

CBS Postcode4 through PDOK supplies 4,070 polygons for 2023; 4,037 have nonnegative published `gemiddeld_elektriciteitsverbruik_woning`. The 2024 sample returned -99995 (not yet published), so the app consistently uses the 2023 statistics and boundaries. This is mean annual electricity at private-dwelling connections, kWh/dwelling/year; not total local consumption, industrial consumption, self-generated electricity, or live MW. No multiplication by housing counts or allocation from national load occurs. Negative source codes stay null.

Sources: https://api.pdok.nl/cbs/postcode4/ogc/v1/collections/postcode4 ; https://www.cbs.nl/nl-nl/longread/diversen/2025/statistische-gegevens-per-vierkant-en-postcode-2022-2023-2024/4-beschrijving-cijfers ; conditions https://www.cbs.nl/nl-nl/longread/diversen/2025/statistische-gegevens-per-vierkant-en-postcode-2022-2023-2024/5-voorwaarden-en-recht-gebruik . Required attribution: © CBS, © ESRI Nederland. Original paginated payload is gzip archived; hash is of decompressed bytes. `scripts/prepare-demand.py` reproduces the derived GeoJSON; polygons are rounded to five decimal places, not topologically simplified.

The separate all-stations OSM extract contains 7,156 raw objects, with 7,151 retained in the European scope. Distribution and unclassified voltages are included. Original object IDs and source links are preserved. Polygon objects use bounding-box centres, not surveyed connection coordinates. The existing high-voltage Grid layer remains independent. Stations do not imply live load, headroom, service boundaries or validated topology. No proximity-based deduplication is performed.

Demand polygons and station points load only when needed. Browser map rendering uses WebGL point layers for the expanded catalogue; no thousands-of-DOM-markers implementation. Public Overpass is used only for build-time snapshots, never on user map movement.

Producer extract now contains 2,601 wind-turbine nodes and 758 solar-farm/site ways (3,359 objects). Wind retrieval used the publicly listed VK Maps Overpass instance; solar ways used the main Overpass instance. Queries and original payloads are retained. Broad all-plant requests timed out, so this is explicitly a wind/solar expansion, not a complete fleet. Bounding-box results are filtered by representative point against PDOK provincial polygons; relation-only solar sites, boundary-straddling sites with centres outside polygons, and offshore outside provincial geometry are excluded. Other generation remains accessible through the separate historical registry. `scripts/combine-producers.py` then `scripts/prepare-producers-stations.py` reproduce the derived database.
