# Netherlands Grid Explorer — research and delivery roadmap

Updated 18 September 2026. Working product: a source-aware atlas of Dutch electricity, with complementary views of infrastructure, system observations, connection constraints and local annual demand. It is not an operational digital twin.

## Product questions

1. **Where is the infrastructure?** Search plants, mapped line sections and substations; filter by technology or voltage. Show location quality, source date and known coverage gaps.
2. **What was the national system doing?** Compare generation, load and physical exchanges within the same observation interval. Expose missingness and residuals.
3. **Where are connection constraints?** Distinguish withdrawal from injection and TSO from DSO constraints. Do not equate capacity categories with instantaneous line loading.
4. **How does demand vary geographically?** Start from published annual statistics and known service-area coverage. Show annual kWh separately from time-profile estimates.
5. **How strong is the evidence?** Every view needs provenance, geography, time coverage, units, method, freshness and revisions.

## Provider integration order

| Priority | Provider / dataset | Value to the product | Current evidence and access | Next acceptance gate |
|---|---|---|---|---|
| Connected | Energy-Charts v2 | National reported generation, load and five borders | Real payloads, MW/GW conversion, strict interval join, cached retrieval | Continuous archive and source-health view; keep raw revisions |
| Connected | OpenStreetMap | Physical infrastructure view | 3,448 mapped objects, including 544 substations; ODbL extract and source IDs | Compare named substations and major routes with permitted operator records; no automatic topology inference |
| Connected | Liander 2026 annual SJV | Local annual baselines | 1,614 PC4 groups plus unresolved cross-prefix remainder | Versioned postal boundaries, coverage reconciliation and other DSOs before municipal estimates |
| Next, credentialed | NED provincial solar/onshore and farm offshore | Regional renewable patterns and forecasts | Catalogue supports solar/onshore provinces, offshore farms; initial offshore adapter exists | Configure NED key securely; test paging, revisions, DST, units, horizon and valid point/type combinations |
| Next, credentialed | ENTSO-E direct load, generation and physical flows | Primary-source retrieval and independent reconciliation | Direct token absent; no direct adapter claim; old web guide could not be retrieved in this research pass | Confirm current API guide and EIC domains; obtain token; preserve period resolution, position gaps, Acknowledgement errors and revisions |
| Next, credentialed | TenneT Balance Delta High Res | National balancing stress and context | Official embedded OpenAPI 1.5.0 saved; `apikey` required; latest endpoint provides delayed 30-minute UTC window | Configure key securely, validate a real response, cache and respect 1 request/sec and 10/min limits; do not label this local loading |
| Next, permitted data route | Netbeheer Nederland capacity map | Regional/TSO congestion and queues | Official withdrawal/feed-in links supplied; Esri mirror terms reviewed and not suitable for the current map stack | Validate original publisher interface and reuse terms; retain area IDs, direction, effective dates and TSO/DSO scope |
| Then | CBS + Stedin + Enexis | Nationally broader local-demand coverage | Dataset-specific schemas, years and access still need verification | Establish geography-year crosswalks and sector coverage; never sum overlapping DSO and CBS totals |
| Then | KNMI | Weather context and renewable modelling | Not connected | Choose stations/grids and variable products; align hourly weather without pretending to observe local load |
| Then | REMIT / plant operators | Availability, outages and unit output | Output not connected; RWE access unresolved | License and stable unit identities, event revisions, link to EIC and plant registry; availability is not generation |

## Correlation and aggregation contracts

**Geography:** keep administrative polygons, electrical service areas, market domains, OSM geometries and plant IDs separate. A point inside a service area establishes a spatial relation only. It does not establish which substation supplies it. Use explicit crosswalk tables with method, evidence, valid-from/to and confidence. Do not silently merge nearby substations with plants.

**Time:** retain UTC interval start/end, provider publication time, retrieval time, effective validity and revision. Preserve actual 23/25-hour local days. Match observation intervals before comparing. Static infrastructure and annual baselines do not move with the national timeline.

**Measurements:** canonical power in MW, energy in MWh/kWh as appropriate. Interval energy may be calculated only from a stated average power and actual interval duration. Capacity, forecast, available capacity, generated power and annual standard consumption are distinct metric types.

**Overlap:** do not add NED, ENTSO-E and Energy-Charts generation totals. Store each as a source-specific series, select one primary per metric and display differences separately. Check whether an apparently independent source republishes the same upstream records before interpreting agreement as independent validation.

**Network:** OSM way counts are not circuit counts; station ways may overlap nodes or relations. Crossings are not necessarily junctions. A load-flow model additionally needs verified connectivity, electrical parameters, switch states, injections and boundary conditions. This app does not infer line loading from geographic linework.

**Quality:** track missing intervals, staleness, schema changes, revision churn, coverage mismatch and improbable values. Keep raw bytes and hashes. Fail closed on unknown units or schema. A manual snapshot is labelled as such; a successful catalogue lookup is not a connected feed.

## Next reviewable releases

1. **Infrastructure release (this change):** voltage-filtered Grid view, search and object inspector; separately downloadable ODbL data; official congestion links; updated provider status and this roadmap.
2. **Credentialed renewable / system release:** NED provincial/farm adapters and ENTSO-E direct series, real fixtures, source comparison view, no mixed-source double counting. TenneT balancing adapter follows its own contract.
3. **Regional evidence release:** municipal annual energy + boundaries and DSO coverage, choropleth of annual quantities, overlap and privacy handling, no live-city claim.
4. **Capacity release:** original-source constraints with direction and date, separate queues and expansion estimates. Snapshot diffs only after history exists.
5. **Operations release:** scheduled ingestion, retries with backoff, health checks, retention, revision diffs and browser regression checks when the supported preview is available.

## Credentials and decisions still needed

TenneT and NED server credentials are configured. TenneT access has been validated; NED’s local test was blocked by Cloudflare. ENTSO-E credentials remain absent. Configure secrets server-side through hosting settings; do not paste credentials into source files or browser code. No accounts, subscriptions or email requests have been created. Reuse terms and geographic interpretation remain dataset-specific even after credentials are available.

## Research references

- NED catalogue: https://ned.nl/nl/datacatalogus
- TenneT catalogue: https://developer.tennet.eu/
- TenneT exact reviewed specification: https://developer.tennet.eu/specs/v1/balance-delta-high-res
- Netbeheer Nederland map purpose: https://www.netbeheernederland.nl/netcapaciteit-en-flexibiliteit/capaciteitskaart
- Official capacity application: https://data.partnersinenergie.nl/capaciteitskaart/totaal/afname
- Esri mirror metadata: https://www.arcgis.com/home/item.html?id=e111e42029af46da8a3a96787c28c444
- Esri terms reviewed: https://www.esri.nl/content/dam/distributor-restricted/esri-nl/voorwaarden/esri-nederland-terms-of-use-08-2023.pdf
- OSM licensing: https://www.openstreetmap.org/copyright
- OSM line tagging: https://wiki.openstreetmap.org/wiki/Tag:power=line
- RIVM operator-derived overhead map (future cross-check, no ingest): https://www.rivm.nl/hoogspanningslijnen/netkaart

### Demand and stations update
Delivered: CBS 2023 postcode annual residential means (4,037 published areas / 4,070 polygons), explicit missing statistics, independently labelled Liander 2026 SJV comparison, and 7,151 OSM station objects. Still open: validated live local demand, industrial coverage, cross-source entity reconciliation, operating-status verification, and complete rooftop-solar coverage. Do not relabel annual means as live demand, infer station service areas, or sum farm and individual-turbine capacity.

Producer extract now contains 2,601 wind-turbine nodes and 758 solar-farm/site ways (3,359 objects). Wind retrieval used the publicly listed VK Maps Overpass instance; solar ways used the main Overpass instance. Queries and original payloads are retained. Broad all-plant requests timed out, so this is explicitly a wind/solar expansion, not a complete fleet. Bounding-box results are filtered by representative point against PDOK provincial polygons; relation-only solar sites, boundary-straddling sites with centres outside polygons, and offshore outside provincial geometry are excluded. Other generation remains accessible through the separate historical registry. `scripts/combine-producers.py` then `scripts/prepare-producers-stations.py` reproduce the derived database.

## Implemented public-data release — 18 September 2026
- Latest-available national startup lookup: today, then yesterday on failure. Explicit historical requests stay scoped to that date. Strict Amsterdam date validation; no artificial September floor.
- Latest complete elapsed interval selected; incomplete elapsed values retain nulls. Cache retrieval dates and fallback reasons visible in Sources. An expired cached response can survive an upstream outage, explicitly labelled.
- 342 municipalities: 2025 CBS mean household grid delivery and net delivery (86333NED, T001100), and year-end solar panel MWp, inverter MW and installation counts (85005NED, E007161). All five metrics published for the 342 mapped municipalities in this snapshot.
- Joined on GM codes to 2025 PDOK CBS land boundaries; no fuzzy spatial allocation. Water polygons and Buitenland excluded. Retired/unallocated solar codes kept in source archive but not mapped. No municipal production inferred from national/regional totals.
- Tabs remain visible. New visible subview buttons, paginated municipal search, colour scale, source inspector, downloadable GeoJSON/provenance. Existing postcode 2023 option retained separately. Annual map values do not respond to the 15-minute timeline.
- Source bytes gzipped with SHA-256/request metadata (the large geometry archive is split into ordered 8 MiB parts); reproducible transformation in scripts/prepare-municipalities.py using Shapely 2.1.2. Valid shared polygon coverage simplified at 0.00015 degrees with full coordinate precision; 6.49 MB derived map.

## Remaining gates
- NED real-response validation is pending; the deployed app now has a diagnostic action. ENTSO-E still needs its token and curve/revision handling. TenneT Balance Delta is connected with source timestamps; other TenneT products remain pending.
- Stedin actual files remain unvalidated (download access failed); Enexis request not sent. CBS business electricity table unavailable during research.
- No unattended national collection is configured. Existing demand-driven D1 archive is retained. Capacity-map redistribution rights and original-source feed remain unresolved.
- District/neighbourhood 2025 statistics, province solar production, new producer registries, storage and weather remain later releases; municipalities are the first bounded geography.


## Comparison and diagnostics release
- Municipal household and solar views can sort highest/lowest and export all filtered matches to CSV. Units are explicit in column names; missing values remain empty. Source GeoJSON/provenance remains available.
- TenneT has per-service in/out trend charts, a selected-interval cursor, and a JSON download of the displayed window and source metadata. Missing intervals break chart lines.
- Data Sources provides explicit deployed-app checks for NED and TenneT and a credential-free diagnostic report. NED error 1010 is distinguished from generic denial; no client identity spoofing or firewall bypass is attempted.
- No new provider datasets were added in this release. Important remaining coverage: industrial demand, current full producer register, live station loading, verified network topology, permitted congestion feed, ENTSO-E token, provincial NED response validation and unattended collection.
