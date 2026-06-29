import { serve } from "@hono/node-server";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { Pool } from "pg";

const app = new Hono();

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://masia:masia_dev@localhost:5432/tenant_local",
});

// ── Password hashing (scrypt — Node built-in, sem dependência extra) ──────────
function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const derived = scryptSync(plain, salt, 64);
    const storedBuf = Buffer.from(hash, "hex");
    if (derived.length !== storedBuf.length) return false;
    return timingSafeEqual(derived, storedBuf); // timing-safe — previne timing attacks
  } catch {
    return false;
  }
}

// ── Sessões em memória: token → user_id ──────────────────────────────────────
const sessions = new Map<string, string>();

// ── Allowlists — única defesa contra SQL injection via parâmetros de rota ────
// Tabelas que o CRUD genérico pode tocar
const ALLOWED_TABLES = new Set(["clients", "appointments", "services", "team_members"]);

// Colunas graváveis por tabela (id, owner_id, created_at, updated_at são gerenciados pelo server)
const WRITABLE_COLUMNS: Record<string, Set<string>> = {
  clients: new Set(["full_name", "email", "phone", "company", "notes"]),
  appointments: new Set([
    "client_id",
    "service_id",
    "team_member_id",
    "title",
    "notes",
    "appointment_date",
    "appointment_time",
    "duration_minutes",
    "status",
  ]),
  services: new Set(["name", "description", "duration_minutes", "price", "color", "active"]),
  team_members: new Set(["full_name", "email", "role", "specialty", "active"]),
};

// Tabelas cujo rep escreve (recebem owner_id injetado)
const TABLES_WITH_OWNER = new Set(["clients", "appointments"]);

// ── CORS — allowlist explícita; nunca refletir origem arbitrária ──────────────
const ALLOWED_ORIGINS = new Set([
  "http://localhost:5173",
  "http://localhost:4173", // vite preview
]);

app.use("*", async (c, next) => {
  const origin = c.req.header("origin") ?? "";
  if (ALLOWED_ORIGINS.has(origin)) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Credentials", "true");
  }
  c.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type,X-Tenant-Id");
  if (c.req.method === "OPTIONS") return c.text("OK");
  await next();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function assertTable(table: string): boolean {
  return ALLOWED_TABLES.has(table);
}

// Remove campos internos que não devem trafegar para o cliente nas respostas GET/POST/PATCH
const INTERNAL_FIELDS = new Set(["owner_id", "updated_at"]);

function toPublic(row: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).filter(([k]) => !INTERNAL_FIELDS.has(k)));
}

// Filtra body para apenas colunas permitidas da tabela
function sanitizeBody(table: string, body: Record<string, unknown>): Record<string, unknown> {
  const allowed = WRITABLE_COLUMNS[table];
  if (!allowed) return {};
  return Object.fromEntries(Object.entries(body).filter(([k]) => allowed.has(k)));
}

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

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (c) => c.json({ status: "ok" }));

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post("/auth/sign-up", async (c) => {
  const body = await c.req.json();
  const name = String(body.name ?? "")
    .trim()
    .slice(0, 100);
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 254);
  const password = String(body.password ?? "");

  if (!name || !email || !password) return c.json({ error: "Campos obrigatórios ausentes" }, 400);
  if (!EMAIL_RE.test(email)) return c.json({ error: "Formato de e-mail inválido" }, 400);
  if (password.length < 6) return c.json({ error: "A senha deve ter no mínimo 6 caracteres" }, 400);
  if (password.length > 128) return c.json({ error: "Senha muito longa" }, 400);

  const hashed = hashPassword(password);

  try {
    const r = await pool.query(
      `INSERT INTO "user" (name, email, password) VALUES ($1,$2,$3) RETURNING id, name, email`,
      [name, email, hashed],
    );
    const user = r.rows[0];
    const token = crypto.randomUUID();
    sessions.set(token, user.id);
    setCookie(c, "session", token, { httpOnly: true, sameSite: "Lax", maxAge: 60 * 60 * 24 * 7 });
    return c.json({ user });
  } catch (e: any) {
    if (e.code === "23505") return c.json({ error: "E-mail já cadastrado" }, 409);
    return c.json({ error: "Erro ao criar conta" }, 500);
  }
});

app.post("/auth/sign-in", async (c) => {
  const body = await c.req.json();
  const email = String(body.email ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 254);
  const password = String(body.password ?? "");

  if (!email || !password) return c.json({ error: "Campos obrigatórios ausentes" }, 400);

  try {
    const r = await pool.query(`SELECT id, name, email, password FROM "user" WHERE email = $1`, [
      email,
    ]);
    if (!r.rows.length) return c.json({ error: "Nenhuma conta encontrada com este e-mail" }, 404);

    const user = r.rows[0];
    if (!verifyPassword(password, user.password)) return c.json({ error: "Senha incorreta" }, 401);

    const token = crypto.randomUUID();
    sessions.set(token, user.id);
    setCookie(c, "session", token, { httpOnly: true, sameSite: "Lax", maxAge: 60 * 60 * 24 * 7 });
    // nunca retorna a senha — apenas id, name, email
    return c.json({ user: { id: user.id, name: user.name, email: user.email }, role: "admin" });
  } catch {
    return c.json({ error: "Erro ao autenticar" }, 500);
  }
});

app.get("/auth/me", async (c) => {
  try {
    const userId = await resolveOwner(c);
    if (!userId) return c.json(null);
    const r = await pool.query(`SELECT id, name, email FROM "user" WHERE id = $1`, [userId]);
    if (!r.rows.length) return c.json(null);
    return c.json({ user: r.rows[0], role: "admin" });
  } catch {
    return c.json(null);
  }
});

app.post("/auth/sign-out", (c) => {
  const token = getCookie(c, "session");
  if (token) sessions.delete(token);
  setCookie(c, "session", "", { maxAge: 0 });
  return c.text("OK");
});

// ── CRUD genérico (plano, sem get-by-id) ──────────────────────────────────────
app.get("/data/:table", async (c) => {
  const table = c.req.param("table");
  if (!assertTable(table)) return c.json({ error: "Tabela não permitida" }, 403);

  try {
    const order = TABLES_WITH_OWNER.has(table) ? "ORDER BY created_at DESC" : "";
    const r = await pool.query(`SELECT * FROM ${table} ${order}`);
    return c.json(r.rows.map(toPublic));
  } catch {
    return c.json({ error: "Erro ao buscar dados" }, 500);
  }
});

app.post("/data/:table", async (c) => {
  const table = c.req.param("table");
  if (!assertTable(table)) return c.json({ error: "Tabela não permitida" }, 403);

  const rawBody = await c.req.json();
  const body = sanitizeBody(table, rawBody);

  if (TABLES_WITH_OWNER.has(table)) {
    const ownerId = await resolveOwner(c);
    if (!ownerId) return c.json({ error: "Não autorizado" }, 401);
    (body as Record<string, unknown>).owner_id = ownerId;
  }

  if (Object.keys(body).length === 0) return c.json({ error: "Nenhum campo válido enviado" }, 400);

  try {
    const cols = Object.keys(body);
    const vals = Object.values(body);
    const ph = cols.map((_, i) => `$${i + 1}`).join(", ");
    const r = await pool.query(
      `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${ph}) RETURNING *`,
      vals,
    );
    return c.json(toPublic(r.rows[0]));
  } catch {
    return c.json({ error: "Erro ao salvar" }, 500);
  }
});

app.patch("/data/:table/:id", async (c) => {
  const table = c.req.param("table");
  const id = c.req.param("id");
  if (!assertTable(table)) return c.json({ error: "Tabela não permitida" }, 403);

  const rawBody = await c.req.json();
  const body = sanitizeBody(table, rawBody); // owner_id e id nunca estão em WRITABLE_COLUMNS

  if (Object.keys(body).length === 0) return c.json({ error: "Nenhum campo válido enviado" }, 400);

  try {
    const cols = Object.keys(body);
    const vals = Object.values(body);
    const set = cols.map((col, i) => `${col} = $${i + 1}`).join(", ");
    const touch = TABLES_WITH_OWNER.has(table) ? `, updated_at = NOW()` : "";
    const r = await pool.query(
      `UPDATE ${table} SET ${set}${touch} WHERE id = $${cols.length + 1} RETURNING *`,
      [...vals, id],
    );
    if (!r.rows.length) return c.json({ error: "Registro não encontrado" }, 404);
    return c.json(toPublic(r.rows[0]));
  } catch {
    return c.json({ error: "Erro ao atualizar" }, 500);
  }
});

app.delete("/data/:table/:id", async (c) => {
  const table = c.req.param("table");
  const id = c.req.param("id");
  if (!assertTable(table)) return c.json({ error: "Tabela não permitida" }, 403);

  try {
    await pool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return c.text("OK");
  } catch {
    return c.json({ error: "Erro ao deletar" }, 500);
  }
});

const port = 3000;
console.log(`Mock gateway em http://localhost:${port}`);
serve({ fetch: app.fetch, port });
