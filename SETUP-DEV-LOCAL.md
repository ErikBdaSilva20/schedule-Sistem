# SETUP-DEV-LOCAL — Receita reutilizável de ambiente local (qualquer clone-template Masia)

> **O que é:** um arquivo **único e portátil**. Copie-o para a raiz de **qualquer projeto**
> construído sobre o `Importantdoc.md` (SPA Vite + React 19 + gateway) e diga à IA:
> **"Leia o `SETUP-DEV-LOCAL.md` e execute."**
>
> **O que a IA faz com ele:** lê o schema **daquele** projeto, **adapta** os artefatos de
> ambiente local (Docker Postgres + mock do gateway em Hono + Beekeeper), respeitando **à risca**
> as regras do `Importantdoc.md`, e no fim **gera um `DEV_LOCAL.md` passo-a-passo** específico do
> projeto para você rodar.
>
> **Por que existe:** em produção cada cliente tem 1 banco **Neon**. Localmente a gente **simula
> o Neon** com **Postgres 16 no Docker** e um **mock do `tenant-gateway`** (mesmo contrato:
> injeta `owner_id` pela sessão, expõe `/data/:table` e `/auth/*`). O **Beekeeper Studio** entra
> como cliente visual do banco. Nada disso vai pra produção — é só para você testar o CRUD real.

---

## 0. Modelo mental (o que estamos reproduzindo)

```
PRODUÇÃO:   [SPA Vite]  --HTTPS-->  [tenant-gateway (Hono)]  --SQL-->  [Neon do tenant]
LOCAL:      [SPA Vite]  --HTTP -->  [src/server.ts (Hono mock)] --SQL--> [Postgres 16 Docker]
            :5173                    :3000                                :5432  (+ Beekeeper)
```

O mock **não reimplementa** o gateway inteiro — só o suficiente pra o app rodar igual:

- `POST /auth/sign-up/email`, `POST /auth/sign-in/email`, `GET /auth/me`, `POST /auth/sign-out`
- `GET/POST/PATCH/DELETE /data/:table` (modo genérico, **plano**, **sem get-by-id**)
- **injeta `owner_id` pela sessão** (o front nunca manda) e, em dev, usa o 1º usuário como fallback
- **CORS com origin específica + `credentials: include`** (senão o cookie de sessão não cola)

> ⚠️ O `src/lib/data/client.ts` é **PROTEGIDO** (contrato com o gateway). **Não edite.** Ele já lê
> `import.meta.env.VITE_GATEWAY_URL` — basta apontar pra `http://localhost:3000` via `.env`.

---

## 1. MISSÃO DA IA (execute nesta ordem)

1. **Detectar** o projeto (§2) — descobrir tabelas, colunas, lookups, gerenciador de pacotes.
2. **Classificar** cada tabela (§3) — negócio (tem `owner_id`) vs lookup (read-only, sem `owner_id`).
3. **Gerar/adaptar os artefatos** (§4) — docker-compose, migration, mock server, tsconfig, scripts, `.env`.
4. **Conferir contra o `Importantdoc.md`** (§5) — owner_id text, sem RLS, snake_case, nomes reservados.
5. **Gerar o `DEV_LOCAL.md`** específico do projeto (§6) — o passo-a-passo que o humano vai rodar.
6. **Reportar** (§7) — resumo do que criou/alterou + bloco "Próximos passos" pro humano.

> **Regra de ouro:** **nunca invente colunas.** A **fonte da verdade** é o
> `src/lib/data/types.gen.ts`. A migration **tem que bater 1:1** com ele (mesmas tabelas, mesmas
> colunas, mesmos nullables). Se `types.gen.ts` e uma migration antiga divergirem, **o `types.gen.ts`
> vence** e você sinaliza a divergência no relatório.

---

## 2. DETECÇÃO (leia estes arquivos antes de gerar nada)

| Arquivo | O que extrair |
| --- | --- |
| `src/lib/data/types.gen.ts` | **Fonte da verdade**: nomes de tabelas + colunas + tipos + nullable. |
| `src/lib/data/*.repo.ts` | Quais tabelas o app realmente usa (`db.table('<x>')`). |
| `src/lib/data/client.ts` | Confirmar contrato: endpoints `/data/:table`, header `X-Tenant-Id`, `VITE_GATEWAY_URL`. **(protegido — só leitura)** |
| `supabase/migrations/*.sql` | Se já existir, use como base — mas valide contra `types.gen.ts`. |
| `masi.template.json` | `id` (slug do projeto) → usado pra nomear container/volume. |
| `package.json` | Gerenciador (pnpm/npm/yarn), scripts existentes, deps já presentes. |
| `src/mock/fixtures.ts` (se houver) | Bom material pra **seed** opcional do banco local. |

**Como ler tipos/colunas a partir do `types.gen.ts`:** cada tabela aparece como
`Tables['<tabela>']['Row']` com o conjunto de colunas e tipos TS. Mapeie os tipos:

| Tipo TS no `types.gen.ts` | Coluna Postgres |
| --- | --- |
| `string` | `text` |
| `string \| null` | `text` (nullable) |
| `number` | `numeric` (ou `integer` se claramente contagem/ordem) |
| `boolean` | `boolean` |
| `string` em coluna `id` | `uuid` (negócio) **ou** `text` (tabela `"user"`) |
| `created_at` / `updated_at` | `timestamptz not null default now()` |

---

## 3. CLASSIFICAÇÃO DE TABELAS (decide o comportamento do mock)

Para **cada** tabela do `types.gen.ts`, classifique:

- **Tabela de NEGÓCIO** → tem `owner_id` (usuário escreve). Entra em `TABLES_WITH_OWNER`.
  Ordena por `created_at DESC`. Recebe `updated_at = NOW()` no PATCH.
- **Tabela LOOKUP** → sem `owner_id` (status, estágios, categorias, temas). Read-only pro `rep`.
  **Não** entra em `TABLES_WITH_OWNER`. Ordena pela coluna natural (`ordem`/`posicao`) **se existir**,
  senão sem `ORDER BY`. Pode ser **semeada** na migration.
- **Tabela `"user"`** → especial (auth). `id text`, **com aspas**. Não é negócio nem lookup comum.

> **Gotcha §B4.1 (o que mais quebra):** **tabela-filha também precisa de `owner_id`** se o `rep`
> escreve nela (subtasks, itens_pedido, comentários, anexos…). Se a filha tem `owner_id` no
> `types.gen.ts`, ela é **negócio**, não lookup.

Monte dois mapas que vão alimentar o mock:

```
TABLES_WITH_OWNER = { ...todas as tabelas de negócio... }
LOOKUP_ORDER      = { <tabela_lookup>: "<coluna_de_ordem>", ... }   // só as que têm coluna de ordem
```

---

## 4. ARTEFATOS A GERAR (templates — preencha os trechos marcados `<<…>>`)

### CONFIG DO PROJETO (preencha primeiro)

```
SLUG          = <<masi.template.json .id  |  ou nome da pasta>>
DB_CONTAINER  = masia_local_db_<<SLUG>>
DB_NAME       = tenant_local
DB_USER       = masia
DB_PASS       = masia_dev
DB_PORT       = 5432    # se for rodar 2 projetos ao mesmo tempo, incremente (5433, 5434…)
PKG           = <<pnpm | npm | yarn — detectado do lockfile>>
```

### 4.1 `docker-compose.yml` (raiz)

```yaml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    container_name: <<DB_CONTAINER>>
    environment:
      POSTGRES_USER: <<DB_USER>>
      POSTGRES_PASSWORD: <<DB_PASS>>
      POSTGRES_DB: <<DB_NAME>>
    ports:
      - "<<DB_PORT>>:5432"
    volumes:
      - masia_pgdata_<<SLUG>>:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U <<DB_USER>> -d <<DB_NAME>>"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  masia_pgdata_<<SLUG>>:
```

### 4.2 `supabase/migrations/0001_init.sql` (derive do `types.gen.ts`)

Estrutura **obrigatória**, nesta ordem: `"user"` primeiro → tabelas de negócio → lookups → índices → seed.

```sql
-- "user": id TEXT (Better-Auth). SEMPRE com aspas. Tabela de auth — mock simples (password em texto, só local).
CREATE TABLE IF NOT EXISTS "user" (
  id text primary key default gen_random_uuid()::text,
  name text not null,
  email text unique not null,
  password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Para CADA tabela de negócio (tem owner_id no types.gen.ts) ===
CREATE TABLE IF NOT EXISTS <<tabela>> (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null references "user"(id) on delete cascade,  -- ⚠️ TEXT + "user" com aspas
  <<...demais colunas exatamente como no types.gen.ts (nullable onde for `| null`)...>>
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Para CADA tabela lookup (SEM owner_id) ===
CREATE TABLE IF NOT EXISTS <<lookup>> (
  id uuid primary key default gen_random_uuid(),
  <<...colunas do types.gen.ts (ex: nome, cor, ordem)...>>
);

-- Índices: um por tabela de negócio
CREATE INDEX IF NOT EXISTS idx_<<tabela>>_owner ON <<tabela>>(owner_id);

-- Seed dos lookups (se o projeto tiver estágios/status fixos — pegue de fixtures.ts / data/*.ts)
INSERT INTO <<lookup>> (<<cols>>) VALUES <<...>>;
```

**Regras §B4 (não viole):** `owner_id text references "user"(id) on delete cascade` em **toda**
tabela escrita pelo rep (inclusive filhas); **sem RLS, sem `auth.uid()`, sem `profiles`**;
**snake_case** (`^[a-z_][a-z0-9_]*$`); **nomes proibidos** (`user, session, account, verification,
organization, member, invitation` — exceto o `"user"` de auth); FKs entre tabelas de negócio são OK
(ex: `candidato_id uuid references candidatos(id)`), mas **denormalize** o que a UI mostra (ex:
`candidato_nome text`) porque o modo genérico **não faz join**.

### 4.3 `tsconfig.server.json` (raiz) — para rodar o `server.ts` em Node

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node"]
  }
}
```

### 4.4 `src/server.ts` (mock do gateway — genérico; só os 2 mapas mudam por projeto)

```ts
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { getCookie, setCookie } from "hono/cookie";
import { Pool } from "pg";

const app = new Hono();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://<<DB_USER>>:<<DB_PASS>>@localhost:<<DB_PORT>>/<<DB_NAME>>",
});

// Sessões em memória: token → user_id
const sessions = new Map<string, string>();

// ⬇️ ÚNICO trecho específico do projeto — preencha a partir da §3
const TABLES_WITH_OWNER = new Set<string>([<<"tab1", "tab2", ...negócio>>]);
const LOOKUP_ORDER: Record<string, string> = { <<lookup: "ordem", ...>> };

// CORS — origin específica para o cookie de sessão funcionar
app.use("*", async (c, next) => {
  const origin = c.req.header("origin") || "http://localhost:5173";
  c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Credentials", "true");
  c.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type,X-Tenant-Id");
  if (c.req.method === "OPTIONS") return c.text("OK");
  await next();
});

// Resolve owner_id da sessão; em dev, cai no 1º usuário do banco
async function resolveOwner(c: Parameters<typeof getCookie>[0]): Promise<string | null> {
  const token = getCookie(c, "session");
  if (token) {
    const userId = sessions.get(token);
    if (userId) return userId;
  }
  const result = await pool.query(`SELECT id FROM "user" LIMIT 1`);
  return result.rows[0]?.id ?? null;
}

app.get("/health", (c) => c.json({ status: "ok" }));

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post("/auth/sign-up/email", async (c) => {
  const { name, email, password } = await c.req.json();
  try {
    const r = await pool.query(
      `INSERT INTO "user" (name, email, password) VALUES ($1,$2,$3) RETURNING id, name, email`,
      [name, email, password],
    );
    const user = r.rows[0];
    const token = crypto.randomUUID();
    sessions.set(token, user.id);
    setCookie(c, "session", token, { httpOnly: true, sameSite: "Lax", maxAge: 60 * 60 * 24 * 7 });
    return c.json({ user });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post("/auth/sign-in/email", async (c) => {
  const { email, password } = await c.req.json();
  try {
    const r = await pool.query(`SELECT * FROM "user" WHERE email = $1`, [email]);
    if (!r.rows.length) return c.json({ error: "Usuário não encontrado" }, 401);
    const user = r.rows[0];
    if (user.password !== password) return c.json({ error: "Senha incorreta" }, 401);
    const token = crypto.randomUUID();
    sessions.set(token, user.id);
    setCookie(c, "session", token, { httpOnly: true, sameSite: "Lax", maxAge: 60 * 60 * 24 * 7 });
    return c.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.get("/auth/me", async (c) => {
  try {
    const userId = await resolveOwner(c);
    if (!userId) return c.json(null);
    const r = await pool.query(`SELECT id, name, email FROM "user" WHERE id = $1`, [userId]);
    if (!r.rows.length) return c.json(null);
    return c.json({ user: r.rows[0], role: "admin" });
  } catch { return c.json(null); }
});

app.post("/auth/sign-out", (c) => {
  const token = getCookie(c, "session");
  if (token) sessions.delete(token);
  setCookie(c, "session", "", { maxAge: 0 });
  return c.text("OK");
});

// ── CRUD genérico (plano, sem get-by-id) ───────────────────────────────────────
app.get("/data/:table", async (c) => {
  const table = c.req.param("table");
  try {
    let order = "";
    if (TABLES_WITH_OWNER.has(table)) order = "ORDER BY created_at DESC";
    else if (LOOKUP_ORDER[table]) order = `ORDER BY ${LOOKUP_ORDER[table]} ASC`;
    const r = await pool.query(`SELECT * FROM ${table} ${order}`);
    return c.json(r.rows);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.post("/data/:table", async (c) => {
  const table = c.req.param("table");
  const body = await c.req.json();
  if (TABLES_WITH_OWNER.has(table)) {
    const ownerId = await resolveOwner(c);
    if (!ownerId) return c.json({ error: "Unauthorized" }, 401);
    body.owner_id = ownerId; // front NUNCA manda owner_id
  }
  try {
    const cols = Object.keys(body);
    const vals = Object.values(body);
    const ph = cols.map((_, i) => `$${i + 1}`).join(", ");
    const r = await pool.query(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${ph}) RETURNING *`, vals,
    );
    return c.json(r.rows[0]);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.patch("/data/:table/:id", async (c) => {
  const table = c.req.param("table");
  const id = c.req.param("id");
  const body = await c.req.json();
  delete body.owner_id; delete body.id; // não deixa o front sobrescrever
  try {
    const cols = Object.keys(body);
    const vals = Object.values(body);
    const set = cols.map((col, i) => `${col} = $${i + 1}`).join(", ");
    const touch = TABLES_WITH_OWNER.has(table) ? `, updated_at = NOW()` : "";
    const r = await pool.query(
      `UPDATE ${table} SET ${set}${touch} WHERE id = $${cols.length + 1} RETURNING *`,
      [...vals, id],
    );
    if (!r.rows.length) return c.json({ error: "Not found" }, 404);
    return c.json(r.rows[0]);
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

app.delete("/data/:table/:id", async (c) => {
  const table = c.req.param("table");
  const id = c.req.param("id");
  try {
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return c.text("OK");
  } catch (e: any) { return c.json({ error: e.message }, 500); }
});

const port = 3000;
console.log(`Mock gateway em http://localhost:${port}`);
serve({ fetch: app.fetch, port });
```

> ⚠️ Este mock concatena `:table` no SQL — **é só para dev local**. Não use em produção; o gateway
> real valida tabela/coluna contra allow-list. Em dev o risco é nulo (banco efêmero, sem dados reais).

### 4.5 `package.json` — scripts + dependências

Adicione (sem remover o que já existe). Use o gerenciador detectado (`<<PKG>>`):

```jsonc
{
  "scripts": {
    "dev": "concurrently -n server,frontend -c blue,green \"<<PKG>> dev:server\" \"<<PKG>> dev:frontend\"",
    "dev:server": "tsx watch --env-file .env src/server.ts",
    "dev:frontend": "vite dev"
    // mantenha "build", "preview" etc. já existentes
  }
}
```

Deps que precisam existir (instale as que faltarem):

- runtime: `hono`, `@hono/node-server`, `pg`
- dev: `tsx`, `concurrently`, `@types/pg`

```
<<PKG>> add hono @hono/node-server pg          # deps
<<PKG>> add -D tsx concurrently @types/pg       # dev (npm: use -D ; pnpm/yarn: -D também)
```

### 4.6 `.env` (raiz) — lido pelo `tsx` (server) **e** pelo Vite (front)

```
DATABASE_URL=postgresql://<<DB_USER>>:<<DB_PASS>>@localhost:<<DB_PORT>>/<<DB_NAME>>
VITE_GATEWAY_URL=http://localhost:3000
```

> Adicione `.env` ao `.gitignore` se ainda não estiver. Opcional: crie um `.env.example` sem segredos.

---

## 5. CONFERÊNCIA CONTRA O `Importantdoc.md` (faça antes de finalizar)

- [ ] `owner_id text not null references "user"(id) on delete cascade` em **toda** tabela de negócio (inclusive filhas).
- [ ] **Zero** `owner_id uuid` / `references auth.users` / RLS / `auth.uid()` / `profiles`.
- [ ] Todas as tabelas em **snake_case**; nenhum nome reservado (exceto `"user"` de auth, com aspas).
- [ ] Migration bate **1:1** com `src/lib/data/types.gen.ts` (tabelas, colunas, nullables).
- [ ] Lookups **sem** `owner_id` e tratadas como read-only (só no `LOOKUP_ORDER`, fora do `TABLES_WITH_OWNER`).
- [ ] `client.ts` / `types.gen.ts` **não foram tocados** (protegidos).
- [ ] Nenhuma tela depende de `GET /data/:table/:id` (modo genérico é plano, list-then-filter).
- [ ] `vite build` (ou `<<PKG>> build`) passa **sem imports não usados** (TS strict quebra build).

---

## 6. SAÍDA OBRIGATÓRIA — gerar `DEV_LOCAL.md` específico do projeto

Depois de criar os artefatos, **escreva** um `DEV_LOCAL.md` na raiz, **já preenchido com os valores
reais** do projeto (tabelas, container, porta). Use este esqueleto:

````markdown
# DEV LOCAL — <<SLUG>>

Guia para subir o ambiente local, validar o CRUD e confirmar as regras do `Importantdoc.md`.

## Arquitetura local
[SPA Vite :5173] → [Hono mock :3000] → [Postgres 16 Docker :<<DB_PORT>>]

## 1. Pré-requisitos
- Docker Desktop rodando
- Node 20+ e <<PKG>> instalados
- `<<PKG>> install` já executado

## 2. Subir o banco
```bash
docker compose up -d
docker compose ps        # <<DB_CONTAINER>> deve ficar "healthy"
```
Conexão: `postgresql://<<DB_USER>>:<<DB_PASS>>@localhost:<<DB_PORT>>/<<DB_NAME>>`

## 3. Criar as tabelas (1ª vez ou após reset)
```bash
docker exec -i <<DB_CONTAINER>> psql -U <<DB_USER>> -d <<DB_NAME>> < supabase/migrations/0001_init.sql
```
Tabelas: <<listar tabelas + tipo (negócio/lookup) + owner_id sim/não>>

## 4. Criar usuário admin (1ª vez)
```bash
docker exec -i <<DB_CONTAINER>> psql -U <<DB_USER>> -d <<DB_NAME>> -c \
  "INSERT INTO \"user\" (name, email, password) VALUES ('Admin','admin@local.dev','senha123');"
```

## 5. Rodar o projeto
```bash
<<PKG>> dev           # server + frontend juntos
# ou: <<PKG>> dev:server  /  <<PKG>> dev:frontend
```
Front: http://localhost:5173 · Mock: http://localhost:3000

## 6. Conectar o Beekeeper Studio (PostgreSQL)
Host `localhost` · Port `<<DB_PORT>>` · User `<<DB_USER>>` · Password `<<DB_PASS>>` · Database `<<DB_NAME>>`

## 7. Verificação rápida dos endpoints
```bash
curl http://localhost:3000/health                       # {"status":"ok"}
curl http://localhost:3000/auth/me                      # {"user":{...},"role":"admin"}
curl http://localhost:3000/data/<<tabela_negocio>>      # [] no início
curl -X POST http://localhost:3000/data/<<tabela_negocio>> \
  -H "Content-Type: application/json" -d '<<json mínimo válido p/ a tabela>>'
```

## 8. Checklist regras do Importantdoc.md
- `\d <<tabela_negocio>>` → `owner_id` é **text**, FK em `"user"(id)`, sem RLS/`auth.uid()`.
- `owner_id` preenchido pelo server (crie pelo app e confira no banco que veio sem o front mandar).
- `\d <<tabela_lookup>>` → **sem** coluna `owner_id`.
- `<<PKG>> build` passa sem imports não usados.

## 9. Reset completo
```bash
docker exec <<DB_CONTAINER>> psql -U <<DB_USER>> -d <<DB_NAME>> -c \
  "DROP TABLE IF EXISTS <<todas as tabelas em ordem inversa de FK>>, \"user\" CASCADE;"
docker exec -i <<DB_CONTAINER>> psql -U <<DB_USER>> -d <<DB_NAME>> < supabase/migrations/0001_init.sql
# recriar admin (passo 4)
```

## 10. Troubleshooting
| Sintoma | Causa | Solução |
| --- | --- | --- |
| `connection refused` :3000 | server fora | `<<PKG>> dev:server` |
| `connection refused` :<<DB_PORT>> | Docker fora | `docker compose up -d` |
| `EADDRINUSE :3000` | processo pendurado | `npx kill-port 3000` |
| `null value in column "owner_id"` | sem usuário no banco | rode o INSERT do admin (passo 4) |
| lista vazia no front | banco vazio | crie dados via curl (passo 7) ou seed |
| Beekeeper não conecta | container não healthy | `docker compose ps` / `docker compose restart` |
````

---

## 7. RELATÓRIO FINAL (o que a IA devolve pro humano)

Ao terminar, responda com:

1. **Tabelas detectadas** — lista com classificação (negócio/lookup) e `owner_id` sim/não.
2. **Arquivos criados/alterados** — `docker-compose.yml`, `supabase/migrations/0001_init.sql`,
   `src/server.ts`, `tsconfig.server.json`, `package.json` (scripts/deps), `.env`, `DEV_LOCAL.md`.
3. **Divergências encontradas** — ex.: migration antiga ≠ `types.gen.ts` (e qual venceu).
4. **Próximos passos (copie/cole)** — os comandos que o humano roda agora:
   ```bash
   <<PKG>> install
   docker compose up -d
   docker exec -i <<DB_CONTAINER>> psql -U <<DB_USER>> -d <<DB_NAME>> < supabase/migrations/0001_init.sql
   docker exec -i <<DB_CONTAINER>> psql -U <<DB_USER>> -d <<DB_NAME>> -c "INSERT INTO \"user\" (name,email,password) VALUES ('Admin','admin@local.dev','senha123');"
   <<PKG>> dev
   ```

---

## 8. Regras que a IA NÃO pode quebrar (resumo de bolso)

- ❌ Editar `client.ts` / `types.gen.ts` / `registry.tsx` / `main.tsx` (protegidos).
- ❌ `owner_id uuid` ou `references auth.users` — é **`text references "user"(id)`**.
- ❌ RLS / `auth.uid()` / `profiles` — autz é no gateway (aqui, no mock).
- ❌ Tabela-filha escrita pelo rep **sem** `owner_id`.
- ❌ Endpoint/tela com get-by-id ou join no banco — modo genérico é **plano**.
- ❌ Mandar `owner_id` do front — o server injeta pela sessão.
- ❌ Inventar coluna que não está no `types.gen.ts`.
- ✅ Migration = espelho do `types.gen.ts`; lookups read-only; `.env` aponta o `VITE_GATEWAY_URL` pra `:3000`.
```
