# Story 08 — Manifest, crédito, publish & catálogo

**Status:** 📋 Backlog
**Área:** Empacotamento / Deploy
**Contrato:** `Importantdoc.md` §B7, §B10, §B11, §Receita 9–13
**Depende de:** 04, 05, 06, 07

## História

> **Como** plataforma MasIA,
> **quero** o AppointmentHub empacotado como template publicável,
> **para que** ele apareça no Marketplace, seja clonável (~2s) e editável por IA.

## Contexto atual

Não há `masi.template.json`, `THIRD_PARTY.md`, fixtures de preview, nem registro de catálogo.
O app nunca passou pelo pipeline de publish compartilhado.

## O que fazer

1. **Manifest `masi.template.json` (§B7):**
   - `engine: "vite-react-gateway"`, `envContract: ["VITE_GATEWAY_URL"]`, `schemaVersion: 1`.
   - `migrations: ["0001_business_schema.sql"]`.
   - `auth.roles: ["admin","manager","rep"]`.
   - `screens`: as 6 telas (`/`, `/calendar`, `/appointments`, `/clients`, `/services`, `/team`).
   - `editable.allow`: `src/screens/**`, `src/components/**`, `src/lib/data/*.repo.ts`,
     `src/lib/format.ts`, css do tema.
   - `editable.protect`: `client.ts`, `types.gen.ts`, `registry.tsx`, `main.tsx`,
     `supabase/migrations/**` **+ (scaffold wiki)** `src/components/ui/**`, `src/lib/utils.ts`,
     `vite.config.ts`, `components.json`, `preview-fixtures.ts`.
   - `composio.toolkits: []` (sem integrações no MVP).
2. **`THIRD_PARTY.md` (§Receita 12):** creditar a origem Lovable/OSS se algum markup foi
   copiado (licença + link). _(Marcado como baixo risco na auditoria — confirmar origem.)_
3. **Pré-requisitos de build (§B10):** `package-lock.json` commitado, `vite build` passa,
   **zero imports não usados**, `types.gen.ts` batendo com o schema.
4. **Publish PROD (§B10) — sempre com gateway https público:**
   ```bash
   cd masi-ai-orquestration/clone-templates/appointment-hub && npm install
   pnpm templates:publish appointment-hub https://masi-tenant-gateway.fly.dev
   pnpm demo:publish appointment-hub
   ```
   ⚠️ **Nunca** rodar `templates:publish` sem a URL https — o default localhost quebra
   todos os clones (sign-up 404).
5. **Catálogo (control-plane):** migration em `masi-ai-orquestration/supabase/migrations/`
   espelhando `..._clone_template_forms_nps.sql` — 2 INSERTs idempotentes em
   `clone_templates` (slug, name, description, **category** ex. "Agendamento", status
   `published`, latest_version, demo_url) e `clone_template_versions` (manifest jsonb, changelog).
6. **Redeploy Fly (§B10):** redeploy API + edge worker (Dockerfile faz `COPY clone-templates`),
   senão provisão/edição dá `ENOENT`.
7. **Teste E2E (§Receita 13):** clonar de verdade → provisiona Neon → login admin semeado →
   as 6 telas funcionam com dados reais.

## Critérios de aceite

- [ ] `masi.template.json` válido (engine, envContract, screens, allow/protect, migrations).
- [ ] `THIRD_PARTY.md` presente (ou justificativa de que nada foi copiado).
- [ ] `pnpm templates:publish` rodado **com gateway https público**; demo no ar.
- [ ] Migration de catálogo idempotente registrada; template aparece no Marketplace.
- [ ] API + worker redeployados no Fly.
- [ ] E2E: clone real provisiona, loga e usa as 6 telas.

## Notas / decisões em aberto

- **Clones ficam pinados** ao build da provisão — re-publish não atualiza quem já clonou;
  para validar mudança, **re-clonar** (§B10 gotchas).
- `category` do catálogo: sugerir **"Agendamento"** / **"Operações"**.
- `recharts`/libs visuais pesadas podem gerar **warning** de chunk-size — build passa
  normalmente (§B10).
- **Preview Sandpack** usa bundler legado: se alguma lib pesada quebrar o preview, mapear
  `CDN_EXTERNALS` (esm.sh) — produção (Vite) não é afetada.
