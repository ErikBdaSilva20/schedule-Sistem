# DEV LOCAL — appointment-hub

Guia para subir o ambiente local, validar o CRUD e confirmar as regras do `Importantdoc.md`.

## Arquitetura local

```
[SPA Vite :5173] → [Hono mock :3000] → [Postgres 16 Docker :5432]
```

## 1. Pré-requisitos

- Docker Desktop rodando
- Node 20+ e pnpm instalados
- `pnpm install` já executado

## 2. Subir o banco

```bash
docker compose up -d
docker compose ps        # masia_local_db_appointment-hub deve ficar "healthy"
```

Conexão: `postgresql://masia:masia_dev@localhost:5432/tenant_local`

## 3. Criar as tabelas (1ª vez ou após reset)

```bash
docker exec -i masia_local_db_appointment-hub psql -U masia -d tenant_local < supabase/migrations/0001_init.sql
```

Tabelas criadas:
| Tabela | Tipo | owner_id |
|---|---|---|
| `"user"` | auth (mock local) | N/A |
| `services` | lookup | não |
| `team_members` | lookup | não |
| `clients` | negócio | sim (text → "user") |
| `appointments` | negócio | sim (text → "user") |

## 4. Criar usuário admin (1ª vez)

```bash
docker exec -i masia_local_db_appointment-hub psql -U masia -d tenant_local -c \
  "INSERT INTO \"user\" (name, email, password) VALUES ('Admin','admin@local.dev','senha123');"
```

## 5. Rodar o projeto

```bash
pnpm install          # instala hono, pg, tsx, concurrently (se ainda não instalou)
pnpm dev              # server + frontend juntos (Ctrl+C para parar)
# ou separados:
# pnpm dev:server       → mock gateway em :3000
# pnpm dev:frontend     → Vite em :5173
```

Front: http://localhost:5173 · Mock: http://localhost:3000

Login: `admin@local.dev` / `senha123`

## 6. Conectar o Beekeeper Studio (PostgreSQL)

| Campo    | Valor          |
| -------- | -------------- |
| Host     | `localhost`    |
| Port     | `5432`         |
| User     | `masia`        |
| Password | `masia_dev`    |
| Database | `tenant_local` |

## 7. Verificação rápida dos endpoints

```bash
# Health
curl http://localhost:3000/health
# → {"status":"ok"}

# Usuário logado (usa o 1º usuário como fallback em dev)
curl http://localhost:3000/auth/me
# → {"user":{...},"role":"admin"}

# Lookups (sem autenticação, sem owner)
curl http://localhost:3000/data/services
curl http://localhost:3000/data/team_members

# Negócio — lista vazia no início
curl http://localhost:3000/data/clients

# Criar cliente (owner_id injetado pelo server)
curl -X POST http://localhost:3000/data/clients \
  -H "Content-Type: application/json" \
  -d '{"full_name":"João Silva","email":"joao@test.com","phone":"11999999999","company":"Acme","notes":""}'

# Criar serviço (lookup — sem owner_id)
curl -X POST http://localhost:3000/data/services \
  -H "Content-Type: application/json" \
  -d '{"name":"Corte de Cabelo","description":"","duration_minutes":30,"price":50,"color":"#16c784","active":true}'
```

## 8. Checklist regras do Importantdoc.md

```bash
# owner_id é text, FK em "user"(id), sem RLS
docker exec -i masia_local_db_appointment-hub psql -U masia -d tenant_local -c "\d clients"
docker exec -i masia_local_db_appointment-hub psql -U masia -d tenant_local -c "\d appointments"

# lookups sem owner_id
docker exec -i masia_local_db_appointment-hub psql -U masia -d tenant_local -c "\d services"
docker exec -i masia_local_db_appointment-hub psql -U masia -d tenant_local -c "\d team_members"

# build TypeScript sem erros
pnpm build
```

- Crie um cliente pelo app e confira no Beekeeper que `owner_id` veio preenchido sem o front mandar.
- `services` e `team_members` não têm coluna `owner_id`.

## 9. Reset completo

```bash
docker exec masia_local_db_appointment-hub psql -U masia -d tenant_local -c \
  "DROP TABLE IF EXISTS appointments, clients, services, team_members, \"user\" CASCADE;"
docker exec -i masia_local_db_appointment-hub psql -U masia -d tenant_local < supabase/migrations/0001_init.sql
# recriar admin (passo 4)
```

## 10. Troubleshooting

| Sintoma                                           | Causa                                  | Solução                                                              |
| ------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------- |
| `connection refused` :3000                        | server fora                            | `pnpm dev:server`                                                    |
| `connection refused` :5432                        | Docker fora                            | `docker compose up -d`                                               |
| `EADDRINUSE :3000`                                | processo pendurado                     | `npx kill-port 3000`                                                 |
| `null value in column "owner_id"`                 | sem usuário no banco                   | rode o INSERT do admin (passo 4)                                     |
| lista vazia no front                              | banco vazio                            | crie dados via curl (passo 7) ou pelo app                            |
| Beekeeper não conecta                             | container não healthy                  | `docker compose ps` / `docker compose restart`                       |
| `violates foreign key constraint` em appointments | client/service/team_member não existem | crie primeiro os lookups e clientes                                  |
| Cookie de sessão não cola                         | CORS sem `credentials: include`        | já configurado no `client.ts` — verifique VITE_GATEWAY_URL no `.env` |
