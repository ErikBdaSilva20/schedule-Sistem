-- AppointmentHub — Schema completo
-- Use this file to initialize a fresh database (Neon, local Postgres, etc.)
--
-- LOCAL DEV:
--   docker exec -i masia_local_db_appointment-hub psql -U masia -d tenant_local < supabase/schema.sql
--
-- NEON:
--   Copie o conteúdo inteiro e execute na console SQL do Neon

-- ─── "user": id TEXT (Better-Auth mock local) ────────────────────────────────
CREATE TABLE IF NOT EXISTS "user" (
  id         text        primary key default gen_random_uuid()::text,
  name       text        not null,
  email      text        unique not null,
  password   text        not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── services (LOOKUP — sem owner_id) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id               uuid          primary key default gen_random_uuid(),
  name             text          not null,
  description      text          not null default '',
  duration_minutes integer       not null default 30,
  price            numeric(10,2) not null default 0,
  color            text          not null default '#16c784',
  active           boolean       not null default true,
  created_at       timestamptz   not null default now(),
  updated_at       timestamptz   not null default now()
);

-- ─── team_members (LOOKUP — sem owner_id) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_members (
  id          uuid        primary key default gen_random_uuid(),
  full_name   text        not null,
  email       text        not null default '',
  role        text        not null default '',
  specialty   text        not null default '',
  active      boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── clients (NEGÓCIO — tem owner_id) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id          uuid        primary key default gen_random_uuid(),
  owner_id    text        not null references "user"(id) on delete cascade,
  full_name   text        not null,
  email       text        not null default '',
  phone       text        not null default '',
  company     text        not null default '',
  notes       text        not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── appointments (NEGÓCIO — tem owner_id) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id               uuid        primary key default gen_random_uuid(),
  owner_id         text        not null references "user"(id) on delete cascade,
  client_id        uuid        not null references clients(id),
  service_id       uuid        not null references services(id),
  team_member_id   uuid        not null references team_members(id),
  title            text        not null,
  notes            text        not null default '',
  appointment_date date        not null,
  appointment_time text        not null,
  duration_minutes integer     not null default 30,
  status           text        not null default 'scheduled'
                   check (status in ('scheduled','confirmed','completed','cancelled','no_show','late')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── Índices ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clients_owner      ON clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_appointments_owner ON appointments(owner_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date  ON appointments(appointment_date);
