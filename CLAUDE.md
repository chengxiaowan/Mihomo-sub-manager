# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mihomo-sub-manager is a self-hosted proxy subscription aggregation platform. Users add airport subscription URLs → the system fetches and parses nodes → nodes are stored in a local library → users configure proxy groups and rules → the system generates a standard Mihomo YAML config → a new subscription URL is published for Mihomo clients to import.

MVP goal: user adds multiple airport subscriptions, system generates a working Mihomo subscription link.

Tech stack: NestJS 11 + Prisma + SQLite backend, Vue 3 + TypeScript + Pinia + Arco Design frontend, deployed via Docker Compose. pnpm workspaces monorepo.

- **apps/server** — NestJS REST API
- **apps/web** — Vue 3 frontend
- **packages/shared** — Shared utilities (currently empty)
- **data/app.db** — SQLite database (relative to repo root)

## Commands

Requires Node v22 (`.nvmrc`) and pnpm 10.26.0.

### Backend (`apps/server`)

```bash
pnpm run start:dev     # Dev server with watch mode
pnpm run build         # Compile to dist/
pnpm run start:prod    # Run compiled dist/main.js
pnpm run lint          # ESLint with auto-fix
pnpm run format        # Prettier format
pnpm run test          # Unit tests (Jest)
pnpm run test:watch    # Jest watch mode
pnpm run test:cov      # Coverage report
pnpm run test:e2e      # E2E tests
```

### Database (run from `apps/server`)

```bash
pnpm prisma migrate dev     # Apply migrations and regenerate client
pnpm prisma generate        # Regenerate Prisma client only
pnpm prisma studio          # Visual DB browser
```

### Frontend (`apps/web`)

```bash
pnpm run dev       # Vite dev server with HMR
pnpm run build     # Type-check + Vite production build
pnpm run preview   # Preview production build
```

## Architecture

### Core Business Flow

```
SubscriptionSource (URL) → fetch → parse → ProxyNode (local library)
    ↓
ProxyGroup (select/url-test/fallback/load-balance) ← nodes
    ↓
Profile (binds groups + rules) → generator → Mihomo YAML
    ↓
GET /publish/:token.yaml  ← Mihomo client imports
```

### Data Model (`apps/server/prisma/schema.prisma`)

Five entities (ProxyGroup needs to be added to schema):

| Entity | Key Fields | Notes |
|---|---|---|
| **SubscriptionSource** | name, url, enabled, lastFetchedAt, fetchStatus | One-to-many with ProxyNode |
| **ProxyNode** | name, type, server, port, tags, enabled, raw (JSON) | Belongs to SubscriptionSource |
| **ProxyGroup** | name, type (select/url-test/fallback/load-balance) | Many-to-many with ProxyNode |
| **Rule** | type (DOMAIN/DOMAIN-SUFFIX/IP-CIDR/GEOIP/MATCH/…), value, policy, sort, enabled | — |
| **Profile** | name, token (unique), enabled | Binds groups + rules; token used in publish URL |

### Backend Modules (`apps/server/src/`)

Each domain dir has a module, controller, service, and DTOs:

| Module | Purpose |
|---|---|
| `subscription/` | CRUD for SubscriptionSource; fetch remote URL; parse nodes into ProxyNode |
| `proxy-node/` | List, search, enable/disable, delete, tag nodes |
| `proxy-group/` | CRUD for ProxyGroup; manage member nodes |
| `rule/` | CRUD for rules; reorder |
| `profile/` | CRUD for profiles; bind groups + rules; generate token |
| `generator/` | Build Mihomo YAML (`proxies` + `proxy-groups` + `rules`) from a Profile |
| `publish/` | `GET /publish/:token.yaml` — serve generated YAML by token |

All modules are scaffolded; business logic is not yet implemented.

### Frontend (`apps/web/src/`)

Vue 3 SFC with Composition API, TypeScript, Pinia for state, Arco Design (or Naive UI) for components. Currently at the Vite starter template stage.

## Development Stages

1. Prisma Schema + SQLite + Subscription CRUD
2. Subscription fetch + parse + node ingestion
3. Node management + Rule management + ProxyGroup management
4. Mihomo config generation
5. Subscription publishing (`/publish/:token.yaml`)
6. Docker deployment

## Key Config Files

- `apps/server/.env` — `DATABASE_URL` (defaults to `file:../../data/app.db`) and `PORT` (default 3000)
- `apps/server/prisma.config.ts` — Prisma config pointing to `schema.prisma`
- `apps/server/nest-cli.json` — NestJS CLI config (source root `src`)
- `apps/web/vite.config.ts` — Vite config
