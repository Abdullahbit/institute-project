# GitHub Workflow — Ekip Kuralları

PDF *Collaborator Onboarding Guide* ile uyumlu. **Asla `main`e doğrudan push yapmayın.**

## Branch yapısı

| Branch | Amaç |
|--------|------|
| `main` | Production — yalnızca `dev` üzerinden PR merge |
| `dev` | Entegrasyon — günlük çalışma hedefi |
| `feature/*` | Yeni özellik |
| `fix/*` | Hata düzeltme |
| `chore/*` | Dokümantasyon, bağımlılık, tooling |

## Feature branch isimlendirme

```
<tip>/<kisa-aciklama-kebab-case>
```

**Örnekler:**

- `feature/schedule-crud-trpc`
- `feature/supabase-auth-admin`
- `fix/alert-timezone-utc`
- `chore/github-workflow-docs`

**Kurallar:**

- Küçük harf, tire ile ayırın (Türkçe karakter kullanmayın)
- Tek bir iş / PR odaklı branch
- Uzun ömürlü branch açmayın — sık merge edin

## Günlük akış

```bash
# 1. dev'i güncelle
git checkout dev
git pull origin dev

# 2. Feature branch aç
git checkout -b feature/ornek-is

# 3. Çalış, commit
git add .
git commit -m "feat(api): add schedule upsert mutation"

# 4. Push ve PR (hedef: dev, ASLA main değil)
git push -u origin feature/ornek-is
```

GitHub’da PR açın: **`feature/...` → `dev`**

`dev` stabil olduktan sonra partner/release sorumlusu: **`dev` → `main`** PR açar.

## Daily sync formatı

Her gün (tercihen aynı saatte) ekip kanalında veya PR/issue yorumunda paylaşın.

Şablon dosya: [`docs/daily-sync/TEMPLATE.md`](./daily-sync/TEMPLATE.md)

Kopyala-yapıştır örneği:

```markdown
## Daily sync — 2026-06-01

**Dün**
- Supabase migration yerelde test edildi
- tRPC teachers.list Supabase’e bağlandı

**Bugün**
- feature/auth-admin branch’inde login UI
- Saat takibi sayfasını Next’e taşıma

**Engeller**
- Upstash hesabı bekleniyor

**PR’lar**
- #12 `feature/auth-admin` → `dev` (WIP)
```

## Yasaklar

- `main`e doğrudan `git push`
- `dev`i force push (`git push --force`) — partner onayı olmadan
- `service_role` veya `.env` dosyalarını commit
- Büyük PR (> ~500 satır) — bölün

## İlk kurulum (arkadaş repo ekledikten sonra)

1. Repo URL’yi alın: `https://github.com/KULLANICI/institute-platform.git`
2. Windows PowerShell:

```powershell
cd c:\Users\Administrator\Desktop\Turkish-Admin-Panel
$env:GITHUB_REPO_URL = "https://github.com/KULLANICI/REPO.git"
.\scripts\setup-github-remote.ps1
```

3. GitHub’da (repo sahibi / partner):
   - Settings → Branches → **main**: “Require a pull request before merging”
   - İsteğe bağlı: **dev** için de aynı kural
   - Collaborator olarak sizi eklediğinden emin olun

## Checklist (onboarding)

- [ ] `origin` remote bağlı (`git remote -v`)
- [ ] `dev` branch GitHub’da var ve güncel
- [ ] Feature branch isimlendirmesini okudum
- [ ] Daily sync şablonunu kaydettim
- [ ] `main`e direkt push yapmayacağımı onayladım
