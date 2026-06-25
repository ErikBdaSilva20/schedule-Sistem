# Auditoria — AppointmentHub vs. Fundação MasIA (Apps Prontos)

> Auditoria técnica do template atual contra o contrato de `Importantdoc.md`
> (tenant-gateway + Neon + Better-Auth + publish Cloudflare).
> **Data:** 25/06/2026. **Veredito geral:** 🔴 Não-conforme — exige port estrutural.

## Resumo executivo

O AppointmentHub é uma SPA de agendamento (domínio **dados + telas**: listas,
formulários, cards, dashboard, calendário) — ou seja, **CABE HOJE** no CRUD genérico
da fundação (§A3), **sem** precisar estender o gateway (sem realtime, sem WhatsApp,
sem jobs/cron, sem pagamentos, sem página pública). O domínio é um ótimo fit.

**Porém**, a implementação atual diverge do contrato em pontos estruturais: o app roda
em **TanStack Start (SSR)**, persiste em **localStorage** (sem backend), **não tem auth**
nem **schema/migration**, e usa **@tanstack/react-router** em vez de `react-router-dom`.
A integração com o backend deles é, na prática, um **port para o scaffold `wiki`**.

## Fit de domínio (§A3) — ✅ CABE HOJE

| Critério | Situação |
| --- | --- |
| Domínio é dados + telas (CRUD)? | ✅ Sim — clients, services, team, appointments |
| Precisa realtime/colaboração? | ✅ Não |
| Precisa WhatsApp/chat/voz? | ✅ Não |
| Precisa jobs/cron/filas? | ⚠️ Não para o MVP (lembretes de agendamento seriam Onda 2 — §A3) |
| Precisa webhooks/pagamento? | ✅ Não (campo `price` é só exibição) |
| Precisa página pública sem login? | ✅ Não |
| Joins resolvíveis plano / 2 queries? | ✅ Sim — telas **já** fazem list-then-find (`services.find`, `clients.find`) |

## Gap analysis (§B) — divergências a corrigir

| # | Área | Contrato MasIA | Estado atual | Sev. |
| --- | --- | --- | --- | --- |
| 1 | Build/Framework (§B3) | SPA Vite + React 19, **sem SSR** | **TanStack Start + nitro + target Cloudflare (SSR)** | 🔴 |
| 2 | Rotas (§B3) | **react-router-dom 7** (`BrowserRouter`) | `@tanstack/react-router` (file-based, `createFileRoute`) | 🔴 |
| 3 | Dados (§B5) | `db` de `src/lib/data/client.ts` → `/data/:table` | **localStorage** via `src/lib/store.tsx` | 🔴 |
| 4 | Repos (§B5) | `src/lib/data/<x>.repo.ts` por tabela | Inexistentes | 🔴 |
| 5 | Schema (§B4) | `supabase/migrations/0001_*.sql` no Neon | Inexistente (dados só em memória/seed) | 🔴 |
| 6 | Tipos (§B5) | `src/lib/data/types.gen.ts` batendo com schema | `src/lib/types.ts` (interfaces à mão) | 🟠 |
| 7 | Auth (§B8) | Better-Auth via `auth`; Login/RequireAuth; papéis | **Nenhuma auth** | 🔴 |
| 8 | `owner_id` (§B4.1) | `text references "user"(id)` em toda tabela escrita pelo rep | Inexistente | 🔴 |
| 9 | Manifest (§B7) | `masi.template.json` (engine, screens, allow/protect) | Inexistente | 🔴 |
| 10 | Arquivos protegidos (§B7) | `client.ts`/`types.gen.ts`/`registry.tsx`/`main.tsx` | Inexistentes (não herdou scaffold) | 🔴 |
| 11 | Crédito (§13) | `THIRD_PARTY.md` se copiou markup | Inexistente | 🟢 |
| 12 | Estilo (§B9) | scaffold `forms-nps` (CSS) **ou** `wiki` (Tailwind+shadcn) | **Tailwind v4 + shadcn** → casa com **`wiki`** | ✅ |

> **Proibições já respeitadas:** zero `@supabase`, zero Firebase, zero driver SQL no
> browser, zero fetch cru pro banco. O que falta é **plugar no `db`/`auth`** do gateway.

## Modelo de dados atual (base para o schema — §B4)

Quatro entidades em `src/lib/types.ts`, todas em `snake_case` (✅) e sem nomes reservados
(`team_members` é válido; só o nome exato `member` é proibido):

- **clients** — `full_name, email, phone, company, notes, created_at`
- **services** — `name, description, duration_minutes, price, color, active`
- **team_members** — `full_name, email, role, specialty, active`
- **appointments** — `client_id, service_id, team_member_id, title, notes,
  appointment_date, appointment_time, duration_minutes, status`

Relações (`client_id`/`service_id`/`team_member_id`) são **FKs planas** resolvidas no
front por list-then-find — exatamente o que o modo genérico suporta (§B5). **Nenhum join
rico necessário.** `status` é enum de 5 valores (texto).

## Decisões em aberto (resolver nas stories)

1. **Catálogo owner-scoped vs lookup:** `services` e `team_members` são catálogo
   compartilhado (admin gerencia) ou dados do rep? Afeta `owner_id` e RBAC (§B4.1/§B8).
2. **`status` texto vs tabela lookup** `appointment_statuses`.
3. **Lembretes de agendamento** (e-mail/notificação antes do horário) = **jobs/cron** →
   **extensão de fundação (Onda 2)**, fora do template (§A3). Confirmar que fica fora do MVP.

## Plano de integração (stories)

| Story | Escopo | Bloqueia |
| --- | --- | --- |
| [04 — Fundação SPA](./04-fundacao-spa.md) | Rebasear no scaffold `wiki`: Vite SPA + react-router-dom, remover SSR/nitro/TanStack Start | 05,06,07 |
| [05 — Schema + migration](./05-schema-migration.md) | `0001_business_schema.sql` no Neon + `types.gen.ts` (§B4) | 06 |
| [06 — Camada de dados (`db`)](./06-camada-dados-gateway.md) | Repos + substituir `store.tsx` por gateway (§B5) | — |
| [07 — Auth & papéis](./07-auth-papeis.md) | Better-Auth, Login, RequireAuth, gating por papel (§B8) | — |
| [08 — Manifest, publish & catálogo](./08-manifest-publish.md) | `masi.template.json`, THIRD_PARTY, publish/demo/Fly (§B7/B10) | — |
