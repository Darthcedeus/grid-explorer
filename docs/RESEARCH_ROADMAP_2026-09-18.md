# Netherlands Grid Explorer: research and implementation roadmap

Research checked 18 September 2026. Based on the current application source, its imported datasets, official provider documentation, and small public API probes. This is a research deliverable; it does not claim that newly identified feeds are connected. No accounts, API access requests or emails were created or sent.

**Recommendation**

Develop the app into a source-aware electricity atlas with three complementary perspectives: infrastructure and assets; current/historical national and regional observations; and connection constraints and future projects. Prioritize reliable, interpretable comparisons over a larger undifferentiated collection of map points. Keep the visible layer tabs the user prefers.

**1. What the current tool actually covers**

| Area | Current coverage, checked in the project | Important gap |
|---|---|---|
| National system | Energy-Charts generation, load and five physical borders; cached retrieval and saved fallback | No unattended collection; fixed initial date; direct NED, ENTSO-E and TenneT feeds absent |
| Wind and solar locations | 2,601 wind-turbine nodes and 758 solar-site ways from OSM | Relation-only solar sites, some boundary sites, offshore outside provincial polygons and rooftop solar are excluded |
| Other generation | Separate 71-record historical registry | Current operating status, repowering, units, capacity revisions and newer projects need verification |
| Grid | 3,448 high-voltage mapped objects; separate 7,151 station objects including distribution | Objects are not unique physical assets; geometry is not verified electrical connectivity or live loading |
| Local demand | CBS 2023 residential annual means for 4,037 postcode areas; separate Liander 2026 standard annual consumption | Neither is live local demand; business/industrial coverage, newer regional statistics and other DSOs are missing |
| Congestion, prices, weather and storage | Mostly references or research candidates | No integrated constraint layer, weather context, market-price history, battery fleet or project timeline |

Counts describe source records, not completeness or operational assets. Existing national feeds and regional statistics overlap in ways that prevent simply adding them together.

**2. Highest-value verified additions**

| Priority | Dataset and evidence | What it enables | How to add it / remaining gate |
|---|---|---|---|
| P0 | Existing national feed and app audit | A trustworthy latest-available view | Replace the fixed initial date and index with the latest valid common interval; automatic initial retrieval; explicit fallback age; scheduled collection, health and revision records |
| P1 | CBS 86333NED: 2025 household electricity statistics. Schema and two sample rows retrieved | Municipality, district and neighbourhood demand maps with a more recent year | Fetch OData dimensions and observations; select the total-dwellings category; join official same-year GM/WK/BU geometry; preserve suppressed values and provisional status |
| P1 | CBS 85005NED: regional solar statistics. Schema, periods and 2025 sample rows retrieved | Regional solar capacity and annual production, including categories beyond the farm-point map | Import sector/size categories and official regional codes; distinguish panel kWp, inverter kW and annual energy; compare categories without summing subtotals with totals |
| P1 | Stedin location downloads: cables and station points, with published metadata guidance | Operator-supplied distribution infrastructure and an OSM comparison layer | Retrieve SHP packages through the publisher's download route; inspect metadata and actual projection; transform RD New where specified; build map tiles and source-specific asset records |
| P1 | NED provincial wind/solar and forecasts, plus offshore-farm models | Renewable geography that changes with time; forecast versus current comparison | Existing initial adapter needs authenticated fixtures; add account key server-side; validate supported point/type combinations, paging, revisions and units |
| P2 | Stedin 2026 consumption and municipal installed solar capacity | Broader annual small-consumer coverage and distributed-solar context | Import published consumption files and municipal capacity data; retain SJV definitions and merged postcode ranges; actual downloads were not validated in this research environment |
| P2 | ENTSO-E direct system series and published generation-unit data | Primary-source system comparison, historical output for covered large units, outage context | Obtain platform API access and token; implement current XML/curve semantics; join unit IDs to asset identities with explicit evidence |
| P2 | TenneT balancing APIs | Separate view of national balancing conditions and settlement context | Start with Balance Delta High Res after credential testing; add settlement prices and other products only after their individual schemas and terms are checked |
| P2 | Netbeheer Nederland capacity map and operator congestion reports | Separate withdrawal/feed-in constraint views and dated area information | Use the original publisher's permitted interface or export. Public map existence alone does not establish a reusable API or redistribution permission |
| P3 | Enexis consumption and generation datasets | Fill another major DSO coverage gap | Request selected files through its documented form; delivery is by email. No request was sent. Review supplied schema, year and disclaimer before import |
| P3 | KNMI weather products | Wind/solar context, forecast evaluation and later model inputs | Select specific products and licenses; use file-based API and notifications; a documented anonymous-key route supports a small pilot, with a registered key preferable for ongoing use |

Priority reflects product value and integration readiness, not a provider ranking. Credential work can proceed in parallel with public-data implementation.

**3. Dataset details that change the plan**

**Newer household demand is available, but on different geography.** CBS table 86333NED contains preliminary 2025 household statistics by municipality, district and neighbourhood, published in August 2026. It separates electricity delivered from net delivery after feed-in. Net delivery is floored at zero, so it cannot recover exported energy where feed-in exceeds delivery. Introduce a new regional layer rather than relabelling the existing 2023 postcode layer. Use official region codes, not place-name matching. Do not multiply an average by an unrelated housing count to invent total consumption. [CBS table and definitions](https://www.cbs.nl/nl-nl/cijfers/detail/86333NED).

**Solar needs an aggregate layer as well as farm markers.** CBS 85005NED distinguishes installations, panel capacity in kWp, inverter capacity in kW and annual production in million kWh. Its dimensions support regional and sector/size analysis. The API returned real 2025 sample observations during this review. Preserve which measure is being displayed: MWp of panels and MW of inverters are not interchangeable. Show distributed-solar capacity geographically without inventing exact rooftop locations. [CBS solar table](https://www.cbs.nl/nl-nl/cijfers/detail/85005NED).

**Stedin offers a stronger infrastructure source than another OSM-only import.** Its location page provides station and connection downloads across voltage categories. Some files use EPSG:28992; metadata carries the reference date. Refresh is at least annual. The published exclusions include individual service cables, unused connections and infrastructure outside Stedin ownership. Add these as operator-sourced geometry, retain provenance, and review candidate matches against OSM. Geometry still does not establish switch state, thermal rating or electrical topology. Documentation was readable; automated source-page/download retrieval was blocked in this environment, so file contents remain unverified. [Stedin geometry documentation](https://www.stedin.net/zakelijk/open-data/liggingsdata-kabels-en-leidingen).

**Stedin annual consumption is a feasible next DSO import.** Its 2026 download includes Zeeland. Records combine at least ten connections and may merge postcodes; standard annual use is based on the preceding year. The documented CSV format is tab-separated UTF-8 with a BOM and decimal commas. Reuse the Liander pipeline structure, but do not assume identical headers or geography. Keep records spanning postcode boundaries unresolved unless a defensible allocation is available. [Consumption format and downloads](https://www.stedin.net/zakelijk/open-data/verbruiksgegevens).

**Stedin solar capacity covers small connections, not all solar farms.** Its municipal dataset has a 31 December 2025 reference date. The publisher describes incomplete registrations and excludes large installations on large-consumer connections. It is useful for coverage comparison, not an amount to add on top of CBS totals. [Municipal installed capacity](https://www.stedin.net/zakelijk/open-data/opgesteld-vermogen).

**NED is the best next moving regional layer.** Its catalogue lists provincial onshore wind and solar, modelled offshore-farm data and seven-day forecast horizons. Load type 59 is national; it does not solve city or station demand. Start with province IDs 1–12, wind type 1 and solar type 2, then documented offshore-farm point IDs with type 17. Validate actual availability rather than assuming every catalogue combination has data. [NED catalogue](https://ned.nl/nl/datacatalogus).

The NED API requires `X-AUTH-TOKEN`. Published guidance specifies 200 requests per five minutes. The response field `capacity` is average power in kW for the interval, not installed/nameplate capacity; `volume` is energy in kWh. Convert them into separate canonical metrics. Store forecast issue/retrieval time as well as target interval, and retain `lastupdate` revisions. Check timezone parameters against the current specification; documentation examples should not replace contract validation. [NED API manual](https://ned.nl/nl/handleiding-api).

**ENTSO-E will improve historical unit evidence, not provide universal live plant output.** The current unit-generation description covers units of at least 100 MW and specifies a D+5 publication deadline. Coverage must be tested for Dutch units. Use it for historical unit profiles and source reconciliation; do not promise real-time data for every wind turbine or solar farm. [Generation-unit publication definition](https://transparencyplatform.zendesk.com/hc/en-us/articles/16648326220564-Actual-Generation-per-Generation-Unit-16-1-A).

The documented token process includes platform registration, an API-access email request, confirmation and token generation. No account or request was created. The current migration documentation also describes A03 variable-block curves and decimal values: the parser must support those semantics instead of assuming one point per time step. [Token process](https://transparencyplatform.zendesk.com/hc/en-us/articles/12845911031188-How-to-get-security-token), [migration guidance](https://transparencyplatform.zendesk.com/hc/en-us/articles/30195539966865-Migration-of-Transparency-Platform-data-items-to-a-newer-technology).

**TenneT adds balancing context, not local station loading.** The project's reviewed Balance Delta High Res OpenAPI specifies an `apikey` header and a latest response containing a 30-minute window, subject to a configurable publication delay. The window length is not the delay. The documented high-resolution polling cadence is more frequent than a basic minute-level scheduler; choose a compatible collector or a separately validated lower-frequency product. Settlement prices and metered injections are additional catalogue entries, not yet tested feeds. [Balance Delta specification](https://developer.tennet.eu/specs/v1/balance-delta-high-res), [settlement prices](https://developer.tennet.eu/specs/v1/settlement-prices), [metered injections](https://developer.tennet.eu/specs/v1/metered-injections).

**Business demand remains a real blocker.** CBS catalogue table 82538NED is titled regional public-grid deliveries to businesses by industry. The table page was unavailable and its API returned HTTP 403 with `TijdelijkNietBeschikbaar` during this review. Keep it as a blocked candidate, not an immediately deliverable integration. Investigate a publisher-provided replacement or Climate Monitor/DSO series and verify their upstream lineage. Delivered electricity is not necessarily all electricity consumed, because self-generation changes the boundary. [CBS catalogue](https://opendata.cbs.nl/ODataCatalog/Tables?$format=json), [table status](https://www.cbs.nl/nl-nl/cijfers/detail/82538NED).

**4. Important missing categories beyond the first releases**

| Gap | Acquisition route | Interpretation / readiness |
|---|---|---|
| Complete producer identities and lifecycle | Full OSM extract; operator publications; candidate RVO project records; ENTSO-E unit identities | Needs a plant/site/unit hierarchy, operating dates and manual conflict review. Subsidy approval or a planned project does not prove operation |
| Offshore coverage | RVO offshore portal and permitted marine geometry; operator records; NED farm models | Offshore areas need marine boundaries rather than provincial clipping; geometry and output must be matched explicitly. Portal confirmed, specific reusable downloads not validated |
| Batteries and flexible demand | Operator/project announcements and published planning or registration datasets | No comprehensive open Dutch battery register verified here. Keep charging/discharging MW, stored energy MWh and commissioning status separate |
| Connection constraints | Netbeheer Nederland and DSO reports | Capacity status, queue size, constraint direction and expected reinforcement dates are distinct fields; none is a live line-loading percentage |
| Redispatch | GOPACS public market messages, euro and MWh views | Useful congestion events/context. Public displays confirmed; an anonymous reusable data API and redistribution terms are not yet established |
| Outages and availability | ENTSO-E published unavailability; operator notices | Availability, planned maintenance and actual output differ; preserve event updates and cancellations |
| Reinforcement and new projects | TenneT/DSO investment plans and dated project pages | Start with linked, reviewed project records. Preserve estimated dates as forecasts, not guarantees |
| Prices and emissions | ENTSO-E/TenneT price products; NED emissions datasets | Prices need market/interval definitions. Production emissions and consumption-footprint estimates need separate methods; imports cannot be assigned Dutch production intensity automatically |
| Weather | KNMI wind, radiation and temperature products | Associate by explicit spatial/temporal method. Correlation is not proof of curtailment or local demand |
| True electrical topology and live local flows | Explicitly shared operator engineering/telemetry datasets | No nationwide openly accessible feed was established in this research. Do not draw plant-to-home supply routes or run an authoritative load-flow model from OSM geometry alone |

Candidate references: [RVO offshore portal](https://offshorewind.rvo.nl/), [RVO SDE facts and figures](https://www.rvo.nl/subsidies-financiering/sde/aanvragen/feiten-en-cijfers), [official capacity-map explanation](https://www.netbeheernederland.nl/netcapaciteit-en-flexibiliteit/capaciteitskaart), [GOPACS public data navigation](https://www.gopacs.eu/), [GOPACS developer portal](https://docs.gopacs.eu/docs/getting-started). The RVO SDE page yielded no usable project file in this pass; neither that file nor an RVO-backed fleet census is claimed as verified.

Enexis explicitly offers annual small-connection consumption, aggregate small-connection generation and large-connection wind/solar by neighbourhood through email delivery. Its station congestion profile is an example, not live station telemetry. Request only the needed datasets and inspect their accompanying definitions. [Enexis open data](https://www.enexis.nl/over-ons/waar-staan-wij-voor/open-data).

KNMI's file-based API provides file lists and download URLs with key-based access; documented anonymous and registered options have different quotas. Prefer notifications to excessive polling. Product selection and license checks still precede integration. [KNMI API documentation](https://developer.dataplatform.knmi.nl/open-data-api).

**5. How data should be correlated and aggregated**

Implement a small common data model rather than one increasingly wide asset JSON file:

| Record | Minimum fields | Why it matters |
|---|---|---|
| Dataset | Provider, source URL, license, source date, retrieval time, hash, schema version, geography, method, status | Distinguishes a connected feed from a catalogue entry and a current observation from a stale snapshot |
| Entity | Stable internal ID, entity type, technology, geometry, status, valid-from/to | Distinguishes a farm, turbine, plant, generation unit, station and battery |
| Source identity | Entity ID, provider object ID, matching evidence, confidence, review status | Links OSM, operator, EIC and project records without silently merging nearby assets |
| Observation | Entity/area, metric, value, unit, interval start/end, method, publication time, revision | Keeps installed capacity, average power, annual energy and estimated output separate |
| Forecast | Observation fields plus issue time, target interval and model/source version | Allows honest forecast-error evaluation without using a forecast issued after the event |
| Geography | Official code, type, geometry and validity dates | Keeps postcode, municipality, province and electrical service areas distinct |
| Constraint/event | Area/entity, direction, event type, effective interval, publication/revision and source | Keeps withdrawal and injection constraints, outages and project dates interpretable |

Start with source-specific records and exact identifiers. Use reviewed candidate matches based on name, location, technology and capacity; proximity alone is insufficient. Retain plant/unit and farm/turbine parent relationships. Choose one counting level for any total. Preserve MWp versus MWac and MW versus MWh.

Use UTC intervals internally and Amsterdam time for display. Preserve 23/25-hour days. Align time intervals before comparing providers. Choose one primary series per metric and show alternatives as comparisons; do not add Energy-Charts, ENTSO-E and NED versions of the same generation. Shared upstream sources do not provide independent validation merely because two portals agree.

Never sum overlapping national/provincial/municipal totals, residential/business totals with overlapping small-consumer series, or farm capacities alongside their turbines. Compare compatible quantities and expose differences. Keep missing values distinct from zero, negative suppression codes distinct from actual negative power, and preliminary records distinct from final records. The national residual is not a direct measurement of network losses.

**6. Collection and map architecture**

Use a repeatable ingestion sequence: retrieve raw data; retain hash and source metadata; validate schema, units and coverage; normalize records; link identities; publish a versioned app dataset. Quarantine changed schemas or impossible units rather than silently rescaling them.

For annual files, detect new releases and import immutable versions. For operational series, collect server-side with provider-specific rate limits, retries and revision windows. Define a latest-common-interval rule and expose last successful retrieval, observed interval, data age and gaps. Keep keys out of browser code. The existing cache is useful, but unattended ingestion and retention still need implementation.

The current postcode GeoJSON is roughly 19 MB. Before adding a national distribution network, introduce zoom-dependent geometry delivery and precomputed tiles or equivalent bounded map payloads. Keep raw observations and transformations outside deployment bundles where appropriate. Retain the current database for metadata and manageable observations until measured volume justifies a change; do not migrate the whole stack merely to add an annual layer.

For OSM expansion, prefer a reproducible regional extract over increasingly large interactive Overpass queries. A Netherlands extract is available from Geofabrik; separately verify offshore scope. Preserve ODbL lineage and avoid claiming the extract covers all technologies or territorial waters without checking. [Geofabrik Netherlands](https://download.geofabrik.de/europe/netherlands.html).

**7. Product improvements to accompany the data**

1. **Keep visible tabs.** Add data-rich views inside familiar navigation rather than replacing it with the rejected dropdown design.
2. **Make time explicit.** Use an annual year selector for regional statistics and an interval timeline for observations/forecasts. Give static assets a snapshot date. An annual map should not appear to animate with a 15-minute slider.
3. **Reduce map clutter.** Cluster or summarize points at national zoom; expose individual assets as users zoom. Offer “results in map view,” province/municipality filters, fit-to-selection and clear source/technology legends.
4. **Unify discovery without hiding provenance.** Search across modern mapped and historical records, showing source badges and lifecycle status. Warn about possible duplicates rather than silently counting both.
5. **Add comparison panels.** Compare regional annual use, solar capacity and modelled renewable profiles; distinguish per-household intensity from total demand. Do not imply that a nearby producer supplies the selected municipality.
6. **Show evidence health.** Maintain visible source freshness, missing intervals, geographic coverage and “not connected” states. Correct roadmap text that still describes CBS as wholly unimported.
7. **Verify complete flows.** Test tabs, search, pagination, map selection, drawered details, annual versus interval time, mobile layout, failure states and asset loading when supported browser preview is restored.

**8. Concrete implementation sequence and acceptance gates**

| Release | Work | Definition of done |
|---|---|---|
| A — trustworthy baseline | Latest-available startup, fallback age, source-health display, remove fixed September date limits, year/interval separation | A failed refresh preserves labelled saved data; successful refresh selects a valid observed interval; no annual metric is presented as live |
| B — public regional data | CBS 2025 household layer, CBS regional solar layer, same-year boundaries; then Stedin annual data and a bounded geometry pilot | Real fixtures validate units and codes; missing/provisional values survive; totals and subtotals cannot be double-counted; published attribution is retained |
| C — renewable time series | NED provincial wind/solar current and forecast, offshore models after identity mapping | Credential-tested responses, forecast issue-time archive, rate-limited collector and source-labelled province comparisons |
| D — system and constraints | ENTSO-E direct system comparison, historical unit output, TenneT balancing; permitted congestion data route | A03/interval/revision fixtures pass; D+5 unit coverage is labelled; national balancing is never rendered as local station load |
| E — completeness and planning | Broader fleet lifecycle, Enexis, offshore geometry, storage/projects, weather and redispatch context | Explicit entity hierarchy, reviewed source matches, coverage metrics and clear distinction between proposed, built and operational assets |

Credentials are needed for NED, ENTSO-E and the selected TenneT products. Dataset-specific rights and actual payload validation remain gates even after access is granted. Stedin says its open data can be used for users' purposes, subject to its disclaimer; inspect the downloaded package metadata too. CBS statistics require source attribution; geometry may have additional attribution. Treat each provider's database separately before deciding how to redistribute combined extracts. [Stedin reuse guidance](https://www.stedin.net/zakelijk/open-data), [CBS attribution guidance](https://www.cbs.nl/nl-nl/over-ons/website/copyright).

**9. Implementation-ready endpoint notes**

The following unauthenticated CBS endpoints returned metadata or sample observations during this review:

- `https://opendata.cbs.nl/ODataApi/OData/86333NED/DataProperties`
- `https://opendata.cbs.nl/ODataApi/OData/86333NED/TypedDataSet?$top=2`
- `https://opendata.cbs.nl/ODataApi/OData/85005NED/DataProperties`
- `https://opendata.cbs.nl/ODataApi/OData/85005NED/Perioden`
- `https://opendata.cbs.nl/ODataApi/OData/85005NED/TypedDataSet?$filter=Perioden%20eq%20%272025JJ00%27&$top=2`

Relevant household fields: `Woningkenmerken`, `WijkenEnBuurten`, `Codering_3`, `GemiddeldeElektriciteitslevering_5`, `GemiddeldeNettoElektriciteitslevering_6`, `IndelingswijzigingWijkenEnBuurten_8`. Trim padded codes while preserving their original values. Fetch code lists and table descriptions before a full import.

Relevant solar fields: `SectorEnVermogensklasse`, `RegioS`, `Perioden`, `Installaties_1`, `OpgesteldVermogenVanZonnepanelen_2`, `OpgesteldVermogenOmvormers_3`, `ProductieVanZonnestroom_4`. The schema reports kWp, kW and million kWh respectively; production multiplied by 1,000 becomes MWh. Panel capacity divided by 1,000 becomes MWp, not measured output.

Start the next build with releases A and B. They improve visible usefulness and credibility without waiting for credentialed feeds. Begin access preparation for C and D alongside that work. Do not expand the live-data claims until actual responses and coverage pass their acceptance gates.
