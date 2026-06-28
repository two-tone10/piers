-- Piers schema. All tables prefixed piers_. Do not modify tember_* or ctrsi_* tables.

create extension if not exists pgcrypto;

-- A person and their identity token (no passwords, cookie-based session token)
create table if not exists piers_users (
  id uuid primary key default gen_random_uuid(),
  handle text not null unique,
  session_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A goal set out to sea for the week
create table if not exists piers_voyages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references piers_users(id),
  goal text not null,
  obstacle text not null,
  status text not null default 'open' check (status in ('open', 'underway', 'returned', 'lost')),
  -- open: waiting for 2 pier members
  -- underway: 2 pier members accepted, week in progress
  -- returned: user marked complete
  -- lost: week expired without completion
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The 2 people who accepted a spot on someone's pier
create table if not exists piers_pier_members (
  id uuid primary key default gen_random_uuid(),
  voyage_id uuid not null references piers_voyages(id),
  user_id uuid not null references piers_users(id),
  joined_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledgement text,
  unique (voyage_id, user_id)
);

-- Inspiration sent by pier members during the voyage (quotes, signals)
create table if not exists piers_signals (
  id uuid primary key default gen_random_uuid(),
  voyage_id uuid not null references piers_voyages(id),
  sender_id uuid not null references piers_users(id),
  quote text not null,
  author text,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists piers_voyages_user_idx on piers_voyages(user_id);
create index if not exists piers_voyages_status_idx on piers_voyages(status);
create index if not exists piers_voyages_expires_idx on piers_voyages(expires_at);
create index if not exists piers_pier_members_voyage_idx on piers_pier_members(voyage_id);
create index if not exists piers_pier_members_user_idx on piers_pier_members(user_id);
create index if not exists piers_signals_voyage_idx on piers_signals(voyage_id);

-- Updated_at triggers
create or replace function piers_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists piers_users_updated_at on piers_users;
create trigger piers_users_updated_at
before update on piers_users
for each row execute function piers_touch_updated_at();

drop trigger if exists piers_voyages_updated_at on piers_voyages;
create trigger piers_voyages_updated_at
before update on piers_voyages
for each row execute function piers_touch_updated_at();

-- RLS
alter table piers_users enable row level security;
alter table piers_voyages enable row level security;
alter table piers_pier_members enable row level security;
alter table piers_signals enable row level security;
