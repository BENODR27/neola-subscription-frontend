# Subscription Console frontend: independent deployment

Uses its separate Subscription API and HttpOnly cookie sessions. Never uses ERP tokens. Configure the API public origin and trusted reverse proxy hops for the real HTTPS Console address.

This package builds from this directory only. No parent workspace, sibling source
checkout or root launcher is required. Network API dependencies remain explicit.

## Configure once

Requires Docker with Compose 2.30+; Node/npm is only needed to use the npm aliases.
On a Mac/Ubuntu shell, copy templates without replacing any existing configuration:

```sh
[ -f .env.container ] || cp .env.container.example .env.container
[ -f .env.deploy ] || cp .env.deploy.example .env.deploy
```

Edit both files before starting. Runtime values belong in `.env.container`;
port, bind address and image belong in `.env.deploy`. Use literal
unquoted values in `.env.container`. Existing passwords, keys and instance IDs
must be copied unchanged from the existing installation, not regenerated.
Relevant runtime settings (placeholders must be replaced):

```dotenv
CONTROL_UPSTREAM=http://192.168.1.50:5005
```

Preserve all customized settings including JWT issuer/audience, subscription mode,
provider origins and signing configuration. Keep provider signing private keys only
on the provider server. These generic local manifests do not replace the signed
customer-policy Ubuntu release profiles.

No shared Docker network setup is needed. Each package gets its own automatic
Compose network and calls other packages through the host LAN IP and published
ports 5001–5006. Replace every 192.168.1.50 in the runtime template with your
actual host IP, including browser origins and database settings. On a Mac,
`ipconfig getifaddr en0` usually shows the Wi-Fi IP; use Network settings if
that interface is not active.

Databases must already be reachable at the configured IP and DB_PORT. A database
container reachable only on an old private Docker network must first be made
reachable through a deliberately configured host endpoint; preserve its data and
credentials. This manifest does not create databases or change their ports.

## Start this package only

```sh
docker compose --env-file .env.deploy -f compose.independent.yaml config --quiet
docker compose --env-file .env.deploy -f compose.independent.yaml up -d --build
docker compose --env-file .env.deploy -f compose.independent.yaml ps
docker compose --env-file .env.deploy -f compose.independent.yaml logs --tail=100
```

Equivalent aliases: `npm run docker:config`, `npm run docker:up`,
`npm run docker:logs`. `npm run docker:build` builds without starting containers.
Local endpoint (also reachable using your host IP): http://localhost:5006. `HTTP_PORT` changes this without
changing the container's internal port. `BIND_ADDRESS=0.0.0.0` permits LAN access;
restrict API ports to trusted clients and use HTTPS for production frontends.

After changing environment values, rerun `docker:up` to recreate this service.
Frontend upstream changes take effect at container startup without an Angular rebuild.

Never commit `.env.container`, `.env.deploy`, upload files, database backups or
private keys. Do not delete volumes to fix configuration failures.

For local Console HTTP testing, use its template's NODE_ENV=development and the
actual host-IP origin on port 5006. Production requires HTTPS and production
settings. Preserve existing subscription mode, JWT/encryption secrets and
installation credentials. Do not use local profiles instead of signed customer
release profiles.
