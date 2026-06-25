# Story 07 — Auth & papéis (Better-Auth)

**Status:** ✅ Concluído (25/06/2026)
**Área:** Autenticação / RBAC
**Contrato:** `Importantdoc.md` §B8, §B1, §B4.1
**Depende de:** 04 (idealmente após 06)

## História

> **Como** usuário de um tenant,
> **quero** fazer login e ver só o que tenho permissão,
> **para que** o app respeite o RBAC do gateway (admin/manager/rep + owner).

## Contexto atual

**Não há autenticação alguma.** Qualquer um abre o app e vê o seed. Não há `LoginScreen`,
`RequireAuth`, sessão nem noção de papel.

## O que fazer

Plugar o **Better-Auth do gateway** via `auth` (do `client.ts` protegido), reaproveitando
as peças do scaffold `wiki` (§B8):

1. **Login/cadastro:** usar `LoginScreen` do scaffold (`auth.signIn/signUp/signOut`).
   **Não** implementar auth próprio (proibido §B3).
2. **Proteção de rotas:** envolver as 6 telas com `RequireAuth`; sem sessão → `LoginScreen`.
3. **Sessão + papel:** `src/lib/auth.tsx` lê `auth.me()` → `{ user, role }`. Expor um
   `useAuth()` para as telas.
4. **Gating de UI por papel (só estética — §B8):** usar `role` apenas para esconder botões;
   a segurança real é no gateway. **Padrão confirmado (Story 05/Onda 2):**
   - `services` e `team_members` são **lookups** (catálogo compartilhado): apenas **admin**
     vê/cria/edita (botão "Nova Serviço" escondido de `rep`).
   - `clients` e `appointments`: **rep** vê/gerencia só o próprio (o gateway já filtra por
     `owner_id`).
   - **admin/manager:** veem tudo de todos.
5. **1º usuário = admin** (automático no gateway) — nada a fazer no front além de refletir.
6. **Header/AppShell:** mostrar usuário logado + botão sair; opcional badge do papel.

## Critérios de aceite

- [x] App exige login; sem sessão cai no `LoginScreen`.
- [x] `RequireAuth` protege as 6 telas.
- [x] `useAuth()` expõe `{ user, role }` a partir de `auth.me()`.
- [x] Botões de escrita escondidos conforme papel (ex.: `rep` não vê CRUD de lookup).
- [x] Logout funciona (`auth.signOut`) e volta ao login.
- [x] Zero auth caseiro; tudo via `auth` do gateway.
- [x] `tsc && vite build` passa limpo.

## Notas / decisões em aberto

- O gating de UI depende da **decisão de catálogo da Story 05** (owner-scoped vs lookup).
  Se tudo for owner-scoped (Opção A), o `rep` cria tudo e o gating fica mínimo.
- `role` **nunca** é fonte de segurança — só esconde elementos. O gateway recusa escrita
  indevida de qualquer forma (§B4.1).
- Visibilidade já é aplicada pelo gateway (admin/manager/owner veem tudo; rep só o próprio) —
  o front não filtra por `owner_id` manualmente.
