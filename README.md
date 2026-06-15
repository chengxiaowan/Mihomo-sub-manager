# Mihomo Sub Manager

English | [简体中文](README.zh-CN.md)

Mihomo Sub Manager is a self-hosted proxy subscription aggregation tool. The goal is to let users add multiple subscription URLs, ingest and manage proxy nodes locally, configure proxy groups and rules, then publish a Mihomo-compatible YAML subscription link.

## MVP Goal

Add multiple provider subscription URLs and generate one working Mihomo subscription URL for clients to import.

## Tech Stack

- Monorepo: pnpm workspaces
- Backend: NestJS 11 (with `@nestjs/schedule` for auto-update), Prisma 7, SQLite
- Frontend: Vue 3, TypeScript, Vite, Arco Design Vue
- Database: `data/app.db`
- Planned deployment: Docker Compose

## Repository Structure

```text
apps/server      NestJS REST API
apps/web         Vue frontend
packages/shared  Shared workspace package area, currently empty
data/app.db      Local SQLite database
doc/tasks.md     Development checklist
```

## Core Flow

```text
SubscriptionSource -> fetch and parse -> ProxyNode
ProxyNode + ProxyGroup + Rule -> Profile
Profile -> generated Mihomo YAML
GET /publish/:token.yaml -> client subscription import
```

## Features

**Subscription sources**

- Add / edit / delete subscription URLs, with manual refresh.
- Auto-fetch once right after a source is added.
- Auto-update on an interval (off / 30m / 1h / 6h / 12h / 24h) driven by a scheduled job.
- Exclude nodes by keyword per source (drops airport info nodes such as expiry/traffic/website).

**Node library**

- Parse `vmess` / `vless` / `trojan` / `ss` (plus `ssr` / `http` passthrough) from base64, URI lists, or Clash YAML.
- List, search, filter by type, enable/disable, delete. Group membership is preserved across refreshes.

**Proxy groups**

- CRUD for `select` / `url-test` / `fallback` / `load-balance` groups; manage member nodes.

**Profiles**

- CRUD with a unique publish token and enable/disable.
- Bind proxy groups and manage per-profile rules (with a default `MATCH` policy).
- Per-profile base config (general + dns: `mixed-port`, `mode`, DNS nameservers, fake-ip, etc.) with default normalization.
- Master/detail UI with tabs: overview / groups / rules / base config / publish.

**Rule market**

- Rule templates holding bulk entries; import into a profile with append or overwrite.

**Operation logs**

- Records subscription / group / profile mutations and refresh results, viewable in the UI.

**Publishing**

- `GET /publish/:token.yaml` generates a standard Mihomo YAML (`general` + `dns` + `proxies` + `proxy-groups` + `rules`).

Not done yet: Docker deployment files. See [doc/tasks.md](doc/tasks.md) for the detailed checklist.

## Requirements

- Node.js v22, see `.nvmrc`
- pnpm 10.26.0

## Development

Install dependencies:

```bash
pnpm install
```

Run both apps from the repository root:

```bash
pnpm run dev
```

Run backend only:

```bash
cd apps/server
pnpm run start:dev
```

Run frontend only:

```bash
cd apps/web
pnpm run dev
```

## Database

Run Prisma commands from `apps/server`:

```bash
pnpm prisma migrate dev
pnpm prisma generate
pnpm prisma studio
```

The backend expects `DATABASE_URL` in `apps/server/.env`. Project docs use:

```env
DATABASE_URL="file:../../data/app.db"
```

## Verification

Backend:

```bash
cd apps/server
pnpm run test
pnpm run build
```

Frontend:

```bash
cd apps/web
pnpm run build
```
