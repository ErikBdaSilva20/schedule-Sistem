# Story 06 — Camada de dados via gateway (`db`)

**Status:** ✅ Concluído (25/06/2026)
**Área:** Dados / Integração
**Contrato:** `Importantdoc.md` §B5, §B1
**Depende de:** 04, 05

## História

> **Como** usuário logado de um tenant,
> **quero** que minhas telas leiam e gravem no **tenant-gateway** (`/data/:table`),
> **para que** os dados persistam no Neon do meu tenant em vez de ficarem só no navegador.

## Contexto atual

Toda a persistência é **localStorage** via `src/lib/store.tsx` (Context + `useState` +
`seed()`). As telas consomem `useStore()` com métodos síncronos (`addClient`,
`updateAppointment`, `setAppointmentStatus`, etc.). Não há nenhuma chamada de rede.

## O que fazer

Trocar o store local pelo **modo genérico do gateway** (§B5), usando o `db` já exposto pelo
`client.ts` **protegido** (herdado na Story 04) e o **react-query** (já é dependência):

1. **Repos por tabela** em `src/lib/data/` (editáveis pela IA):
   `clients.repo.ts`, `services.repo.ts`, `team_members.repo.ts`, `appointments.repo.ts`,
   cada um com `db.table<Row>('<t>').list/create/update/remove`.
   ```ts
   // exemplo: appointments.repo.ts
   import { db } from './client';
   import type { Database } from './types.gen';
   export type Appointment = Database['public']['Tables']['appointments']['Row'];
   export const listAppointments = () => db.table<Appointment>('appointments').list();
   export const createAppointment = (input: Partial<Appointment>) =>
     db.table<Appointment>('appointments').create(input);
   export const updateAppointment = (id: string, patch: Partial<Appointment>) =>
     db.table<Appointment>('appointments').update(id, patch);
   export const deleteAppointment = (id: string) =>
     db.table<Appointment>('appointments').remove(id);
   ```
2. **Substituir `useStore()`** por hooks react-query (`useQuery`/`useMutation`) sobre os
   repos, com `invalidateQueries` após mutação. Remover `src/lib/store.tsx` e o seed.
3. **list-then-filter no front (§B5):** manter o padrão atual (`services.find`, filtros do
   `appointments.tsx`, busca de clients). **Não** introduzir `GET /data/:table/:id`.
4. **NÃO enviar `owner_id`** em nenhum `create`/`update` — o gateway seta pela sessão.
5. **Estados de carregamento/erro/vazio:** as telas hoje assumem dados síncronos; adicionar
   loading skeleton e tratamento de erro (rede pode falhar). Reaproveitar `EmptyState`.
6. **Datas/horários:** `appointment_date` (`date`) e `appointment_time` (`text` HH:mm) já
   batem com o que o front usa em `date-fns` — manter o locale pt-BR (Story 02).

## Critérios de aceite

- [x] Um repo por tabela em `src/lib/data/*.repo.ts` usando só `db.table()`.
- [x] `src/lib/store.tsx` (localStorage + seed) **removido**; nada mais lê `useStore`.
- [x] CRUD das 4 entidades via gateway (`useQuery`/`useMutation` + `invalidateQueries`).
- [x] Nenhuma tela depende de get-by-id ou join no banco (só list-then-filter).
- [x] Front **nunca** manda `owner_id`.
- [x] Loading tratado em cada tela (spinner "Carregando…").
- [x] `tsc && vite build` passa limpo.

## Notas / decisões em aberto

- **Preview do editor (Sandpack):** ajustar o branch `PREVIEW` do `client.ts`/
  `preview-fixtures.ts` com fixtures das 4 tabelas, para o editor por IA renderizar sem
  gateway real (§B5/§B10). (Pode virar sub-tarefa desta story ou entrar na 08.)
- **Reset/seed de demo:** o `resetData()` atual some; se a demo precisar de dados de
  exemplo, isso vira **seed do tenant** no provisionamento, não no front.
- Relação cliente→empresa e serviço→cor já são **planas** — nenhum endpoint extra de join.
- **Cálculo de lembretes (dashboard):** no dashboard, comparar `appointment_date +
  appointment_time` com `now()` — se faltar 2h ou 1h, mostrar badge "Reunião em breve".
  Isso é **puramente no front** (sem persistência). **Onda 2 (extensão):** cron/jobs de
  e-mail real no gateway (§A3 — não entra no template).
