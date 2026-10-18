# Netherlands Grid Explorer — security audit

Audit date: 19 September 2026. Baseline: published version 20, source commit `729b193a5adb956cf94c7b7a39a1d564b7983d3d`.

## Result

The audit identified a vulnerable React server-component dependency and gaps in request/resource protection. The fixes upgrade the affected dependencies, add API identity and origin checks, bound upstream response sizes, limit refresh attempts and declare browser security headers.

The dependency scan fell from **36 advisory entries (20 high, 12 moderate, 4 low)** to **2 high advisory entries**, both in the build dependency `image-size`. These are dependency-advisory counts, not counts of demonstrated exploitable website vulnerabilities. No exploitation or breach was established.

**53 tests, TypeScript checking, the production build and migration consistency checking passed.** The site remains owner-private. This is an automated and manual source/configuration review with bounded access probes, not an independent penetration-test certification.

## Scope and evidence

- All seven application API routes; their input validation, database queries, outbound HTTP requests, error handling and caching.
- Platform access policy, browser rendering and source-link handling, auth helpers, development-auth configuration and security-header configuration.
- Dependency lockfile and installed patched versions, including runtime versus build-tool reachability.
- Credential-pattern scanning of 393 working-tree files, 475 unique reachable historical Git blobs, public assets and the browser build. No pattern matches were found. The scanner checks credential assignments, recognizable service-token formats and private-key markers; arbitrary secrets or other encodings can be missed.
- Bounded unauthenticated requests to the home page, one API and a static dataset; one additional request with deliberately invalid identity headers. All returned edge HTTP 403 / error 1010. These requests did **not** reach the application, so they do not establish that application authentication or header-spoof protection worked.

Detailed evidence is in `dependencies-before.json`, `dependencies-after.json`, `access-policy.json`, `access-before.json`, `access-probe-limit.json`, `route-review.json`, `secret-scan.json`, `patch-availability.json` and `verification.json` alongside this report. Secret values, session cookies and platform bypass credentials are not included.

## Findings and changes

| Finding | Severity / scope | Change and status |
|---|---|---|
| React server-component package 19.2.6 affected by denial of service | High; server dependency | React, React DOM and `react-server-dom-webpack` pinned to 19.2.8. Patched and built successfully. [Maintainer advisory](https://github.com/react/react/security/advisories/GHSA-wx67-qw84-cm4g). |
| Other dependency advisories | Mixed; mainly development tools, plus client dependencies | Vite moved to 8.0.16; affected transitive packages receive targeted patched overrides. 34 advisory entries cleared overall. The existing dependency maturity, integrity and build-script controls remain enabled. |
| NED requests had no shared attempt limit; Energy-Charts misses could trigger concurrent refreshes | Medium; quota and resource consumption | Added atomic provider-global D1 leases. Changing point/date does not bypass these limits. NED permits one request pipeline per 120 seconds; Energy-Charts permits one refresh pipeline per 15 seconds, shared across a latest-day fallback. Cached Energy-Charts responses bypass the limiter. Existing RWE/TenneT per-key leases remain. Limits are not a replacement for platform-level DDoS protection. |
| Upstream bodies were read without an effective streaming byte cap | Medium; worker memory consumption | Stream and cancel oversized bodies before JSON parsing: 2 MB for Energy-Charts/RWE/TenneT, 1 MB per NED page and 64 KB for NED error bodies. NED retains its ten-page cap and now has a 25-second whole-pagination deadline. |
| API routes depended entirely on platform access controls | Defense in depth; no bypass demonstrated | All seven APIs reject missing forwarded identity, cross-site browser requests, mismatched Origin and URLs longer than 2,048 characters. The dispatcher remains responsible for identity authenticity and the audience allowlist. These checks do not make raw identity headers trustworthy on a separately exposed Worker. |
| NED pagination URL validation accepted URL user-info and fragments | Low; credentialed fetch boundary | Explicitly reject those forms, in addition to the existing fixed HTTPS origin/path checks. All provider fetches reject redirects; Energy-Charts now does so too. No arbitrary user-supplied destination is fetched. |
| No explicit application-owned browser security-header policy | Hardening; prior live application headers not observable | Added CSP, MIME sniffing protection, referrer policy and restricted browser permissions to dynamic responses and static assets. Removed the framework identification header. CSP allows the bundled map worker and expected ChatGPT embedding origins. [Cloudflare static-header semantics](https://developers.cloudflare.com/workers/static-assets/headers/). |

## Remaining findings

### Two high-severity `image-size` build-tool advisories

The installed `image-size` 2.0.2 is affected by malformed-image parser denial of service: [ICNS](https://github.com/advisories/GHSA-w3rx-r6r6-pgpr) and [JXL/HEIF](https://github.com/advisories/GHSA-5p2g-fcmc-qvqq).

The first patched version, 2.0.3, was published **14 September 2026 at 15:57:47 UTC**. Installation was blocked by the existing `minimumReleaseAge: 10080` policy in `pnpm-workspace.yaml`. It becomes eligible **21 September 2026 at 15:57:47 UTC**. That policy was not weakened. Apply an eligible patched version and rerun dependency/build checks then; this audit does not schedule that future work.

Reachability review found the dependency in Vinext's build-time static-image metadata plugin. This app has no image-upload flow, and no `image-size` package import was found in the generated Worker. No remote application exploit path was demonstrated. Until patched, avoid importing untrusted ICNS, JXL or HEIF images into builds. The high advisory severities remain recorded; build-time scope does not erase them.

### Security boundaries still to verify

- **Live access and browser behavior:** edge error 1010 prevented application-level HTTP checks from this environment. The managed preview service is also unavailable. Verify signed-in use, signed-out rejection, iframe behavior and effective response headers in a permitted browser environment. Do not interpret the build checks as visual or live authentication verification.
- **Platform trust:** native policy inspection confirms one allowed owner, no groups and no external visitors. Dispatcher identity-header stripping, session-cookie attributes, TLS settings and protection of every static path were not independently penetrated. Do not expose a second Worker origin outside that gateway.
- **Inline-script allowance:** CSP currently permits inline scripts/styles for hydration and the theme bootstrap. It restricts other capabilities but is not a strict nonce-based XSS policy. Nonce integration remains a hardening opportunity. [CSP reference](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).
- **Credential lifecycle:** provider keys remain server-side and are absent from detected credential patterns in source/history/build assets. Keys previously supplied in conversation were not revoked or rotated; replacement requires provider-side issuance and an update to hosted secrets. No public credential exposure was established by this audit.
- **Retention and operational limits:** provider archives have no automatic retention policy. Request limits bound refresh frequency, not lifetime database growth. Platform-wide traffic limits and continuous security monitoring were outside this audit.

## Other reviewed controls

Database values are passed through prepared, bound statements. No app-owned unsafe HTML insertion or evaluation sink was found in the grid UI; React renders provider text, and map labels use text content. Fixed upstream destinations and validated NED pagination constrain server-side request forgery. RWE plant requests must resolve to the provider catalogue. Existing CSV export checks preserve spreadsheet-formula escaping. Production bundles contain no environment files, private-key files or browser source-map files. The local mock-auth plugin is confined to development and is not a production authentication mechanism.

## Verification performed

- 52 data, calculation and security tests passed, including anonymous/cross-site API rejection, streaming size caps, a real SQLite lease expiry/concurrency check and hostile pagination URLs.
- One production map-worker packaging test passed after the dependency update.
- TypeScript, production build and Drizzle migration-consistency checks passed.
- Installed React, React DOM and React server-component versions are 19.2.8; installed Vite is 8.0.16.
- Final dependency audit retains exactly the two `image-size` findings above.
- Generated Worker and static build retain the security-header configuration. Effective hosted headers remain unverified for the access limitation described above.

The reproducible scanner is `scripts/security-scan.py`; application security regression checks are in `tests/security.test.mjs`. No load testing, destructive exploitation, credential rotation or access-policy widening was performed.
