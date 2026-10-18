# Release validation — 19 September 2026

Release marker: `docker-2026-09-19-1`.

## Confirmed

- Standalone production build completed with Node 24.19.0.
- TypeScript check passed.
- 56 automated tests passed, covering data interpretation, security checks, map worker packaging, SQLite migrations, persistence, atomic provider leases and transaction rollback.
- Production HTTP smoke test passed on port 6000: app HTML, health probe, SQLite availability, same-origin acceptance, foreign-origin rejection, assets API, map worker, and producer/station/network/Enexis map assets.
- Runtime security headers were verified on the production HTML. A middleware fallback was added because next.config headers were not emitted on the standalone Node response during testing.
- The exact internal health-check command works on port 6000; it uses Node HTTP because Fetch rejects this restricted port.
- Real outbound provider checks from the standalone server (not fixtures):

| Provider | HTTP | Observed result |
| --- | --- | --- |
| Energy-Charts public_power + cbpf | 200 through app | 96 aligned intervals for 17 September, delivery upstream, no fallback warning |
| RWE master catalogue | 200 | 18 Dutch entries, no fallback warning |
| TenneT balancing | 200 | connected, 150 records, no warning |
| NED offshore point 28 | 200 | connected, 44 records for 19 September |

NED and TenneT were checked with the previously supplied keys in process environment only. Those values are not in the source, example environment file, image configuration or release archive. Counts above are observations from the test window, not expected fixed counts for later runs. A successful catalogue response does not verify telemetry for every RWE plant.

## Root cause and fixes

The earlier audit introduced an unsupported Workers `redirect: error` option and an identity check that required a header absent from actual signed-in requests. Production logs showed `/api/grid` returning 401 with forwarded email present and user-ID absent. The provider helper now uses manual redirect rejection. Sites API checks accept the platform-forwarded email within the existing private dispatcher boundary. Self-hosting uses the configured Caddy access boundary and does not need ChatGPT headers.

Browser/API refresh-status caching has been disabled. Persistent source caching remains, with original retrieval dates and explicit fallback warnings. The UI now displays API error messages rather than hiding 401/configuration failures behind a generic load error.

## Not verified here

- Docker Engine is not installed in this execution environment. The production build and the Node runtime copied by the Dockerfile were executed and tested, but `docker build` / Compose container startup could not be run here.
- No access to the user's Ubuntu VM, DNS or Caddy was provided. The guide includes verification commands for that host and same-host/remote/containerized Caddy arrangements.
- Browser plugin unavailable. Playwright was available but Chromium was absent; its download timed out and failed. No new rendered-browser screenshot or interactive map QA was completed in this release. HTML, assets and the emitted map worker were verified over HTTP and through build tests.
- Source connectivity was confirmed from this environment, not the user's VM. Provider firewall policy, rate limits, account permissions and availability can differ by egress IP.
- Two previously documented high-severity image-size build-tool advisories remain governed by the dependency maturity policy. The eligible patch date is 21 September 2026. This release does not bypass that policy.

## Reproduce on the VM

```bash
docker compose up -d --build
docker compose ps
docker compose exec grid node deploy/check-feeds.mjs --health
docker compose exec grid node deploy/check-feeds.mjs
```

Then open `https://grid.humza.xyz` through Caddy, dismiss the disclaimer, verify the map, switch Generation/Stations/Demand/Exchanges, select a site, and run replay. Inspect retrieval timestamps under Data sources. Expected unknown fields stay unknown; static map locations do not become live telemetry merely because the national feed updates.
