# Story 01 — Tema de cores claro

**Status:** ✅ Concluído
**Área:** CSS / Theming
**Arquivo central:** `src/styles.css`

## História

> **Como** usuário da plataforma,
> **quero** que a interface tenha um visual claro, com mais branco e tons de
> ciano-esverdeado / verde claro,
> **para que** o app combine com a identidade visual da plataforma e não fique
> tão escuro/pesado.

## Contexto atual

O tema é escuro e fixo, definido em `src/styles.css`:

- `--background: #0b0f16` (fundo quase preto)
- `--background-secondary: #0f1522`, `--background-tertiary: #121a2a`
- `--card: #141b2a`, `--card-hover: #182132`, `--card-elevated: #1c2436`
- `--sidebar-bg: #0d1420` (sidenav escuro)
- `--foreground: #e5e7eb` (texto claro sobre fundo escuro)
- `--primary: #16c784` (verde)
- Há um bloco `body` com gradientes radiais escuros e `@theme inline` mapeando
  todos os tokens para variáveis CSS.

Não existe variante de tema claro — `.dark` apenas repete o fundo escuro.

## O que fazer

Reescrever a paleta base (`:root`) de `src/styles.css` para um tema **claro**:

- **Fundo:** branco / quase branco (ex.: branco com leve tom esverdeado).
- **Cards e superfícies:** brancos, com bordas suaves e claras (em vez dos
  cinzas-escuros atuais).
- **Acento:** manter o verde como cor primária, mas puxando para
  **ciano-esverdeado / verde claro**, com mais "claridade".
- **Sidenav (`--sidebar-bg`):** um **verde bem suave** (verde claro/pastel),
  não branco puro e não escuro — deve se destacar levemente do fundo.
- **Texto (`--foreground`, `--secondary-fg`, `--muted-fg`):** inverter para
  tons escuros legíveis sobre fundo claro (contraste adequado).
- **Bordas (`--border`, `--border-light`):** claras e suaves.
- Ajustar o gradiente de fundo do `body` e o `glow-primary` para o esquema
  claro (gradientes/glows mais sutis e claros).

## Critérios de aceite

- [ ] Fundo geral da aplicação é claro (branco / quase branco).
- [ ] Cards e o header usam superfícies claras com bordas suaves.
- [ ] Sidenav tem um tom de **verde bem suave**, distinto do fundo.
- [ ] Cor primária mantém o verde, com aparência mais clara/ciano-esverdeada.
- [ ] Textos têm contraste legível sobre o novo fundo claro (sem texto claro
      "sumindo" no branco).
- [ ] Estados de hover/ativo do menu continuam visíveis no tema claro.
- [ ] Badges de status (`completed`, `info`, `warning`, `danger`) continuam
      legíveis.

## Notas / decisões em aberto

- ~~Definir se o tema claro substitui o escuro ou se haverá toggle.~~
  **Decisão fechada (25/06/2026):** o tema claro **substitui de vez** o escuro.
  Remover o bloco `.dark` e qualquer vestígio de dark mode do CSS.
- Validar os valores finais de cor (hex/oklch) contra a identidade da
  plataforma antes de fechar.
