# Story 04 — Fundação SPA (rebasear no scaffold `wiki`)

**Status:** ✅ Concluído (25/06/2026)
**Área:** Build / Arquitetura
**Contrato:** `Importantdoc.md` §B1, §B3, §B9, §B10
**Bloqueia:** 05, 06, 07

## História

> **Como** mantenedor do hub de templates da MasIA,
> **quero** que o AppointmentHub seja uma **SPA Vite + React 19 + react-router-dom**
> rodando sobre o scaffold canônico `wiki`,
> **para que** ele fale só com o tenant-gateway, seja clonável e editável por IA, e
> respeite os arquivos protegidos do contrato.

## Contexto atual

O app roda em **TanStack Start (SSR)** — proibido pelo contrato (§B3: "Sem Next.js / SSR"):

- `package.json` → `@tanstack/react-start`, `@tanstack/react-router`, `nitro`,
  `@lovable.dev/vite-tanstack-config`.
- `vite.config.ts` → `tanstackStart` + `nitro` com **target Cloudflare** e `server entry`.
- `src/router.tsx` + `src/routeTree.gen.ts` → roteador file-based do TanStack.
- `src/routes/__root.tsx` → `shellComponent`, `<Scripts>`, `<HeadContent>` (SSR shell).

O scaffold `wiki` (em `masi-ai-orquestration/clone-templates/wiki`) já é **Vite SPA +
React 19 + react-router-dom 7 + Tailwind v4 + shadcn** e traz os **arquivos protegidos**
prontos (`client.ts`, `auth.tsx`, `RequireAuth`, `registry.tsx`, `main.tsx`).

## O que fazer

Seguir a "Receita rápida" (§Receita 2–3, 7) adaptada — **rebasear**, não recriar:

1. **Criar o template a partir do scaffold:**
   `cp -R clone-templates/wiki clone-templates/appointment-hub` → `rm -rf node_modules dist`.
2. **Remover SSR/TanStack Start:** apagar `react-start`, `nitro`, `router-plugin`,
   `routeTree.gen.ts`, `router.tsx`, `src/server.ts`, `@lovable.dev/vite-tanstack-config`.
   Usar o `vite.config.ts` do scaffold wiki.
3. **Portar rotas para react-router-dom 7:** converter as 6 telas (`/`, `/calendar`,
   `/appointments`, `/clients`, `/services`, `/team`) de `createFileRoute` para
   `<Routes>/<Route>` em `App.tsx`/`app.routes.tsx`. Mover `src/routes/*.tsx` →
   `src/screens/*Screen.tsx`.
4. **Reaproveitar do scaffold (NÃO reescrever):** `main.tsx`, `AppShell` base,
   `auth.tsx`, `RequireAuth`, `registry.tsx`, `src/components/ui/**`, `src/lib/utils.ts`.
   Manter o nosso visual (styles do tema claro/blobs das stories 01–03) por cima.
5. **Meta tags (`<head>`):** sem `HeadContent` SSR — usar `document.title` por tela ou
   `react-helmet`-like simples. Mover os títulos PT-BR já traduzidos.
6. **404/erro:** reaproveitar os componentes já traduzidos, adaptados a react-router.

## Critérios de aceite

- [x] `npm run build` (`tsc && vite build`) passa **limpo**, **zero imports não usados**.
- [x] Nenhuma dependência de SSR: sem `react-start`, `nitro`, `routeTree.gen.ts`, `server.ts`.
- [x] Navegação entre as 6 telas funciona via `react-router-dom` (`BrowserRouter`).
- [x] Tema claro + blobs (stories 01–03) preservados no novo shell.
- [ ] `package-lock.json` commitado. _(usar pnpm — `pnpm-lock.yaml` já presente)_

## Notas / decisões em aberto

- Esta story **não** liga dados nem auth ainda — só a casca SPA conforme. As telas podem
  continuar lendo o `store.tsx` (localStorage) temporariamente; ele sai na Story 06.
- Reaproveitar markup shadcn já existente reduz o trabalho — ambos (este app e o `wiki`)
  usam shadcn, então os componentes `ui/**` devem colidir pouco.
- Confirmar a versão de Vite do scaffold wiki (contrato cita Vite 6; este repo está em 8) —
  **usar a do scaffold** para não divergir do build compartilhado.
