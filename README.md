# Mihomo Sub Manager

English | [简体中文](README.zh-CN.md)

Mihomo Sub Manager is a self-hosted proxy subscription aggregation tool. The goal is to let users add multiple subscription URLs, ingest and manage proxy nodes locally, configure proxy groups and rules, then publish a Mihomo-compatible YAML subscription link.

## MVP Goal

Add multiple provider subscription URLs and generate one working Mihomo subscription URL for clients to import.

## Tech Stack

- Monorepo: pnpm workspaces
- Backend: NestJS 11, Prisma 7, SQLite
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

## Current Progress

Completed:

- Prisma schema includes `SubscriptionSource`, `ProxyNode`, `ProxyGroup`, `Rule`, and `Profile`.
- SQLite migrations have been created for the initial schema and proxy group relations.
- Backend subscription source CRUD is implemented.
- Frontend has Vue Router, Arco Design Vue on-demand component setup, a top navigation layout, dark/light theme toggle, and a dashboard with four status cards.

In progress / not implemented yet:

- Subscription fetching and parsing for `vmess`, `vless`, `trojan`, and `ss`.
- Proxy node management APIs.
- Proxy group management APIs.
- Rule management APIs.
- Profile management and token generation.
- Mihomo YAML generation.
- `/publish/:token.yaml` publishing endpoint.
- Full frontend management pages for subscriptions, nodes, groups, rules, and profiles.
- Docker deployment files.

See [doc/tasks.md](doc/tasks.md) for the detailed checklist.

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
