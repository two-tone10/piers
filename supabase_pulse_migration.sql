-- Pulse system: goal-setter sends daily status, pier responds with one curated word

create table if not exists piers_pulses (
  id uuid primary key default gen_random_uuid(),
  voyage_id uuid not null references piers_voyages(id),
  status text not null check (status in ('making_progress', 'pushing_through', 'stayed_the_course', 'rough_one')),
  date_key text not null,
  created_at timestamptz not null default now(),
  unique (voyage_id, date_key)
);

create table if not exists piers_pulse_responses (
  id uuid primary key default gen_random_uuid(),
  pulse_id uuid not null references piers_pulses(id),
  sender_id uuid not null references piers_users(id),
  word text not null,
  created_at timestamptz not null default now(),
  unique (pulse_id, sender_id)
);

create index if not exists piers_pulses_voyage_idx on piers_pulses(voyage_id);
create index if not exists piers_pulse_responses_pulse_idx on piers_pulse_responses(pulse_id);

alter table piers_pulses enable row level security;
alter table piers_pulse_responses enable row level security;

create policy "anon_all" on piers_pulses for all to anon using (true) with check (true);
create policy "anon_all" on piers_pulse_responses for all to anon using (true) with check (true);
