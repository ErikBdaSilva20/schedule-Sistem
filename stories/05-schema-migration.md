# Story 05 — Schema + migration (Neon) + tipos

**Status:** ✅ Concluído (25/06/2026)
**Área:** Banco / Tipos
**Contrato:** `Importantdoc.md` §B4, §B4.1, §B5
**Depende de:** 04 · **Bloqueia:** 06

## História

> **Como** dono do tenant,
> **quero** que os dados de agendamento vivam num schema Postgres no **Neon do tenant**,
> com `owner_id` correto e regras da fundação,
> **para que** o gateway sirva as tabelas automaticamente no modo genérico e o RBAC funcione.

## Contexto atual

Não existe schema nem migration — os dados são um **seed em `store.tsx`** (localStorage).
O modelo (de `src/lib/types.ts`) tem 4 entidades, já em `snake_case` e sem nomes reservados.

## O que fazer

Escrever `supabase/migrations/0001_business_schema.sql` seguindo **à risca** §B4:

- **Toda tabela escrita pelo rep leva** `owner_id text not null references "user"(id) on delete cascade`
  (⚠️ **TEXT** e `"user"` entre aspas) **+ índice** `idx_<tabela>_owner`.
- **`id uuid primary key default gen_random_uuid()`** + `created_at`/`updated_at timestamptz`.
- Trigger `touch_updated_at` para `updated_at` automático.
- **SEM RLS, SEM `auth.uid()`, SEM `profiles`, SEM `custom_access_token_hook`.**
- `snake_case` minúsculo; nada de nomes reservados (`user/session/account/verification/
  organization/member/invitation`).

Tabelas (campos do domínio + colunas-base):

| Tabela | Campos de domínio | Tipos |
| --- | --- | --- |
| `clients` | full_name, email, phone, company, notes | text |
| `services` | name, description, color | text · duration_minutes `int` · price `numeric(10,2)` · active `boolean` |
| `team_members` | full_name, email, role, specialty | text · active `boolean` |
| `appointments` | client_id, service_id, team_member_id (uuid), title, notes, appointment_time, status | text · appointment_date `date` · duration_minutes `int` |

- **FKs entre tabelas de negócio** (`client_id` etc.): `uuid`, **sem** `on delete cascade`
  pesado — manter plano; a integridade de exibição é list-then-find no front (§B5).
- Atualizar **`src/lib/data/types.gen.ts`** para bater 1:1 com o schema
  (`Database['public']['Tables']['<t>']['Row']`). É arquivo **protegido** — gerar/conferir.

## Critérios de aceite

- [x] `0001_business_schema.sql` com as 4 tabelas conforme §B4.
- [x] `owner_id text references "user"(id)` **em `clients` e `appointments`** (lookups sem owner_id).
- [x] Índice `owner_id` em cada tabela; `id uuid` PK; `created_at`/`updated_at` + trigger.
- [x] Zero RLS/`auth.uid()`/`profiles`; zero nome reservado.
- [x] `types.gen.ts` bate com o schema (build passa limpo).

## Decisões fechadas ✅

- **Catálogo compartilhado (Opção B — ESCOLHIDA):**
  - `services` e `team_members` são **lookups** (sem `owner_id`, leitura a todos, escrita
    admin/manager apenas). Admin configura a oferta; rep só consome.
  - `clients` e `appointments` **com `owner_id`** — rep vê/gerencia só o próprio.
  - Rep não pode criar/editar serviços ou membros (escrita recusada pelo gateway § B4.1);
    UI esconde os botões por papel (Story 07).
- **`status`:** coluna **`text`** com CHECK constraint (5 valores: scheduled, confirmed,
  completed, cancelled, no_show). Sem tabela lookup — simples e CRUD.
- **Lembretes:** cálculo **manual no front** (Story 06: dashboard calcula "reunião em 2h",
  "1h antes", mostra badge/alerta). Não é notificação real — é UI informativa.
  **Onda 2 (extensão):** jobs/cron no gateway pra e-mail de verdade (§A3/§B11).

## Notas

- **`owner_id` nunca vem do front** — o gateway seta pela sessão (§B5). A migration só o declara.
