# Stories — AppointmentHub

Backlog de planejamento do AppointmentHub. Dois tracks: melhorias de front-end
(01–03) e a **integração com a fundação MasIA** (00, 04–08), conforme `Importantdoc.md`.

## Track 1 — Melhorias de front-end

| #   | Story                                              | Área            | Status    |
| --- | -------------------------------------------------- | --------------- | --------- |
| 01  | [Tema de cores claro](./01-tema-claro.md)          | CSS / Theming   | ✅ Concluído |
| 02  | [Tradução para Português (PT-BR)](./02-traducao-ptbr.md) | i18n            | ✅ Concluído |
| 03  | [Sidenav colapsável no mobile](./03-sidenav-mobile.md)   | Responsividade  | ✅ Concluído |

> Escopo: camada de apresentação (cores, idioma, responsividade). Sem regra de negócio.

## Track 2 — Integração com a fundação MasIA (tenant-gateway)

Port do app para o contrato de `Importantdoc.md` (SPA Vite + gateway + Better-Auth + Neon).
Comece pela auditoria; depois execute **na ordem** (04 → 05 → 06 → 07 → 08).

| #   | Story                                              | Área            | Status    |
| --- | -------------------------------------------------- | --------------- | --------- |
| 00  | [Auditoria — AppointmentHub vs MasIA](./00-auditoria-masia.md) | Auditoria       | ✅ Concluído |
| 04  | [Fundação SPA (scaffold `wiki`)](./04-fundacao-spa.md)         | Build / Arq.    | 📋 Backlog |
| 05  | [Schema + migration (Neon)](./05-schema-migration.md)         | Banco / Tipos   | 📋 Backlog |
| 06  | [Camada de dados via gateway (`db`)](./06-camada-dados-gateway.md) | Dados           | 📋 Backlog |
| 07  | [Auth & papéis (Better-Auth)](./07-auth-papeis.md)            | Auth / RBAC     | 📋 Backlog |
| 08  | [Manifest, publish & catálogo](./08-manifest-publish.md)      | Deploy          | 📋 Backlog |

> **Veredito da auditoria:** domínio **cabe hoje** no CRUD genérico (sem estender o
> gateway), mas a implementação atual diverge do contrato (TanStack Start/SSR,
> localStorage, sem auth, sem schema). As stories 04–08 fecham esses gaps na ordem.
