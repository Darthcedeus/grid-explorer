# Full source cross-check

2026-09-19T08:29:12.765099+00:00

All imported source families and all deployed archive metadata accessible on this run. Saved snapshots, not a new survey or independent verification of every site. No external sources added.

## All map layers: geometry, identity and source links — checked

Checked every feature; administrative boundaries are display geography, not grid service areas.

```json
{
  "layers": 14,
  "features": 116279,
  "invalidGeometries": 0
}
```

## OSM network ↔ OSM stations — checked

Exact object IDs reveal overlapping extracts of the same source, not a second independent witness. Different display labels are preserved.

```json
{
  "sharedObjects": 544,
  "voltageDisagreements": 0
}
```

## Exact Liander matches: voltage and operator fields — review

Compared original OSM voltage tags in volts with complete operator kV strings. Enriched names are excluded from independent corroboration; partial or unsupported voltage formats stay unassessed.

```json
{
  "comparedVoltages": 197,
  "voltageDifferences": 1,
  "operatorLabelDifferences": 0
}
```

## Liander ↔ OSM station identifiers — checked

All ref:liander tags checked against all three imported layers. Existing enrichment remains limited to unique identifiers within 25 metres.

```json
{
  "identifier not in imported layers": 108,
  "exact identifier + position": 197
}
```

## Stedin + Liander ↔ every OSM station — review

Tested original Stedin footprints and all Liander points. Overlap/proximity suggests a candidate; no name, voltage or operator is copied on this evidence alone.

```json
{
  "stedinFootprints": 37422,
  "OSM display point within Stedin footprint": 1526,
  "Within 25 m of Liander point": 1540
}
```

## RVO ↔ all OSM producers — review

All 28,913 project rows screened. Applicant is not automatically the operator; address matches do not establish site identity. Missing coordinates and shared project addresses prevent automatic joining.

```json
{
  "projects": 28913,
  "duplicateProjectIds": 0,
  "osmProducersWithFullAddress": 16,
  "addressCandidates": 4
}
```

## WRI / offshore additions ↔ RWE ↔ OSM — review

Checked historical registry against every Dutch RWE site and mapped OSM producer. Nearby units may share a complex; historical ownership and capacities are never overwritten by proximity.

```json
{
  "historicalRecords": 71,
  "rweDutchSites": 18,
  "rweOldDataFlags": 6,
  "candidatePairsBySource": {
    "WRI \u2192 RWE": 5,
    "WRI \u2192 OSM": 57,
    "RWE \u2192 OSM": 38
  },
  "candidates": 100
}
```

## Enexis and TenneT station identity coverage — gap

Original OSM attributes are checked for all operator labels, including Enexis and TenneT. The imported Enexis releases are neighbourhood/postcode aggregates and an unnamed illustrative station profile; none supplies a station ID/coordinate register. TenneT balancing is national context, not GIS. These records cannot independently establish the identity, voltage or load of OSM stations.

```json
{
  "osmStationOperatorLabels": {
    "Enexis": 133,
    "TenneT": 429,
    "TenneT;Enexis": 1,
    "TenneT;Stedin": 1,
    "TenneT;ProRail": 3,
    "Enexis;WP HZP B.V.": 1,
    "ENEXIS": 7
  }
}
```

## RWE saved responses ↔ catalogue and national timestamps — review

All 18 Dutch plants and 22 unit IDs checked against the saved live response. Claus and Magnum histories each contain 84 valid ISO/epoch-aligned records. The two saved aggregate-query responses are empty. Plant histories have no overlapping timestamps with the complete saved national power snapshots, so a plant-to-national value comparison cannot be made. Local response validation does not establish hosted access.

```json
{
  "dutchPlants": 18,
  "dutchUnits": 22,
  "unitsAbsentFromLiveResponse": 0,
  "histories": [
    {
      "file": "claus-history.json",
      "id": "E110336",
      "plant": "Claus",
      "intervals": 84,
      "missing": 0,
      "first": "2026-09-18T07:30:00.000Z",
      "last": "2026-09-19T04:15:00.000Z"
    },
    {
      "file": "magnum-history.json",
      "id": "E000660",
      "plant": "Eemshaven (Magnum)",
      "intervals": 84,
      "missing": 0,
      "first": "2026-09-18T07:30:00.000Z",
      "last": "2026-09-19T04:15:00.000Z"
    },
    {
      "file": "nl-wind-history.json",
      "id": null,
      "plant": "Empty aggregate-query response; no national observations",
      "intervals": 0,
      "missing": 0
    },
    {
      "file": "nl-gas-history.json",
      "id": null,
      "plant": "Empty aggregate-query response; no national observations",
      "intervals": 0,
      "missing": 0
    }
  ],
  "commonWithSavedNational": [
    {
      "plant": "Claus",
      "commonIntervals": 0
    },
    {
      "plant": "Eemshaven (Magnum)",
      "commonIntervals": 0
    }
  ]
}
```

## Enexis releases ↔ CBS/PDOK geography — checked

All four releases checked for identity and mapped-code coverage; same-code January/July differences retained. Enexis 2026 service-area registered capacity is not a direct equality check against CBS 2025 national/municipal stock.

```json
{
  "snapshots": [
    {
      "kind": "gv",
      "date": "2026-01-01",
      "rows": 2870,
      "unmapped": 149,
      "duplicateIds": 0,
      "mappedWithoutGeometry": 0
    },
    {
      "kind": "gv",
      "date": "2026-07-01",
      "rows": 2875,
      "unmapped": 93,
      "duplicateIds": 0,
      "mappedWithoutGeometry": 0
    },
    {
      "kind": "kv",
      "date": "2026-01-01",
      "rows": 4869,
      "unmapped": 288,
      "duplicateIds": 0,
      "mappedWithoutGeometry": 0
    },
    {
      "kind": "kv",
      "date": "2026-07-01",
      "rows": 4892,
      "unmapped": 202,
      "duplicateIds": 0,
      "mappedWithoutGeometry": 0
    }
  ],
  "changedFields": 10682,
  "changedFieldsWithDifferentAreaLabels": 130
}
```

## Enexis + Liander annual use ↔ CBS postcode demand — checked

Compared geographical coverage only: 2026 standard annual values for small connections cannot be validated by equality with 2023 dwelling averages. Shared postcodes do not imply the same meters.

```json
{
  "enexisPostcodes": 1579,
  "lianderPostcodes": 1614,
  "sharedOperatorPostcodes": 8,
  "enexisNotInCbs2023": 1,
  "lianderNotInCbs2023": 0,
  "cbsPostcodes": 4070,
  "lianderAnnualReconciliationDifferenceKwh": 0.0
}
```

## Bundled metadata ↔ downloadable data — checked

Compared every same-named JSON file shared between the application bundle and public downloads.

```json
{
  "files": [
    {
      "file": "assets.json",
      "identicalContent": true
    },
    {
      "file": "demand-meta.json",
      "identicalContent": true
    },
    {
      "file": "municipalities-meta.json",
      "identicalContent": true
    },
    {
      "file": "network-meta.json",
      "identicalContent": true
    },
    {
      "file": "producers-meta.json",
      "identicalContent": true
    },
    {
      "file": "rvo-projects-meta.json",
      "identicalContent": true
    },
    {
      "file": "stations-meta.json",
      "identicalContent": true
    }
  ]
}
```

## Energy-Charts generation, demand and physical borders — checked

Checked both saved days, common timestamps, duplicate times, source units and reported border sums. Generation + imports - load is a coverage residual, not measured losses or independent validation.

```json
{
  "snapshots": [
    {
      "snapshot": "baseline",
      "generationUnit": "MW",
      "flowUnit": "GW",
      "powerIntervals": 96,
      "flowIntervals": 96,
      "commonIntervals": 96,
      "maxBorderSumDifferenceGW": 0.001000000000000334,
      "powerDuplicateTimestamps": 0,
      "flowDuplicateTimestamps": 0,
      "powerMatchesArchivedResponse": true,
      "flowMatchesArchivedResponse": true
    },
    {
      "snapshot": "-today",
      "generationUnit": "MW",
      "flowUnit": "GW",
      "powerIntervals": 28,
      "flowIntervals": 5,
      "commonIntervals": 5,
      "maxBorderSumDifferenceGW": 1.1102230246251565e-16,
      "powerDuplicateTimestamps": 0,
      "flowDuplicateTimestamps": 0,
      "powerMatchesArchivedResponse": true,
      "flowMatchesArchivedResponse": true
    }
  ]
}
```

## Hosted Energy-Charts, RWE, TenneT; NED / ENTSO-E — gap

All deployed archive metadata pages inspected. RWE and TenneT have attempt markers but no successful archived payload in this database at audit time. This does not identify the failure cause. NED access remains unverified; direct ENTSO-E is not configured. Archived bodies are truncated by the reader, so only local complete source responses underwent value-level tests.

```json
{
  "archiveRecords": 22,
  "successfulArchivesBySource": {
    "energy-charts": 22
  },
  "truncatedArchiveBodies": 22
}
```

## Enexis HS/MS example, Liander transport, permits and tenders — gap

HS/MS is illustrative and cannot verify station load. Liander transport is quarantined for unresolved units/geography. Permits, TenderNed/TED, congestion and KNMI are links/plans with no imported observations to cross-check. TenneT-labelled OSM infrastructure is community mapping, not an operator GIS feed.

```json
{}
```

## Recent hosted error evidence — gap

A limited native worker-log query found an NED route returning HTTP 502. It does not expose the upstream cause. Absence of other feeds from this error query does not prove success.

```json
{
  "queryWindowMinutes": 1440,
  "events": [
    {
      "timestamp": "2026-09-19T08:10:48.336Z",
      "route": "/api/ned",
      "responseStatus": 502,
      "outcome": "ok"
    }
  ]
}
```

## RVO source workbook ↔ imported project register — checked

Compared every selected workbook project by exact reference: location, applicant, technology, installation type, realisation and commissioning year. Original anonymisation preserved.

```json
{
  "workbookHashMatches": true,
  "sourceProjectIds": 28913,
  "importedProjectIds": 28913,
  "differentProjectIds": 0,
  "fieldDisagreements": 0
}
```

## WRI registry ↔ original CSV — checked

All European-Netherlands historical source records checked for name, coordinates, recorded capacity and owner. Two offshore factsheet additions retain separate provenance and approximate display centres; their present-day values were not reverified.

```json
{
  "sourceRecords": 69,
  "importedWriRecords": 69,
  "fieldDisagreements": 0,
  "separateOperatorAdditions": 2
}
```

## OSM producer coverage ↔ original province boundaries — checked

Checked retained display points against the original full-precision provincial polygons. Offshore records outside those areas are still outside this extract; this does not assess national completeness.

```json
{
  "producersChecked": 3359,
  "outsideOriginalBoundaries": 0
}
```

## Operator raw archive integrity — checked

SHA-256 of decompressed source archives compared with recorded import hashes.

```json
{
  "layers": [
    {
      "dataset": "liander-641",
      "match": true
    },
    {
      "dataset": "liander-642",
      "match": true
    },
    {
      "dataset": "liander-643",
      "match": true
    },
    {
      "dataset": "stedin-8",
      "match": true
    },
    {
      "dataset": "stedin-6",
      "match": true
    },
    {
      "dataset": "stedin-5",
      "match": true
    }
  ]
}
```

## OSM provenance and evidence coverage — checked

Every evidence tag compared with its original OSM object; metadata counts recalculated after enrichment. All site source links retained. Source presence does not establish current operation.

```json
{
  "datasets": [
    {
      "dataset": "producers",
      "rows": 3359,
      "tagMismatches": 0,
      "unnamed": 2221,
      "missingSourceLinks": 0,
      "evidenceCountMatches": true
    },
    {
      "dataset": "stations",
      "rows": 7151,
      "tagMismatches": 0,
      "unnamed": 5222,
      "missingSourceLinks": 0,
      "evidenceCountMatches": true
    }
  ]
}
```

## Boundary geometry correction — corrected

Rebuilt display boundaries from valid original source geometry using Shapely 2.1.2 set_precision, valid_output, grid 0.00001 degrees. Collapsed sub-grid rings can be removed. No statistical attributes or original archives changed. Display precision, not surveyed accuracy.

```json
{
  "datasets": [
    {
      "dataset": "public/data/provinces.geojson",
      "source": "research/raw/provinces.geojson",
      "sourceSha256": "76d990b9070490726635b4d38e41b0277c19e107bd6a8e4f4e11d8ed019a7ba7",
      "features": 12,
      "invalidBefore": 5,
      "invalidAfter": 0,
      "propertiesUnchanged": true
    },
    {
      "dataset": "public/data/demand-postcodes.geojson",
      "source": "research/raw/cbs-postcode-2023.json.gz",
      "sourceSha256": "4a8f67148b5a7a1a141ba9a5c5c14e671bb19d1bf8b7b1591c0d4901aad4038a",
      "features": 4070,
      "invalidBefore": 379,
      "invalidAfter": 0,
      "propertiesUnchanged": true
    }
  ]
}
```

## Automated import and calculation verification — checked

Executed source and calculation tests, including complete Enexis raw-file reconciliation. These checks validate transformations; they are not independent certification of source claims.

```json
{
  "nodeDataTestsPassed": 48,
  "nodeDataTestsFailed": 0,
  "typecheckPassed": true,
  "enexisSourceHashesVerified": 10,
  "enexisCapacityReleasesVerified": 4,
  "enexisElectricityRangesReconciled": 126357,
  "enexisWeightedSjaReconciled": true,
  "browserVerification": "Unavailable: managed preview service mailbox is missing. Visual layout is unverified.",
  "scope": "Executed during this audit. Real-source import checks are separate from synthetic edge-case tests; tests do not prove hosted feed availability."
}
```

## Limits

- No claim that a catalogue record proves present-day operation.
- Spatial and address candidates are not applied automatically.
- Provider feeds that describe different quantities, years or populations are not forced to agree.
- Native archive reader truncates payloads; complete production-history revalidation was not possible.
- No new outside data was acquired; disconnected/planned sources are coverage gaps, not checked datasets.

## Next actions

- Diagnose hosted RWE and TenneT retrievals and the NED error, then retain successful timestamped responses before marking them available.
- Resolve the NOORDERRINGWEG voltage conflict against dated operator evidence. Both published values remain visible.
- Review Stedin footprint, Liander proximity and RVO address candidates using independent identifiers or documents; do not automatically merge them.
- Obtain authoritative Enexis and TenneT asset registers. Neighbourhood aggregates and national balancing cannot identify individual substations.
