-- AppointmentHub — Business Schema
-- Roda no Neon do tenant DEPOIS que o gateway cria as tabelas do Better-Auth.
-- Regras: §B4 do Importantdoc.md
--   • owner_id text references "user"(id) em toda tabela escrita pelo rep
--   • SEM RLS, SEM auth.uid(), SEM profiles
--   • snake_case; nomes reservados proibidos (user/session/account/verification/organization/member/invitation)

-- ─── Trigger: toca updated_at automaticamente ────────────────────────────────

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── clients ─────────────────────────────────────────────────────────────────
-- Rep cria e vê só os próprios (owner_id obrigatório).

create table if not exists clients (
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

create index if not exists idx_clients_owner on clients(owner_id);

create trigger clients_updated_at
  before update on clients
  for each row execute function touch_updated_at();

-- ─── services ────────────────────────────────────────────────────────────────
-- Lookup compartilhado: sem owner_id. Leitura a todos; escrita só admin/manager.

create table if not exists services (
  id                 uuid        primary key default gen_random_uuid(),
  name               text        not null,
  description        text        not null default '',
  duration_minutes   int         not null default 30,
  price              numeric(10,2) not null default 0,
  color              text        not null default '#16c784',
  active             boolean     not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger services_updated_at
  before update on services
  for each row execute function touch_updated_at();

-- ─── team_members ────────────────────────────────────────────────────────────
-- Lookup compartilhado: sem owner_id. Leitura a todos; escrita só admin/manager.

create table if not exists team_members (
  id          uuid        primary key default gen_random_uuid(),
  full_name   text        not null,
  email       text        not null default '',
  role        text        not null default '',
  specialty   text        not null default '',
  active      boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger team_members_updated_at
  before update on team_members
  for each row execute function touch_updated_at();

-- ─── appointments ────────────────────────────────────────────────────────────
-- Rep cria e vê só os próprios (owner_id obrigatório).
-- FKs para tabelas de negócio sem on delete cascade (integridade de exibição no front).

create table if not exists appointments (
  id                uuid        primary key default gen_random_uuid(),
  owner_id          text        not null references "user"(id) on delete cascade,
  client_id         uuid        not null references clients(id),
  service_id        uuid        not null references services(id),
  team_member_id    uuid        not null references team_members(id),
  title             text        not null,
  notes             text        not null default '',
  appointment_date  date        not null,
  appointment_time  text        not null,
  duration_minutes  int         not null default 30,
  status            text        not null default 'scheduled'
                    check (status in ('scheduled','confirmed','completed','cancelled','no_show')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_appointments_owner on appointments(owner_id);
create index if not exists idx_appointments_date  on appointments(appointment_date);

create trigger appointments_updated_at
  before update on appointments
  for each row execute function touch_updated_at();
