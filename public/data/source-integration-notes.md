# New source integrations — 18 September 2026

The app now includes saved public Liander and Stedin station GIS layers and a searchable RVO wind/solar project register. These sources are not silently merged with OpenStreetMap.

## What is available

| Source | Imported objects / records | Available information |
|---|---:|---|
| Liander high-voltage layer | 719 | Published point, name where supplied, voltage levels, function, operator asset ID |
| Liander medium-voltage layer | 35,935 | Same; includes distribution equipment |
| Liander low-voltage layer | 18,941 | Same; includes cabinets, not just substations |
| Stedin high-voltage layer | 287 | Footprint-derived display point and source category |
| Stedin medium/low-voltage layer | 20,689 | Same; no exact voltage or name field |
| Stedin low-voltage layer | 16,446 | Same; no exact voltage or name field |
| RVO solar subsidy records | 27,819 | Project reference, published applicant/location, installation type and reported status |
| RVO onshore wind subsidy records | 1,077 | Project reference, published applicant/location and reported status |
| RVO offshore wind subsidy records | 17 | Same |

Counts describe source objects, not distinct physical sites. Do not add operator and OSM counts into a fleet total. Several source objects or subsidy records may describe one site.

## Where to find them

- **Stations:** choose Liander, Stedin or OpenStreetMap using the source buttons. Operator layers have separate High voltage, Distribution and Low voltage choices. The selected operator layer can also be overlaid on the generation map.
- **Generation → RVO project register:** search place, municipality, applicant or project reference. Filter solar/wind, source-reported completion and solar installation type. Project coordinates and capacity are absent from this workbook, so records are not placed at guessed map locations.
- **Data sources:** access the source register, original publications and this integration note.

The inspector identifies the source of operator attributes, reference/retrieval dates, source IDs and remaining gaps. Downloads provide the selected snapshot and its provenance metadata. These are saved snapshots; unattended refresh is not configured.

## Evidence and processing

Liander's current [open-data page](https://www.liander.nl/over-ons/open-data) links its ArcGIS service. The importer fetches complete, ordered pages and checks unique object IDs and counts before replacing a snapshot. Native voltage strings are retained. The release is attributed to Alliander under CC BY 4.0.

[Stedin's official location-data page](https://www.stedin.net/zakelijk/open-data/liggingsdata-kabels-en-leidingen) links the imported GIS map. Its reference date is August 2026. The station layers expose only object ID, area and perimeter. The app displays the centre of each polygon's bounding box, explicitly labelled as a display location; it is not an electrical connection point. Original polygons are preserved in compressed source archives. Stedin describes public/open use subject to its disclaimer; the data is not suitable for detailed electrical analysis.

The [RVO July 2026 workbook](https://www.rvo.nl/sites/default/files/2026-09/SDE-projecten-in-beheer-juli-2026.xlsx) contains 30,230 referenced records across several technologies. This import selects only wind and solar: 28,913 records. The workbook has no capacity or coordinate columns in this release. Its 729 non-numeric “not yet” commissioning entries remain null, with the original note retained. Anonymised fields remain anonymised. Applicant does not mean current operator, and reported realisation is not independent verification of current operation. Heat, gas and other technologies are excluded from this electricity-project view.

Raw operator responses and the RVO workbook are archived in the source repository. Public metadata stores SHA-256 hashes, source URLs, processing methods and retrieval dates. Snapshot importers are in `scripts/import-operator-stations.py` and `scripts/import-rvo-projects.py`; the latter requires Python's openpyxl package. The operator importer needs only Python's standard library. Failed GIS count, pagination or coordinate checks abort that import before public snapshots are replaced.

## Matching policy

No new operator or RVO record is automatically joined to OSM in this release. A stable identifier must first be shown to use the same namespace and refer to the same equipment. Nearby geometry, name or address only creates a candidate. Buildings, sites, transformers, cabinets, turbines, contracts and subsidy projects remain different entities.

Accepted future matches must preserve source record IDs and supporting evidence for each field. Conflicts and corrections must remain visible. Current OSM gaps are still gaps in that source, even when another source describes a similar location.

MVA, MW, MWp, kV and MWh must not be substituted for each other. No transformer rating, station loading, connection headroom, supply area or live asset output is inferred by these imports. These records do not animate with the national replay timeline.

## Next integrations

1. Validate identifier namespaces and build a reviewed operator-to-OSM crosswalk, using BAG building references where appropriate.
2. Add KOOP official publications and municipal permit attachments as field-level evidence, preserving applications, decisions, corrections and replacement sites separately.
3. Add TenderNed bulk downloads and TED notice search for procurement context; a framework or award is not an operating asset.
4. Add targeted operator, contractor and manufacturer project publications for corroborating equipment details and construction milestones.
5. Enexis releases supplied by the user are now incorporated: January/July 2026 capacity maps, annual postcode use and a separate illustrative station profile. See [the Enexis audit](./enexis/analysis.md). No external request was sent.

The latter document sources remain research-verified candidates, not imported asset claims. Live or interval-based data through NED, ENTSO-E and TenneT continues to require its own validated identifiers, coverage, units and timestamps.
