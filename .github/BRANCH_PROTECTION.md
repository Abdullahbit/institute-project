# Branch protection (repo sahibi / partner)

Bu dosya GitHub UI’da yapılacak ayarların özeti. Collaborator bunları uygulayamazsa partner’a iletin.

## `main`

Settings → Branches → Add rule → Branch name: `main`

- [x] Require a pull request before merging  
- [x] Require approvals (en az 1)  
- [x] Do not allow bypassing the above settings  
- [x] Restrict who can push (yalnızca merge via PR — direct push kapalı)  

## `dev` (önerilen)

Branch name: `dev`

- [x] Require a pull request before merging (feature branch’lerden)  
- [ ] Force push: kapalı veya sadece admin  

## Sonuç

| Kim | Ne yapar |
|-----|----------|
| Backend (siz) | `feature/*` → PR → `dev` |
| Partner (frontend) | `feature/*` → PR → `dev` |
| Release | `dev` → PR → `main` |
