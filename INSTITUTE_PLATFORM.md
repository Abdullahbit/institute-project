# Institute Platform — Full Stack (PDF Onboarding Guide)

Bu repo artık PDF’teki mimariyi içerir. Eski Replit **EduPanel** (`artifacts/edupanel`, React + Vite) korunur; yeni stack `apps/` ve `packages/` altındadır.

## Yapı

| PDF | Konum |
|-----|--------|
| Fastify + tRPC | `apps/api` — port **4000** |
| Supabase + RLS | `supabase/migrations/` |
| Zod şemaları | `packages/types` |
| Next.js 14 admin | `apps/web` — port **3000** |
| Expo mobil | `apps/mobile` |
| Turborepo | `turbo.json` + `pnpm dev` |
| Upstash Redis | `apps/api/src/lib/redis.ts` |
| Inngest | `apps/api/src/inngest/` |
| Railway | `apps/api/railway.toml` |

## Hızlı başlangıç

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# API + Next.js admin (mock data, Supabase olmadan çalışır)
pnpm dev
```

- Web: http://localhost:3000  
- API / tRPC: http://localhost:4000/trpc  
- Health: http://localhost:4000/healthz  

Mobil: `pnpm dev:mobile` (Expo QR)

## Supabase

1. [supabase.com](https://supabase.com) projesi oluşturun veya davet alın.  
2. `supabase db push` veya Dashboard SQL ile `supabase/migrations/20250601000000_initial_schema.sql` uygulayın.  
3. `apps/api/.env` içine `SUPABASE_URL` ve `SUPABASE_SERVICE_KEY` (yalnızca API).  
4. `apps/web/.env.local` içine `NEXT_PUBLIC_SUPABASE_ANON_KEY` (asla service_role değil).

## Upstash & Inngest

- Redis: `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN` → program önbelleği  
- Inngest: `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` → geç giriş / no-show cron  

## Railway

`apps/api` klasörünü Railway’de deploy edin; `railway.toml` health check `/healthz` kullanır.

## Eski EduPanel (Vite)

```bash
pnpm dev:edupanel
```

Mock UI aynı kalır; canlı veri için `apps/web` kullanın.

## GitHub Workflow

Arkadaşınız repoyu ekledikten sonra:

1. [docs/GITHUB_WORKFLOW.md](./docs/GITHUB_WORKFLOW.md) — branch kuralları, PR akışı  
2. [CONTRIBUTING.md](./CONTRIBUTING.md) — commit & katkı  
3. [docs/daily-sync/TEMPLATE.md](./docs/daily-sync/TEMPLATE.md) — günlük sync şablonu  
4. `dev` branch — entegrasyon ( **`main`e direkt push yok** )

```powershell
$env:GITHUB_REPO_URL = "https://github.com/KULLANICI/REPO.git"
.\scripts\setup-github-remote.ps1
git push -u origin main
git push -u origin dev
```
