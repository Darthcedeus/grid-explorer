# Netherlands Grid Explorer: data audit and enrichment plan

Reviewed 18 September 2026. This audit describes the bundled map extracts, not a census of all Dutch assets. Field presence does not establish current operation or independently verified accuracy.

## What the map actually contains

| Dataset / field | Present | Missing | Meaning |
|---|---:|---:|---|
| Producers: name or reference | 1,138 | 2,221 | A reference is not necessarily a readable plant name |
| Producers: operator | 1,071 | 2,288 | Original OSM operator tag |
| Producers: numeric capacity, any supported rating | 1,696 | 1,663 | 1,483 MW ratings and 213 separate solar MWp ratings |
| Stations: name or reference | 1,731 | 5,420 | Multiple objects can describe one physical site |
| Stations: operator | 2,946 | 4,205 | Original OSM operator tag |
| Stations: voltage | 1,552 | 5,599 | Absent values remain unknown |
| Mapped producers: connected output time series | 0 | 3,359 | National generation is not assigned to sites |
| Mapped stations: connected loading time series | 0 | 7,151 | No station loading, headroom or topology feed joined |

The producer extract includes 2,601 wind-turbine nodes and 758 solar-farm ways. Relation-only solar, most rooftop systems, offshore locations outside provincial polygons and other technologies are not comprehensively covered. The separate 71-record historical plant registry can overlap with mapped assets and is not a current fleet census. Counts must not be combined as unique sites.

Before this pass, 1,876 producers appeared to have no usable capacity. Inspection found 213 explicit solar peak-capacity tags that the MW-only parser intentionally did not recognise. These now appear as **MWp**, with their original tags preserved. They are not converted into AC output, inverter capacity or a national fleet total. The remaining 1,663 contain 1,005 absent capacity tags, 646 “yes” tags and 12 other unsupported values. A “yes” tag confirms no numeric capacity.

Additional source tags are now exposed for 2,778 producers and 6,211 stations. The retained evidence includes 1,333 manufacturer tags, 1,033 equipment models, 4,108 station BAG references and 305 Liander references. These are potential matching keys, not completed cross-source verification. Equipment model names are not used to fill capacity. A BAG identifier refers to a building, not an electrical asset; its construction date must not become a commissioning date.

### The highlighted station

OSM `way/272533696`, reference `107.082.037`, operator Stedin, BAG reference `0617100000720403`. Its source has no voltage tag. The mapping source is BAG and the source-date tag is 2014-03-24; that date is not a recent audit. The display point is the centre of a mapped building bounding box. No transformer rating, loading or physical connection has been established. [Inspect the source object](https://www.openstreetmap.org/way/272533696).

## Prioritised enrichment work

| Priority | Source / work | What it can add | Acceptance gate / current blocker |
|---|---|---|---|
| 1 | Operator station registers, beginning with Stedin | Authoritative location, source identifiers and voltage category | Download and inspect actual files, reference dates and reuse terms; match exact operator asset IDs where available. Download not validated in this pass. |
| 2 | NED provincial wind / solar | A changing production layer at the geography actually published | Resolve provider firewall access through the supported account/support route; verify point IDs, units, interval boundaries, provenance and model/observation status for each product. Existing key is configured. |
| 3 | ENTSO-E generation-unit records | Historical output for explicitly identified reporting units | Direct API token, real response fixtures, unit EIC crosswalk, publication delays, curve types and reuse conditions. Do not claim every small plant is covered. |
| 4 | Operator plant publications and official project registers | Names, stated capacity, status, commissioning evidence and larger farm membership | Verify each field against a dated publication. Distinguish planned, granted, under construction, operating and decommissioned. RVO project registers are candidates; their current downloadable schema was not validated in this pass. |
| 5 | Liander historical measurements and validated transport products | Selected historical station series; regional transport context | Source asset IDs and geography, units, signs, coverage and date alignment. Anonymised or normalised renewable records stay separate from named plants. Previously retrieved transport CSV remains quarantined. |
| 6 | Broader OSM queries and official offshore datasets | Relation geometries, missing technologies, farm/turbine membership and offshore scope | Explicit scope and lifecycle filters; preserve parent/site/generator relationships. Do not proximity-deduplicate or sum overlapping capacities. |

[Stedin location documentation](https://www.stedin.net/zakelijk/open-data/liggingsdata-kabels-en-leidingen) describes downloadable station coordinates and voltage categories: HS, MS, MS/LS and LS. These are not exact numerical voltages or loading readings. Its reference date belongs to the dataset metadata; updates are at least annual. Keep original categories, rather than assigning an assumed 10 kV or 400 V.

The [NED catalogue](https://ned.nl/nl/datacatalogus) lists provincial wind and solar, national electricity load and modelled offshore wind products. Provincial production does not establish provincial consumption. The configured offshore adapter is separate from the OSM catalogue. Successful upstream access still needs verification; a local request was previously denied by the provider firewall. No made-up fallback is allowed.

[Liander open data](https://www.liander.nl/over-ons/open-data) describes 2024 quarter-hour station measurements and renewable records whose locations are coarse and values normalised. Those renewable records cannot become observed MW at a named OSM farm. Historical and live products need separate labels. Public transport documentation alone does not resolve the schema and plausibility problems found in our saved CSV.

## Cross-source joining contract

1. Keep immutable raw responses, retrieval time, provider reference date, content hash, source URL and licence alongside each normalised record.
2. Separate a physical site, turbine, generating unit, building and station component. Represent membership explicitly; do not merge them because their coordinates are close.
3. Join by the same stable provider asset identifier or an independently verified identifier crosswalk. A BAG building ID alone does not establish electrical identity. Operator plus asset reference needs documented namespace and uniqueness checks.
4. Use name, operator, coordinates and technology only to propose candidates. Require independent confirming evidence before a candidate becomes a verified join. Record decision, evidence and reviewer; do not silently accept fuzzy matches.
5. Store each field as value, unit, source record, reference date and evidence status. Keep competing claims. Prefer a current authoritative claim only when it is comparable; do not average conflicting capacities.
6. Model missingness explicitly: absent tag, unsupported unit, withheld, outside source scope, stale, unresolved match, no API access, and not connected are different states. Never replace unknown with zero.
7. Time series need explicit entity/geography, UTC interval, measurement/model/forecast class, revision and observed/issued timestamp. Join exact intervals or resample with a documented method; never carry a value across missing periods silently.
8. Validate duplicates, coordinate system, identifiers, units, capacity type (MW vs MWp), signs, physical plausibility, expected interval count including DST, and historical revisions. Compare overlapping independent sources without treating differing coverage as an error to be hidden.

## Playback design and delivered changes

Delivered: an on-map national replay panel for generation, demand and net exchange. Bars share one scale for the loaded day; changes are only computed against a contiguous previous interval. Values are the selected national interval, not estimates for the visible sites. Missing readings stay unavailable. The panel can be collapsed.

Delivered: Exchanges line widths grow with observed absolute MW, capped above 4.5 GW for readability; arrows point in the reported direction. Teal is import, purple is export. During replay, fixed-speed particles communicate direction only: neither travel time nor electron speed is represented. Zero has no arrow or moving particles; missing flow has no line. Pausing removes particles, and reduced-motion preferences disable them. Lines are schematic border links, not physical cable routes or domestic power-flow calculations.

Delivered: generation opens without station overlays, with a visible checkbox to add them. Station selection says infrastructure and explains missing electrical readings. Every mapped record exposes source identifiers and snapshot date, with a field-coverage summary. Locations and annual CBS layers remain static during replay.

Next truthful dynamic layer: NED provincial wind/solar polygons once access and semantics pass validation. Then matched historical unit output and separately dated balancing playback. A congestion layer should use published area boundaries, direction (generation versus consumption), status date and source methodology; it must not imply measured line loading. Weather-based local production models would be a separate opt-in estimated layer with validation and uncertainty, never a substitute for missing measured output.

Do not animate energy from a specific farm to a specific city: the connected data has no verified topology, dispatch allocation or solved power-flow model supporting that claim.
