# Repository Guidelines

## Project Shape

Mihomo-sub-manager is a pnpm workspace monorepo for a self-hosted Mihomo subscription aggregation platform.

- `apps/server`: NestJS 11 REST API with Prisma 7 and SQLite.
- `apps/web`: Vue 3 + TypeScript Vite frontend, currently close to the starter template.
- `packages/shared`: shared package area, currently empty.
- `data/app.db`: local SQLite database used by the backend.

Primary product flow:

`SubscriptionSource` -> fetch/parse -> `ProxyNode` -> `ProxyGroup` + `Rule` -> `Profile` -> generated Mihomo YAML -> `GET /publish/:token.yaml`.

## Environment

- Node version: `v24` from `.nvmrc`.
- Package manager: `pnpm@10.26.0`.
- Backend env file: `apps/server/.env`.
- Prisma reads `DATABASE_URL` through `apps/server/prisma.config.ts`; default project docs expect `file:../../data/app.db` from `apps/server`.

## Common Commands

From the repo root:

```bash
pnpm run dev
```

Backend commands from `apps/server`:

```bash
pnpm run start:dev
pnpm run build
pnpm run lint
pnpm run format
pnpm run test
pnpm run test:e2e
pnpm prisma migrate dev
pnpm prisma generate
pnpm prisma studio
```

Frontend commands from `apps/web`:

```bash
pnpm run dev
pnpm run build
pnpm run preview
```

## Current Implementation Notes

- `SubscriptionSource`, `ProxyNode`, `ProxyGroup`, `Rule`, and `Profile` are already present in `apps/server/prisma/schema.prisma`.
- `subscription` currently has basic CRUD implemented.
- Other backend domain modules are scaffolded and still need business logic.
- `doc/tasks.md` is the active task checklist; phase 1 is complete, phase 2 is next.
- The frontend is still the default Vite/Vue starter and has not yet been wired to Arco Design, Pinia, or routing.

## Coding Conventions

- Follow the existing NestJS module/controller/service/DTO structure under `apps/server/src`.
- Keep Prisma schema and migrations in sync when changing data models.
- Prefer focused service methods with controller endpoints kept thin.
- Use Vue 3 SFCs with `<script setup lang="ts">` for frontend work.
- Keep changes scoped to the requested task; avoid unrelated refactors or generated churn.

## Communication

- Reply to the user in Chinese unless they explicitly request another language.

## Verification

- For backend changes, run the narrowest relevant command first, usually `pnpm run test` from `apps/server`; use `pnpm run build` when types or module wiring changed.
- For Prisma changes, run `pnpm prisma generate` and apply/create migrations with `pnpm prisma migrate dev` when appropriate.
- For frontend changes, run `pnpm run build` from `apps/web`.
