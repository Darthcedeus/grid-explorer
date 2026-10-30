# Direct ENTSO-E integration — 27 October 2026

## Repository assessment

Grid Explorer uses React 19, Next-compatible Vinext routing and MapLibre. The default national replay normalizes Energy-Charts generation/load and physical-border series. Regional CBS/DSO snapshots, RWE plant histories and TenneT balancing have distinct coverage. Self-hosting aliases Cloudflare bindings to SQLite and server environment variables. Successful provider responses are immutable content-hashed source artifacts, with demand-driven cache refresh and source leases.

A separate direct panel preserves those contracts and adds forecasts and wholesale prices without changing the replay or mixing provider totals. No new network dependency is required at build time; XML parsing uses fast-xml-parser with DTD/entity declarations rejected and entity processing disabled.

## Enabled products

| Product | Query | Scope / use |
| --- | --- | --- |
| Actual load | A65 / A16 / outBiddingZone_Domain | Dutch national system demand |
| Load forecast | A65 / A01 / outBiddingZone_Domain | Day-ahead demand context |
| Generation by type | A75 / A16 / in_Domain | Published fuel mix; consumption remains separate |
| Wind/solar forecast | A69 / A01 / in_Domain | Day-ahead solar, offshore and onshore wind |
| Day-ahead price | A44 / in_Domain + out_Domain | Wholesale EUR/MWh, including negative prices |

All queries use Netherlands EIC `10YNL----------L` and `https://web-api.tp.entsoe.eu/api`. All five returned HTTP 200 with the supplied token in this environment on 27 October 2026. Reviewed response fixtures cover Amsterdam 26 October (96 quarter-hour slots), including 20 generation/consumption series and three renewable forecast series. This confirms API access here, not production configuration.

## Operations

Set `ENTSOE_API_KEY` in Coolify's server environment and redeploy. For plain Docker Compose use the ignored `.env` file. Never commit it, expose it as NEXT_PUBLIC, or enter it into a browser URL. Open the header's **ENTSO-E** button, choose dataset/date/series and inspect or download intervals and provenance. The panel loads only when opened; there is no unattended collection.

`GET /api/entsoe?product=load&date=2026-10-26` accepts only the five named products and one valid calendar date from 2015 through tomorrow. The existing API access guard applies. Credentials are appended only to the upstream request; redirects are rejected, response bodies are bounded, and errors never echo URLs or upstream text. Cache duration is 15 minutes with a provider-global two-second refresh lease including failed attempts. Older cached data can be shown only for the same requested product and date, with a warning. Missing configuration returns 503; retrieval/contract errors return 502 without invented substitute data.

Original XML is stored with SHA-256 and fetch time. Document ID, revision number and document creation timestamp are retained in downloads. API response document metadata is not proof of the original publication time of every underlying observation. Later payload versions are separate artifacts. No unreviewed revision series are summed.

A01 missing positions stay null. A03 values apply through the next position or period end; a point without a quantity resets the value to missing. Leading gaps stay missing, and values never cross period boundaries. Unsupported curves/units/domains and overlapping periods are rejected. Time is UTC internally; queries cover Amsterdam midnight to midnight, including 23/25-hour days. Forecasts and actuals are labelled separately. Data has provider-controlled publication delay and corrections.

## Further enrichment

The Transparency Platform also documents physical-border flows, installed capacity, generation-unit output, availability/outages and balancing products. These need their own identifier, period, revision and reuse validation before integration. Physical-border reconciliation would enrich interconnector views. Unit output needs an explicit unit-EIC crosswalk and publication-delay labels before attaching it to plant markers; it cannot establish telemetry for every asset. National ENTSO-E observations do not provide local station loading, complete topology or local congestion capacity.

Energy-Charts republishes ENTSO-E source data. Comparing them can detect transformation/coverage differences but does not establish independent measurement. No overlapping totals are added. Review dataset-specific reuse conditions before redistributing extracts.

## Primary references

- [Official API collection](https://documenter.getpostman.com/view/7009892/2s93JtP3F6)
- [Production endpoint](https://transparencyplatform.zendesk.com/hc/en-us/articles/15696677194644-Request-Endpoint)
- [Area EIC list](https://transparencyplatform.zendesk.com/hc/en-us/articles/15885757676308-Area-List-with-Energy-Identification-Code-EIC)
- [Migration and decimal/A03 changes](https://transparencyplatform.zendesk.com/hc/en-us/articles/30195539966865-Migration-of-Transparency-Platform-data-items-to-a-newer-technology)
- [A01/A03 semantics](https://transparencyplatform.zendesk.com/hc/en-us/articles/30262342482961-CurveType-A01-vs-CurveType-A03)

## Verification in this checkout

- All five products returned HTTP 200 through the production application endpoint, with expected series counts (1, 1, 20, 3, 1); repeat retrieval used the archive cache.
- TypeScript, focused ESLint, production self-hosted build and ENTSO-E parser tests passed.
- Repository-wide lint has existing component errors. The full test suite has a missing historical Liander raw fixture; the map-worker test passes after building.
- Browser interaction/screenshot checks could not run: Browser plugin unavailable, Chromium absent, and the attempted browser download returned invalid/truncated archives. No visual QA success is claimed.
- Changes have not been deployed. Coolify needs the server secret and a redeploy.
