# Institute Platform (Turkish Admin Panel)

SaaS dil okulu yönetim platformu — admin panel, öğretmen/öğrenci mobil, Fastify + tRPC API, Supabase.

## Run & Operate

- `pnpm dev` — API (4000) + Next.js admin (3000)
- `pnpm dev:all` — API + web + Expo mobile
- `pnpm dev:edupanel` — legacy Vite EduPanel (mock UI)
- `pnpm dev:api` / `pnpm dev:web` / `pnpm dev:mobile` — tek uygulama
- `pnpm run typecheck` — full typecheck
- See `INSTITUTE_PLATFORM.md` for Supabase, Upstash, Inngest, Railway

## Stack

- Turborepo + pnpm workspaces, TypeScript 5.9
- **apps/api**: Fastify + tRPC, Supabase, Upstash Redis, Inngest
- **apps/web**: Next.js 14 App Router
- **apps/mobile**: Expo (expo-router)
- **packages/types**: Zod schemas
- **supabase/**: Postgres migrations + RLS
- Legacy: `artifacts/edupanel` (Vite), `artifacts/api-server` (Express)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
