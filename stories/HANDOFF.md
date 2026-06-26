# Handoff — AppointmentHub (Sessão 25/06/2026 — parte 3, final)

## Status geral

✅ **Código local 100% completo (Stories 04–08 local):**

| Story | Título | Status |
|-------|--------|--------|
| 04 | Fundação SPA | ✅ Concluído |
| 05 | Schema + migration | ✅ Concluído |
| 06 | Camada de dados | ✅ Concluído |
| 07 | Auth & papéis | ✅ Concluído |
| 08 | Manifest + publish | 🔶 Local ✅ · Infra pendente |

🔴 **Pendente de infra (requer acesso ao monorepo `masi-ai-orquestration`):**
1. `pnpm templates:publish appointment-hub https://masi-tenant-gateway.fly.dev`
2. Migration de catálogo em `supabase/migrations/` (2 INSERTs idempotentes)
3. Fly redeploy (API + worker)
4. Teste E2E com clone real

---

## Build atual

```
pnpm build  →  tsc -b && vite build  →  ✅ limpo
vite v6.4.3 | index.js 438 kB | zero warnings
```

---

## Arquitetura completa

```
masi.template.json          ← NOVO: manifest canônico §B7
THIRD_PARTY.md              ← NOVO: scaffold interno; nenhum OSS externo copiado
src/
  main.tsx                  ← BrowserRouter + QueryClientProvider + AuthProvider
  App.tsx                   ← /login aberto; 6 telas protegidas por RequireAuth
  screens/
    LoginScreen.tsx         ← signIn/signUp mock → real ao remover mock
    DashboardScreen.tsx
    CalendarScreen.tsx
    AppointmentsScreen.tsx
    ClientsScreen.tsx
    ServicesScreen.tsx      ← CRUD escondido para role=rep
    TeamScreen.tsx          ← CRUD escondido para role=rep
    NotFoundScreen.tsx
  components/
    AppShell.tsx            ← nome + badge de papel + logout
    RequireAuth.tsx         ← redireciona /login se sem sessão
    FloatingBlobs.tsx
    PageHeader.tsx
    EmptyState.tsx
    ui-kit.tsx
    ui/** (shadcn)          ← PROTEGIDO
  lib/
    auth.tsx                ← AuthProvider · useAuth() · useIsAdmin()
                               ⚠️ MOCK ATIVO (localStorage) — remover ao ligar gateway real
    utils.ts               ← PROTEGIDO
    data/
      client.ts            ← PROTEGIDO: db + auth, gateway-only
      types.gen.ts         ← PROTEGIDO: 4 tabelas, bate com schema
      preview-fixtures.ts  ← PROTEGIDO: Sandpack
      clients.repo.ts
      services.repo.ts
      team_members.repo.ts
      appointments.repo.ts
supabase/
  migrations/
    0001_business_schema.sql ← 4 tabelas, owner_id, triggers, índices
```

---

## Decisões fechadas

| # | Área | Decisão |
|---|------|---------|
| 1 | Catálogo | `services`/`team_members` sem `owner_id` (lookup). `clients`/`appointments` com `owner_id`. |
| 2 | `status` | Coluna `text` com CHECK (5 valores). |
| 3 | Lembretes | Cálculo UI no dashboard. Onda 2 com cron. |
| 4 | Auth | Better-Auth via gateway; zero auth caseiro. `useAuth()` lê `auth.me()`. |
| 5 | Gating | `useIsAdmin()` = admin ou manager. `rep` não vê CRUD de lookups. |
| 6 | Mock auth | `auth.tsx` usa localStorage enquanto gateway não está apontado. Comentários `// Original:` marcam onde religar. |

---

## Para religar o gateway real (quando tiver a URL)

1. Em `src/lib/auth.tsx`: descomente o bloco `// Original:` em `load()` e `signOut()`, apague o bloco `// Mock:`, descomente o import de `auth`.
2. Em `src/screens/LoginScreen.tsx`: idem no `handleSubmit`.
3. `VITE_GATEWAY_URL=https://masi-tenant-gateway.fly.dev pnpm build`

---

## Próximos passos (infra)

```bash
# No monorepo masi-ai-orquestration:
cd clone-templates/appointment-hub && npm install
pnpm templates:publish appointment-hub https://masi-tenant-gateway.fly.dev
pnpm demo:publish appointment-hub

# Criar migration de catálogo espelhando 20260620160001_clone_template_forms_nps.sql
# → 2 INSERTs: clone_templates (slug, name, description, category="Agendamento",
#               status=published, latest_version="1.0.0", demo_url)
#              clone_template_versions (template_id, version, manifest jsonb, changelog)

# Fly redeploy
fly deploy   # no repo do tenant-gateway (COPY clone-templates no Dockerfile)
```

---

## Referência rápida

- **Contrato:** `Importantdoc.md` (§A–B, Receita)
- **Stories:** `stories/0{4,5,6,7,8}-*.md`
- **Manifest:** `masi.template.json`
- **Gateway client:** `src/lib/data/client.ts` — `auth.me()` retorna `{ user, role }`
- **Auth context:** `src/lib/auth.tsx` — AuthProvider · useAuth() · useIsAdmin()
- **Env necessária:** `VITE_GATEWAY_URL`

---

**Data:** 25/06/2026 · **Modelo:** Sonnet 4.6
**Código local:** ✅ completo · **Infra:** aguardando deploy no `masi-ai-orquestration`
