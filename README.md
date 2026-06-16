# Mihomo Sub Manager

English | [简体中文](README.zh-CN.md)

Mihomo Sub Manager is a self-hosted Mihomo subscription aggregation and profile publishing tool. It imports multiple provider subscription sources into a local node library, then generates Mihomo / Clash Meta compatible YAML subscriptions from proxy groups, rules, rule providers, and base configuration.

The project is designed as a personal self-hosted admin panel: single-user, local-first, and without a built-in account system. Admin APIs are protected by one `API_KEY`; on first use, the frontend only asks for the backend URL and the key.

## Features

### Subscription Sources

- Create, edit, and delete subscription sources.
- Automatically fetch once after a source is created.
- Support manual refresh and scheduled refresh.
- Support per-source exclude keywords for filtering non-proxy nodes such as expiry, remaining traffic, and website notices.
- Preserve existing node-to-group membership during refresh.

### Node Library

- Parse nodes from Base64 content, URI lists, and Clash YAML.
- Support `vmess`, `vless`, `trojan`, and `ss`; pass through `ssr` and `http`.
- List, search, filter by protocol, enable/disable, and delete nodes.
- Store raw node configuration locally for later Mihomo YAML generation.

### Proxy Groups

- Support `select`, `url-test`, `fallback`, and `load-balance` groups.
- Manage member nodes for each group.
- Support common Mihomo fields such as test URL, interval, tolerance, lazy mode, and regex filter.

### Profiles

- Create multiple profiles, each with its own publish token.
- Enable or disable profiles.
- Bind proxy groups to profiles.
- Manage profile-level rules with a default `MATCH` fallback policy.
- Manage profile-level base config, including common general / dns fields such as `mixed-port`, `mode`, DNS nameservers, and fake-ip settings.

### Rules and Rule Providers

- Manage rule templates and import them into profiles in bulk.
- Manage Rule Providers and generate Mihomo `rule-providers` config.
- Support `http`, `file`, and `inline` rule provider types.
- Support `domain`, `ipcidr`, and `classical` behavior, plus `yaml`, `text`, and `mrs` formats.

### Publishing

Published subscription URL:

```text
GET /publish/:token.yaml
```

The generated YAML is Mihomo compatible and includes:

```text
general
dns
proxies
proxy-groups
rule-providers
rules
```

### Operation Logs

- Record key operations on subscription sources, nodes, proxy groups, and profiles.
- Record subscription refresh results for easier troubleshooting.

## Tech Stack

- Monorepo: pnpm workspace
- Backend: NestJS 11, Prisma 7, SQLite, `@nestjs/schedule`
- Frontend: Vue 3, TypeScript, Vite, Pinia, Vue Router, Arco Design Vue
- Database: SQLite, default file at `data/app.db`
- Deployment: Docker Compose

## Repository Structure

```text
apps/server       NestJS REST API
apps/web          Vue frontend app
packages/shared   Shared package area, currently unused
data/             Local SQLite data directory
docker/           Docker build configuration
doc/              Task notes and design documents
```

Core data flow:

```text
SubscriptionSource -> fetch/parse -> ProxyNode
ProxyNode + ProxyGroup + RuleProvider + ProfileRule -> Profile
Profile -> Mihomo YAML -> /publish/:token.yaml
```

## Requirements

- Node.js v24, see [.nvmrc](.nvmrc)
- pnpm 10.26.0
- Docker and Docker Compose for deployment

Recommended setup with nvm:

```bash
nvm use
corepack enable
corepack prepare pnpm@10.26.0 --activate
```

## Local Development

Install dependencies:

```bash
pnpm install
```

Create the backend environment file:

```bash
cp apps/server/.env.example apps/server/.env
```

Default example:

```env
DATABASE_URL="file:../../data/app.db"
API_KEY="dev-key"
PORT=3000
```

Initialize the database:

```bash
cd apps/server
pnpm prisma generate
pnpm prisma migrate dev
```

Start both apps from the repository root:

```bash
pnpm run dev
```

Or start them separately.

Backend:

```bash
cd apps/server
pnpm run start:dev
```

Frontend:

```bash
cd apps/web
pnpm run dev
```

Default development URLs:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000
Swagger:  http://localhost:3000/swagger
```

On first frontend launch, fill in:

```text
Backend URL: http://localhost:3000
API Key:     the API_KEY value from apps/server/.env
```

## Common Commands

Backend:

```bash
cd apps/server
pnpm run build
pnpm run lint
pnpm run test
pnpm run test:e2e
pnpm prisma migrate dev
pnpm prisma generate
pnpm prisma studio
```

Frontend:

```bash
cd apps/web
pnpm run dev
pnpm run build
pnpm run preview
```

## Docker Compose Deployment

The project provides two compose files:

- [docker-compose.yml](docker-compose.yml): build images locally; suitable for a development machine, NAS, or VPS.
- [docker-compose.prod.yml](docker-compose.prod.yml): pull images from GHCR; suitable after you have CI image publishing in place.

### Build Locally

Run from the repository root:

```bash
API_KEY=replace-with-a-strong-random-key docker compose up -d --build
```

Default ports:

```text
Frontend: http://server-address:8080
Backend:  http://server-address:3000
```

Override ports with environment variables:

```bash
API_KEY=replace-with-a-strong-random-key \
WEB_PORT=8080 \
SERVER_PORT=3000 \
docker compose up -d --build
```

Data is persisted on the host:

```text
./data/app.db
```

### Use Prebuilt Images

If your CI has pushed images:

```bash
API_KEY=replace-with-a-strong-random-key TAG=latest docker compose -f docker-compose.prod.yml up -d
```

Example with a development tag:

```bash
API_KEY=replace-with-a-strong-random-key TAG=dev docker compose -f docker-compose.prod.yml up -d
```

### First Setup After Deployment

Open the frontend:

```text
http://server-address:8080
```

Fill in:

```text
Backend URL: http://server-address:3000
API Key:     the API_KEY passed to docker compose
```

If both frontend and backend are exposed publicly, using a reverse proxy with HTTPS is strongly recommended.

### Operations

View logs:

```bash
docker compose logs -f
docker compose logs -f server
docker compose logs -f web
```

Stop services:

```bash
docker compose down
```

Upgrade and rebuild:

```bash
git pull
API_KEY=your-existing-key docker compose up -d --build
```

Back up the database:

```bash
cp data/app.db data/app.db.backup
```

## Security and Privacy

This project is designed as a personal self-hosted tool. It is not intended to be exposed as a public multi-user SaaS without additional hardening.

- Admin APIs are protected by `X-Api-Key`, configured through the `API_KEY` environment variable.
- If `API_KEY` is not set, backend authentication is disabled. Use that only for local development.
- The frontend stores the backend URL and API key in browser `localStorage`; each browser/device must be configured separately.
- Published subscription URLs use profile tokens. Anyone with a token can read that generated YAML, so treat publish links as sensitive.
- Subscription URLs, node data, rules, and operation logs are stored in the local SQLite database. The project does not upload telemetry by itself.
- Avoid exposing backend port `3000` directly to the public internet. Prefer Nginx, Caddy, Traefik, or another reverse proxy with HTTPS.
- If public access is required, use a strong random `API_KEY` and restrict access through firewall, security groups, or reverse proxy rules.
- Do not commit `data/app.db`, `.env`, real subscription URLs, or real API keys to a public repository.

## Current Limitations

- No multi-user accounts, roles, or approval/audit workflow.
- SQLite is suitable for personal and lightweight deployment, not for high-concurrency shared service.
- Subscription parsing covers common formats, but some providers may use non-standard fields that need further compatibility work.
- Docker deployment exposes frontend and backend on separate ports by default. Use an external reverse proxy if you need single-domain deployment.

## License

This project is released under the [MIT License](LICENSE).

You may freely download, use, copy, modify, distribute, and use it commercially, as long as the original copyright notice and license text are kept in copies or substantial portions of the software.

## Acknowledgements

Thanks to the following projects and ecosystems:

- [Mihomo](https://github.com/MetaCubeX/mihomo)
- [NestJS](https://nestjs.com/)
- [Prisma](https://www.prisma.io/)
- [Vue](https://vuejs.org/)
- [Vite](https://vite.dev/)
- [Arco Design Vue](https://arco.design/vue)
- [pnpm](https://pnpm.io/)
- [OpenAI Codex](https://openai.com/codex/)
- [Claude Code](https://www.anthropic.com/claude-code)

Thanks also to the Clash / Mihomo community for the subscription formats, rule sets, and client ecosystem.
