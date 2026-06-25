# Story 02 — Tradução para Português (PT-BR)

**Status:** ✅ Concluído
**Área:** i18n / Conteúdo
**Arquivos centrais:** `src/components/AppShell.tsx`, `src/routes/*.tsx`, `src/components/*.tsx`

## História

> **Como** usuário brasileiro,
> **quero** que toda a interface esteja em português,
> **para que** eu consiga usar o sistema sem barreira de idioma.

## Contexto atual

Toda a UI está em inglês. Pontos identificados:

- **Navegação** (`src/components/AppShell.tsx`): `Dashboard`, `Calendar`,
  `Appointments`, `Clients`, `Services`, `Team`; além de `Workspace`,
  `Operations Console`, `Template ready`, `Live workspace`, `Jump anywhere`.
- **Rotas** (`src/routes/`):
  - `index.tsx` — KPIs e meta: `Today`, `Upcoming`, `This Month`, `Completed`,
    `Total Clients`, `Active Services`, `Team Members`, títulos/descrições de
    `<head>`.
  - `calendar.tsx`, `appointments.tsx`, `clients.tsx`, `services.tsx`,
    `team.tsx` — títulos, cabeçalhos, labels, botões e estados vazios.
- **Componentes**: `PageHeader.tsx`, `EmptyState.tsx`, `StatusBadge.tsx`,
  `ui-kit.tsx` — textos visíveis.
- **Meta tags** (`title` / `description`) em cada rota.

## O que fazer

- Traduzir **todo texto visível ao usuário** para PT-BR.
- Incluir títulos de página (`<head>`/meta), labels de navegação, botões,
  placeholders, mensagens de estado vazio e badges de status.
- Localizar formatos de **data/hora** (`date-fns`) para PT-BR
  (usar `locale` pt-BR no `format`), pois o app usa `date-fns` no dashboard e
  no calendário.
- Padronizar terminologia (glossário sugerido abaixo).

### Glossário sugerido

| Inglês        | Português            |
| ------------- | -------------------- |
| Dashboard     | Painel               |
| Calendar      | Agenda / Calendário  |
| Appointments  | Agendamentos         |
| Clients       | Clientes             |
| Services      | Serviços             |
| Team          | Equipe               |
| Today         | Hoje                 |
| Upcoming      | Próximos             |
| This Month    | Este Mês             |
| Completed     | Concluídos           |

## Critérios de aceite

- [ ] Nenhum texto visível ao usuário permanece em inglês nas 6 rotas + shell.
- [ ] Labels do menu lateral traduzidos.
- [ ] Títulos e descrições de `<head>` (meta tags) traduzidos.
- [ ] Datas e horas exibidas em formato/idioma PT-BR.
- [ ] Estados vazios e badges de status traduzidos.
- [ ] Terminologia consistente entre telas (mesma palavra para o mesmo
      conceito).

## Notas / decisões em aberto

- Definir abordagem: **tradução direta nas strings** (mais simples, suficiente
  para um único idioma) **ou** introduzir uma camada de i18n
  (ex.: dicionário/`react-i18next`) caso haja intenção futura de multi-idioma.
  _(Pedido atual é só PT-BR → tradução direta tende a bastar.)_
- Decidir entre "Agenda" e "Calendário" para a rota `/calendar`.
