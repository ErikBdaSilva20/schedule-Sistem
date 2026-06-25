# Handoff — AppointmentHub (Sessão 25/06/2026 — parte 3)

## Status geral

✅ **Concluído nesta sessão:**
- Story 07: Auth & papéis — `AuthProvider`, `useAuth`, `LoginScreen`, `RequireAuth`, gating de UI

✅ **Concluído em sessões anteriores:**
- Story 04: Fundação SPA — Vite 6 + react-router-dom 7, zero SSR/TanStack Start
- Story 05: Schema + migration — `0001_business_schema.sql` + `types.gen.ts`
- Story 06: Camada de dados — `client.ts`, 4 repos, telas em react-query, `store.tsx` removido

🔴 **Pendente:**
- Story 08: Manifest `masi.template.json`, THIRD_PARTY, publish, catálogo, Fly redeploy

---

## Build atual

```
pnpm build  →  tsc -b && vite build  →  ✅ limpo
vite v6.4.3 | dist/index.html 0.89 kB | index.js 438 kB
```

---

## Arquitetura implementada

```
src/
  main.tsx              ← entry SPA (BrowserRouter + QueryClientProvider + AuthProvider)
  App.tsx               ← Routes: /login aberto; 6 telas protegidas por RequireAuth
  screens/
    LoginScreen.tsx      ← NOVO: email/senha, signIn/signUp, redireciona para /
    DashboardScreen.tsx
    CalendarScreen.tsx
    AppointmentsScreen.tsx
    ClientsScreen.tsx
    ServicesScreen.tsx   ← botões CRUD escondidos para role != admin/manager
    TeamScreen.tsx       ← botões CRUD escondidos para role != admin/manager
    NotFoundScreen.tsx
  components/
    AppShell.tsx         ← ATUALIZADO: nome do usuário + badge de papel + botão logout
    RequireAuth.tsx      ← NOVO: redireciona para /login se sem sessão
    FloatingBlobs.tsx
    ...
  lib/
    auth.tsx             ← NOVO: AuthProvider + useAuth() + useIsAdmin()
    types.ts
    data/
      client.ts          ← PROTEGIDO: auth.me() / signIn / signUp / signOut
      types.gen.ts       ← PROTEGIDO
      preview-fixtures.ts← PROTEGIDO
      clients.repo.ts
      services.repo.ts
      team_members.repo.ts
      appointments.repo.ts
supabase/
  migrations/
    0001_business_schema.sql
```

---

## Decisões fechadas

| # | Área | Decisão |
|---|------|---------|
| 1 | Catálogo | `services` e `team_members` sem `owner_id` (lookup). `clients` e `appointments` com `owner_id`. |
| 2 | `status` | Coluna `text` com CHECK (5 valores). |
| 3 | Lembretes | Cálculo UI no dashboard. Onda 2 com cron/jobs. |
| 4 | Auth | Better-Auth via gateway; zero auth caseiro. `useAuth()` lê `auth.me()`. |
| 5 | Gating | `rep` não vê CRUD em `services`/`team_members` (lookups). `useIsAdmin()` = admin OU manager. |

---

## Story 08 — O que fazer (próxima sessão)

**Arquivo principal a criar:** `masi.template.json`
- `id`, `name`, `description`, `version`, `category`, `gateway_routes[]`, `env[]`, `ui_routes[]`
- Seguir contrato `Importantdoc.md` §B10 (manifest canônico)

**`THIRD_PARTY.md`** — licenças de todas as dependências (`pnpm licenses list`)

**Catálogo MasIA:**
- PR / push para o repo do catálogo (ou pasta `/templates/appointment-hub/`)
- Validação do manifest pelo CI

**Fly redeploy** (se aplicável):
- `fly deploy` com as variáveis de ambiente corretas (`VITE_GATEWAY_URL`)

**Critérios de aceite (Story 08):**
- `masi.template.json` válido conforme §B10
- `THIRD_PARTY.md` presente e completo
- Template publicado no catálogo MasIA
- `tsc && vite build` passa limpo

---

## Referência rápida

- **Contrato:** `Importantdoc.md` (§A–B, Receita)
- **Stories:** `stories/0{4,5,6,7,8}-*.md`
- **Gateway client:** `src/lib/data/client.ts` — `auth.me()` retorna `{ user, role }`
- **Auth context:** `src/lib/auth.tsx` — `AuthProvider`, `useAuth()`, `useIsAdmin()`
- **Env necessária:** `VITE_GATEWAY_URL` (ou `window.__MASI_GW__` em prod)
- **Visual:** tema claro (#f4f6f5), bordas neon, blobs (opacidade 0.26) — preservado

---

**Data:** 25/06/2026 · **Modelo:** Sonnet 4.6
**Próxima sessão:** Story 08 (Manifest + publish) — contexto ~100%, pronto.
