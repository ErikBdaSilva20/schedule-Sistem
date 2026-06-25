# Story 03 — Sidenav colapsável no mobile

**Status:** ✅ Concluído
**Área:** Responsividade
**Arquivos centrais:** `src/components/AppShell.tsx`, `src/hooks/use-mobile.tsx`, `src/components/ui/sheet.tsx`

## História

> **Como** usuário em celular,
> **quero** um menu lateral que possa abrir e fechar,
> **para que** eu consiga navegar sem que o menu ocupe a tela inteira.

## Contexto atual

Em `src/components/AppShell.tsx`, o `<aside>` usa `hidden ... md:flex`:

```
<aside className="... hidden h-screen w-64 ... md:flex">
```

Ou seja, no mobile (< 768px) o menu **simplesmente desaparece** e **não há
nenhuma forma de navegar** — não existe botão de menu nem versão colapsada.

Recursos já disponíveis no projeto para reaproveitar:

- `src/hooks/use-mobile.tsx` → `useIsMobile()` (breakpoint 768px).
- `src/components/ui/sheet.tsx` → drawer lateral (shadcn) ideal para o menu
  off-canvas no mobile.
- `src/components/ui/sidebar.tsx` → componente de sidebar do shadcn (avaliar se
  vale adotar ou se basta `Sheet` + estado local).

## O que fazer

- Adicionar um **botão de menu (hambúrguer)** no header (`<header>` do
  `AppShell`), visível apenas no mobile.
- No mobile, exibir a navegação dentro de um **drawer/`Sheet`** que abre e
  fecha (off-canvas), em vez do `<aside>` fixo.
- No desktop (≥ 768px), manter a sidenav fixa atual.
- Fechar o drawer automaticamente ao navegar para uma rota (clicar num item).
- Garantir overlay/backdrop e fechamento por toque fora ou tecla Esc.

## Critérios de aceite

- [ ] Em telas < 768px, existe um botão de menu visível no header.
- [ ] Tocar no botão abre o menu lateral (drawer) sobre o conteúdo.
- [ ] É possível fechar o menu (botão, clique fora ou Esc).
- [ ] Selecionar um item de navegação fecha o drawer e navega.
- [ ] Em telas ≥ 768px o comportamento atual (sidenav fixa) é preservado.
- [ ] Sem scroll horizontal ou conteúdo cortado no mobile.
- [ ] Estado ativo do item de menu continua destacado no mobile.

## Notas / decisões em aberto

- Definir se reaproveitamos `ui/sheet.tsx` (mais leve) ou adotamos o
  `ui/sidebar.tsx` completo do shadcn.
- Esta story interage com a Story 01 (cores) e 02 (textos): o menu mobile deve
  herdar o tema claro e os labels traduzidos.
