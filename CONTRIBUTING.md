# Katkıda Bulunma

Institute Platform’a hoş geldiniz. Lütfen commit etmeden önce okuyun:

## Git & GitHub

Tüm kurallar: **[docs/GITHUB_WORKFLOW.md](docs/GITHUB_WORKFLOW.md)**

Özet:

1. `dev` branch’inden `feature/...` veya `fix/...` açın  
2. PR hedefi her zaman **`dev`** (feature → dev)  
3. **`main`e asla doğrudan push yapmayın**  
4. Günlük sync: **[docs/daily-sync/TEMPLATE.md](docs/daily-sync/TEMPLATE.md)**

## Commit mesajları

```
<type>(<scope>): <kısa açıklama>
```

| type | Kullanım |
|------|----------|
| `feat` | Yeni özellik |
| `fix` | Hata |
| `chore` | Tooling, docs |
| `refactor` | Davranış değiştirmeyen kod |
| `docs` | Sadece dokümantasyon |

Örnek: `feat(api): add schedule list with redis cache`

## Kod kuralları (PDF)

- TypeScript only — `.js` yok  
- Her tabloda `school_id`, RLS açık  
- tRPC input’ları `packages/types` Zod şemalarından  
- `service_role` yalnızca `apps/api` — frontend’e asla  
- Production’da `console.log` yok — logger kullanın  

## Yerel geliştirme

Bkz. [INSTITUTE_PLATFORM.md](INSTITUTE_PLATFORM.md) ve [ROADMAP.md](ROADMAP.md).
