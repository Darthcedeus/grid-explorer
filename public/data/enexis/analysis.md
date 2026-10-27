# Enexis integration audit — 18 September 2026

All ten supplied links were retrieved. The five email links were resolved to their original public download URLs. The app retains all ten documents/data files in compressed source archives and links to the original publications; tracking links are not embedded in the app.

## What each input contributes

| Input | Incorporated use | Meaning |
|---|---|---|
| Large-connection wind/solar, 1 January 2026 | Generation → Enexis capacity | 2,870 neighbourhood/aggregate rows; operating and under-construction MW kept separate |
| Large-connection wind/solar, 1 July 2026 | Same, with date comparison | 2,875 rows; not measured production |
| HS/MS explanation PDF | Methodology link in station example | Identifies the series as a stylised forecast, not observed telemetry |
| Original station chart JPG | View-original link in station example | Provider's three-year visual, preserved unchanged |
| HS/MS time-series CSV | Interactive daily chart for forecast years 1–3 | 8,760 indexed hours per year; no invented station, coordinates, calendar year or timezone |
| Small-connection solar explanation PDF | Definitions and provenance link | Registered peak capacity in kWp; privacy grouping and incomplete registration |
| Small-connection solar, 1 July 2026 | Generation → Enexis capacity → Small solar | 4,892 source rows; connection counts and kWp converted to MWp |
| Small-connection solar, 1 January 2026 | Same, with date comparison | 4,869 rows; not live output |
| Small-consumption explanation PDF | SJA/SJI definitions in annual explorer | Standard annual values; normalisation and inactive-connection caveats |
| Small-consumption CSV, 1 January 2026 | Demand → Enexis annual data & profile | 126,357 electricity source ranges, searchable through 1,579 postcode summaries; 104,680 gas rows excluded from the electricity interface |

## Published capacity totals

These totals cover the complete respective source files, including unmapped and unallocated rows. They are not the mapped-only subtotal and not a Netherlands fleet census.

| Metric | January 2026 | July 2026 | Unit |
|---|---:|---:|---|
| Large-connection operating solar | 5,740.641266 | 5,827.509166 | MW maximum/inverter capacity |
| Large-connection solar under construction | 529.011 | 467.887 | MW |
| Large-connection operating wind | 1,729.422 | 1,737.042 | MW |
| Large-connection wind under construction | 122.515 | 116.615 | MW |
| Registered small-connection solar | 6,162.278 | 6,202.154 | MWp |

Do not combine MW and MWp, operating and construction capacity, or different release dates. Differences can reflect registration, corrections and geographic changes as well as physical changes. These values are not added to CBS aggregates, mapped OSM capacities, RVO subsidy records or national generation.

## Geography and missing locations

The display uses [CBS/PDOK Wijk- en Buurtkaart 2026 version 0](https://api.pdok.nl/cbs/wijken-en-buurten-2026/ogc/v1/collections/buurten), published as CC0 geometry. A record is mapped only when its BU code, neighbourhood name and municipality agree with the geometry. No fuzzy or proximity join is used. Boundaries are simplified for display; historical footprint changes are not reconstructed.

| Snapshot | Source rows | Mapped | Without a BU code |
|---|---:|---:|---:|
| Large connections, January | 2,870 | 2,721 | 1 |
| Large connections, July | 2,875 | 2,782 | 1 |
| Small solar, January | 4,869 | 4,581 | 53 |
| Small solar, July | 4,892 | 4,690 | 52 |

Some source codes have disappeared or have different names in 2026 geometry. For example, a source name may differ from a renamed area; a spelling difference also fails this deliberately strict first join. These cases are retained for subsequent review, not forced onto a map. The metadata lists mismatches and unmapped numeric totals separately.

Small-solar rows without a neighbourhood code may represent municipal privacy aggregates or unknown neighbourhoods. They remain searchable by the published municipality and province. The completely unallocated rows remain visible too. Missing is not zero; a published numeric zero remains zero.

These inputs contain no Enexis station GIS or individual producer coordinates. They enrich regional capacity and annual-use coverage, not the station asset register.

## Annual-use processing

The CSV has 231,037 rows: 126,357 electricity and 104,680 gas. Only electricity appears in this app. All electricity postcode ranges stay within a single four-digit prefix in this release, allowing 1,579 postcode summaries without distributing a range across areas.

For each postcode, mean standard annual withdrawal (SJA) is weighted by the source connection count. Original postcode ranges retain their SJA and standard annual feed-in (SJI) values. No SJI total is inferred because the required aggregation denominator is not established here. SJA and SJI are not subtracted to manufacture net demand. The source has 2,912,877 electricity connections; these need not equal active-connection counts in the separate solar dataset.

Standard annual quantities describe expected use under normalised conditions and may retain old values for inactive connections. Traditional meters can net solar against withdrawal. They are neither measured annual energy totals nor live power. Source averages are rounded, so count-weighted summaries inherit that precision. The app does not mix per-connection means with CBS per-dwelling statistics.

## Station example processing

The accompanying [Enexis explanation](https://edge-www.enexis.nl/v1/media/edge/images/project/enexisnl/enexisnl/over-ons-pdf/toelichting-belastingdata-hsms-niveau.pdf) identifies an illustrative forecast with extra renewable production. Positive power means net withdrawal from HS to MS; negative power means generation flowing from MS to HS. No grid capacity threshold is supplied by this integration.

All three indexed series contain two blank values, at hours 2138 and 2139. They remain null and break the chart line. Two trailing rows lack hour indices; their values agree with the series maxima and minima, so they are excluded from the timeline. They are preserved in the original CSV archive. Forecast years 1–3 are not relabelled as calendar years.

## Validation and reproducibility

The source files use semicolons despite the PDFs' tab-delimiter description. The importer parses the inspected CSV schema and decimal commas, keeps units explicit, rejects duplicate area keys and verifies source dates.

All ten original byte hashes are recorded in [metadata](./metadata.json). The source repository contains compressed original inputs, the matched raw geometry subset with its paginated request URLs, and `scripts/import-enexis.py`. The derived data can be rebuilt with Python and Shapely. Independent checks reconcile every capacity release and all electricity range values against the archived CSVs. App tests cover unit separation, unmapped rows, genuine zero values and missing-hour chart gaps.

These are saved releases, not scheduled live connectors. Source notices, publication dates and observed values have not been audited by human analysts. The application's educational disclaimer continues to apply.
