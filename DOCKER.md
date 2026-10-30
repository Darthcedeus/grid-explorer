# Netherlands Grid Explorer — Ubuntu, Docker and Caddy

This release runs independently of ChatGPT and Cloudflare Workers. It includes the application, its bundled map/data snapshots, a Node production server, a persistent SQLite observation archive, Dockerfile, Docker Compose configuration, and feed diagnostics. Caddy handles HTTPS at **https://grid.humza.xyz** and proxies to **port 6000**.

## 1. Requirements

- Ubuntu VM with Docker Engine and the Docker Compose plugin. Verify `docker version` and `docker compose version`. Installation: https://docs.docker.com/engine/install/ubuntu/
- Existing Caddy reverse proxy and DNS for `grid.humza.xyz` pointing to Caddy.
- Outbound HTTPS/DNS for package installation during the build and for the data APIs at runtime.
- Allow around 4 GB RAM and several GB of disk for the build; actual requirements depend on the VM. The runtime runs as a non-root user.

## 2. Extract and configure

Copy `netherlands-grid-explorer-docker.tar.gz` to your VM, then:

```bash
mkdir -p ~/apps
tar -xzf netherlands-grid-explorer-docker.tar.gz -C ~/apps
cd ~/apps/netherlands-grid-explorer
cp .env.example .env
chmod 600 .env
nano .env
```

Paste the credentials you already have into these two settings:

```dotenv
NED_API_KEY=your_ned_key
TENNET_API_KEY=your_tennet_key
GRID_BIND_ADDRESS=127.0.0.1
```

Keys are optional for starting the app. With a blank key, that provider reports **not configured** instead of inventing data. Energy-Charts and RWE do not require keys. Keys are read at runtime; rebuilding is not required when changing them. The supplied archive contains no credentials or old private database.

The database starts empty and uses the original source schemas. Bundled historical snapshots and all static map layers are included. New successful provider responses are archived on this VM. Historical observations stored only in the previous hosting platform's database are **not** included.

## 3. Build and start

```bash
docker compose up -d --build
docker compose ps
docker compose logs --tail=100 grid
curl -fsS http://127.0.0.1:6000/api/health
```

The health endpoint should report `"status":"ok"`, `"runtime":"node-sqlite"`, and release `docker-2026-09-19-1`. It tests the app and database, not the availability of third-party providers. Docker uses this endpoint for its health check. Health status alone does not restart a running-but-unhealthy container; `restart: unless-stopped` restarts exited processes.

The image uses a multi-stage build and a pinned Node version. Only the production output and its required runtime packages are copied into the final image. The package lock and seven-day dependency release-age policy are preserved.

**Use the HTTPS domain in your browser.** Browsers and the Fetch API normally block direct navigation to port 6000 because it is reserved for X11. This does not prevent Caddy from proxying to it. Internal probes use Node's HTTP client, not Fetch.

## 4. Configure your existing Caddy

If Caddy runs directly on the **same Ubuntu VM**, add this block to its existing Caddyfile:

```caddyfile
grid.humza.xyz {
    encode zstd gzip
    basic_auth {
        admin REPLACE_WITH_CADDY_PASSWORD_HASH
    }
    reverse_proxy 127.0.0.1:6000
}
```

Generate the password hash interactively with `caddy hash-password`, replace the placeholder, then validate and reload your existing configuration:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Open **https://grid.humza.xyz**, sign in using the Caddy credentials, accept the educational disclaimer, and select **Latest available**. Dark mode, generation, demand, exchanges, station layers and replay remain available.

The self-hosted application does **not** implement ChatGPT sign-in. Caddy is the access-control boundary. Keep the `basic_auth` block to preserve private access, or use your existing Caddy authentication setup. Deliberately removing all authentication makes the public data app and its API endpoints accessible to everyone who can reach the domain. The provider refresh limits remain active in either case.

Caddy supplies the forwarded scheme and host; Compose allows the production server to trust `grid.humza.xyz`. The app validates browser API origins against `APP_ORIGIN=https://grid.humza.xyz`.

### Caddy on a different VM

Change `.env` to `GRID_BIND_ADDRESS=<APP_VM_PRIVATE_IP>`, recreate the service, and use `reverse_proxy <APP_VM_PRIVATE_IP>:6000` in Caddy. Restrict that port to Caddy's private IP using your VM/network firewall. Do not publish it on all interfaces unintentionally. Docker-published ports need Docker-aware firewall rules; do not assume a UFW rule alone restricts them.

### Caddy in another Docker container

`127.0.0.1` inside Caddy refers to the Caddy container, not this app. Either use the private-VM-IP method above, or attach both containers to the same existing Docker network and proxy to `grid:6000`. For the shared-network approach, add your existing network as `external: true` in Compose and attach the `grid` service. Keep the existing Caddy deployment; this package does not start or replace Caddy.

## 5. Verify the feeds

```bash
docker compose exec grid node deploy/check-feeds.mjs
```

This prints one JSON line per check: app health, national Energy-Charts generation/load/exchanges, RWE catalogue, TenneT balancing, and one NED offshore estimate query. It returns a nonzero exit status for failed, unconfigured, empty or stale/fallback results. Cached results retain their original retrieval timestamps. A successful RWE catalogue check does not guarantee live readings for every plant.

Use **Data sources → connection checks** inside the app for provider-specific details. Provider delays, missing readings, denied credentials and source outages remain explicit. A valid API key alone does not guarantee that a provider allows traffic from your VM.

- Energy-Charts: generation/load and physical exchanges, 15-minute archive cache; refresh pipeline limited to one attempt per 15 seconds.
- RWE: Dutch catalogue plus plant history/live endpoints where RWE publishes them; missing readings remain missing.
- TenneT: balancing feed, one upstream attempt per minute.
- NED: modelled offshore estimates, one query pipeline per two minutes. Firewall error 1010 or HTTP 401/403 requires provider-side access review; the app does not bypass it.
- Liander, Stedin, Enexis, TenneT GIS, RVO, OSM and CBS layers are included source snapshots, not live asset telemetry. No unattended collector or automatic GIS refresh is configured.
- Set `ENTSOE_API_KEY` as a server-side secret in Coolify and redeploy to enable the ENTSO-E panel. The Coolify compose file forwards it to the container. Never use a NEXT_PUBLIC variable. The main replay continues to use Energy-Charts; the direct ENTSO-E panel keeps overlapping data separate. See `docs/ENTSOE.md`.

If you change keys, run `docker compose up -d --force-recreate grid`. Do not use `restart` alone to load changed environment values. Wait for the relevant provider's rate-limit window before repeating diagnostics.

## 6. Persistence, backup and restore

SQLite files, including the WAL, live in the named volume mounted at `/data`. Routine container replacement, rebuilding and `docker compose down` preserve this volume. **`docker compose down -v` deletes it.**

For a consistent backup, briefly stop writes:

```bash
mkdir -p backups
docker compose stop grid
docker compose run --rm --no-deps --entrypoint tar grid -C /data -czf - . > backups/grid-data.tar.gz
docker compose start grid
```

Protect `.env` separately. Restore into an empty volume while the app is stopped:

```bash
docker compose stop grid
docker compose run --rm -T --no-deps --entrypoint tar grid -C /data -xzf - < backups/grid-data.tar.gz
docker compose start grid
```

Migrations run automatically and verify the checksums of previously applied SQL. Keep one application replica for this SQLite deployment. Monitor disk use: observation artifacts are retained; automatic retention/pruning is not implemented.

## 7. Updates and troubleshooting

Replace the application source with a newer release, retain `.env` and your volume, then run `docker compose up -d --build`. Back up before upgrades. Read `deploy/VALIDATION.md` for this release's measured checks and limitations.

- **401 on the old hosted app:** the prior security check required a platform user-ID header that production requests did not contain. This release uses the observed platform email contract on Sites and Caddy access control when self-hosted.
- **Old redirect error:** all four provider adapters now use manual redirect rejection. The API and UI no longer cache refresh-status responses in the browser; the server still caches genuine provider observations. Check `/api/health` for the release marker and verify Caddy points at the intended container.
- **502 from Caddy:** check `docker compose ps`, container logs, and whether Caddy can reach the chosen bind address.
- **Healthy container but provider unavailable:** run the feed checks; inspect provider status and retrieval times. Health is not a claim that every external source is up.
- **Database permission error:** the container runs as UID/GID 1000. The supplied named volume is initialized with matching ownership. If substituting a bind mount, give that directory UID/GID 1000 ownership.
- **Build dependency rejected as too new:** preserve the seven-day policy and use the included lockfile; do not bypass the policy to force an update.

References: [Caddy reverse proxy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [Caddy basic authentication](https://caddyserver.com/docs/caddyfile/directives/basic_auth), [Docker Ubuntu installation](https://docs.docker.com/engine/install/ubuntu/), [Vinext](https://github.com/cloudflare/vinext).
