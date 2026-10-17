-- Piers v2: recruit or open-water matching, go-with-one, Shore (peer backchannel),
-- supplies (two-key support for the pursuer), 10-pier audience cap, report/block.
-- All access goes through security-definer RPCs that check the caller's session token.
-- Only touches piers_* objects. Run after supabase_schema.sql and the pulse/reckoning migrations.

create extension if not exists pgcrypto;

-- ── Columns ──────────────────────────────────────────────────────────────────

alter table piers_users add column if not exists open_to_watch boolean not null default false;

alter table piers_voyages add column if not exists mode text not null default 'pair';
alter table piers_voyages add column if not exists listed boolean not null default true;
alter table piers_voyages add column if not exists invite_code text;
alter table piers_voyages add column if not exists started_at timestamptz;
alter table piers_voyages add column if not exists claimed_at timestamptz;
alter table piers_voyages add column if not exists rest_days_used int not null default 0;

do $$ begin
  alter table piers_voyages add constraint piers_voyages_mode_chk check (mode in ('pair', 'solo'));
exception when duplicate_object then null; end $$;

update piers_voyages
set invite_code = upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6))
where invite_code is null;

create unique index if not exists piers_voyages_invite_code_idx on piers_voyages(invite_code);

alter table piers_pulses drop constraint if exists piers_pulses_status_check;
alter table piers_pulses add constraint piers_pulses_status_check
  check (status in ('making_progress', 'pushing_through', 'stayed_the_course', 'rough_one', 'rest_day'));

-- ── New tables ───────────────────────────────────────────────────────────────

create table if not exists piers_shore_messages (
  id uuid primary key default gen_random_uuid(),
  voyage_id uuid not null references piers_voyages(id) on delete cascade,
  sender_id uuid not null references piers_users(id),
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists piers_shore_voyage_idx on piers_shore_messages(voyage_id, created_at);

create table if not exists piers_supplies (
  id uuid primary key default gen_random_uuid(),
  voyage_id uuid not null references piers_voyages(id) on delete cascade,
  kind text not null check (kind in ('extra_day', 'rest_day', 'call', 'sealed_note', 'link')),
  body text check (char_length(body) <= 500),
  url text check (char_length(url) <= 500),
  status text not null default 'proposed' check (status in ('proposed', 'delivered', 'declined')),
  proposed_by uuid not null references piers_users(id),
  cosigned_by uuid references piers_users(id),
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  opened_at timestamptz
);
create index if not exists piers_supplies_voyage_idx on piers_supplies(voyage_id);

create table if not exists piers_blocks (
  blocker_id uuid not null references piers_users(id),
  blocked_id uuid not null references piers_users(id),
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists piers_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references piers_users(id),
  target_user_id uuid references piers_users(id),
  voyage_id uuid references piers_voyages(id) on delete set null,
  message_id uuid,
  reason text check (char_length(reason) <= 300),
  created_at timestamptz not null default now()
);

-- ── Lock tables: no direct client access, RPCs only ──────────────────────────

do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename like 'piers\_%'
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'piers_users', 'piers_voyages', 'piers_pier_members', 'piers_signals',
    'piers_pulses', 'piers_pulse_responses', 'piers_shore_messages',
    'piers_supplies', 'piers_blocks', 'piers_reports'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ── Helpers ──────────────────────────────────────────────────────────────────

create or replace function piers_uid(p_token uuid)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare v uuid;
begin
  select id into v from piers_users where session_token = p_token;
  if v is null then raise exception 'Not signed in.'; end if;
  return v;
end $$;

create or replace function piers_new_code()
returns text language plpgsql volatile set search_path = public as $$
declare c text;
begin
  loop
    c := upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from piers_voyages where invite_code = c);
  end loop;
  return c;
end $$;

-- Voyages past their deadline end as 'lost'. Called lazily from read paths.
create or replace function piers_sweep()
returns void language sql security definer set search_path = public as $$
  update piers_voyages set status = 'lost'
  where status in ('open', 'underway') and expires_at < now();
$$;

create or replace function piers_member_count(p_voyage uuid)
returns int language sql stable set search_path = public as $$
  select count(*)::int from piers_pier_members where voyage_id = p_voyage;
$$;

create or replace function piers_active_watch_count(p_user uuid)
returns int language sql stable set search_path = public as $$
  select count(*)::int
  from piers_pier_members m join piers_voyages v on v.id = m.voyage_id
  where m.user_id = p_user and v.status in ('open', 'underway');
$$;

create or replace function piers_is_blocked(a uuid, b uuid)
returns boolean language sql stable set search_path = public as $$
  select exists (
    select 1 from piers_blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  );
$$;

create or replace function piers_user_json(u piers_users)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'id', u.id, 'handle', u.handle, 'session_token', u.session_token,
    'open_to_watch', u.open_to_watch, 'created_at', u.created_at
  );
$$;

create or replace function piers_voyage_json(v piers_voyages)
returns jsonb language sql stable set search_path = public as $$
  select to_jsonb(v) - 'reckoning'
    || jsonb_build_object(
      'handle', (select handle from piers_users where id = v.user_id),
      'member_count', piers_member_count(v.id)
    );
$$;

-- Starts the week. Pair needs 2, solo needs 1.
create or replace function piers_maybe_start(p_voyage uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v piers_voyages; n int;
begin
  select * into v from piers_voyages where id = p_voyage for update;
  if v.status <> 'open' then return; end if;
  n := piers_member_count(p_voyage);
  if (v.mode = 'pair' and n >= 2) or (v.mode = 'solo' and n >= 1) then
    update piers_voyages
    set status = 'underway', started_at = now(), expires_at = now() + interval '7 days'
    where id = p_voyage;
  end if;
end $$;

-- Adds a user to a pier, enforcing seat count and the 10-pier cap.
create or replace function piers_add_member(p_voyage uuid, p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v piers_voyages; seats int;
begin
  select * into v from piers_voyages where id = p_voyage for update;
  if v.id is null then raise exception 'That pier does not exist.'; end if;
  if v.user_id = p_user then raise exception 'You can''t stand on your own pier.'; end if;
  if v.status <> 'open' then raise exception 'That pier is full.'; end if;
  if exists (select 1 from piers_pier_members where voyage_id = p_voyage and user_id = p_user) then
    raise exception 'You''re already on this pier.';
  end if;
  if piers_is_blocked(v.user_id, p_user) then raise exception 'That pier is not available.'; end if;
  seats := case when v.mode = 'solo' then 1 else 2 end;
  if piers_member_count(p_voyage) >= seats then raise exception 'That pier is full.'; end if;
  if piers_active_watch_count(p_user) >= 10 then
    raise exception 'You''re on 10 piers. That''s the limit.';
  end if;
  insert into piers_pier_members (voyage_id, user_id) values (p_voyage, p_user);
  perform piers_maybe_start(p_voyage);
end $$;

-- Fills open seats from people who opted in to open water.
create or replace function piers_fill_from_pool(p_voyage uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v piers_voyages; seats int; cand uuid;
begin
  select * into v from piers_voyages where id = p_voyage;
  seats := (case when v.mode = 'solo' then 1 else 2 end) - piers_member_count(p_voyage);
  for cand in
    select u.id from piers_users u
    where u.open_to_watch
      and u.id <> v.user_id
      and not exists (select 1 from piers_pier_members m where m.voyage_id = p_voyage and m.user_id = u.id)
      and not piers_is_blocked(u.id, v.user_id)
      and piers_active_watch_count(u.id) < 10
    order by random()
    limit greatest(seats, 0)
  loop
    perform piers_add_member(p_voyage, cand);
  end loop;
end $$;

-- ── Identity ─────────────────────────────────────────────────────────────────

create or replace function piers_create_user(p_handle text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u piers_users; h text := trim(left(coalesce(p_handle, ''), 40));
begin
  if h = '' then raise exception 'Pick a handle.'; end if;
  if exists (select 1 from piers_users where lower(handle) = lower(h)) then
    raise exception 'That handle is taken.';
  end if;
  insert into piers_users (handle) values (h) returning * into u;
  return piers_user_json(u);
end $$;

create or replace function piers_me(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare u piers_users;
begin
  select * into u from piers_users where session_token = p_token;
  if u.id is null then return null; end if;
  return piers_user_json(u);
end $$;

create or replace function piers_set_open_to_watch(p_token uuid, p_on boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); u piers_users;
begin
  update piers_users set open_to_watch = coalesce(p_on, false) where id = me returning * into u;
  return piers_user_json(u);
end $$;

-- ── Pursuer ──────────────────────────────────────────────────────────────────

create or replace function piers_cast_off(
  p_token uuid, p_goal text, p_obstacle text, p_mode text, p_listed boolean
) returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); v piers_voyages;
begin
  perform piers_sweep();
  if exists (select 1 from piers_voyages where user_id = me and status in ('open', 'underway')) then
    raise exception 'You already have a goal out.';
  end if;
  if coalesce(trim(p_goal), '') = '' then raise exception 'Name your goal.'; end if;
  if coalesce(trim(p_obstacle), '') = '' then raise exception 'Name your obstacle.'; end if;
  insert into piers_voyages (user_id, goal, obstacle, status, expires_at, mode, listed, invite_code)
  values (
    me, left(trim(p_goal), 300), left(trim(p_obstacle), 300), 'open',
    now() + interval '7 days',
    case when p_mode = 'solo' then 'solo' else 'pair' end,
    coalesce(p_listed, true), piers_new_code()
  ) returning * into v;
  if v.listed then perform piers_fill_from_pool(v.id); end if;
  select * into v from piers_voyages where id = v.id;
  return piers_voyage_json(v);
end $$;

-- Pursuer stops waiting for a second peer.
create or replace function piers_go_with_one(p_token uuid, p_voyage uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); v piers_voyages;
begin
  select * into v from piers_voyages where id = p_voyage for update;
  if v.user_id is distinct from me then raise exception 'Not your goal.'; end if;
  if v.status <> 'open' then raise exception 'Already underway.'; end if;
  if piers_member_count(p_voyage) < 1 then raise exception 'Wait for at least one peer.'; end if;
  update piers_voyages set mode = 'solo' where id = p_voyage;
  perform piers_maybe_start(p_voyage);
end $$;

create or replace function piers_set_listed(p_token uuid, p_voyage uuid, p_listed boolean)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token);
begin
  update piers_voyages set listed = coalesce(p_listed, true)
  where id = p_voyage and user_id = me and status = 'open';
  if p_listed then perform piers_fill_from_pool(p_voyage); end if;
end $$;

-- Pair: done. Solo: the one peer has to confirm.
create or replace function piers_claim_done(p_token uuid, p_voyage uuid)
returns text language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); v piers_voyages;
begin
  select * into v from piers_voyages where id = p_voyage for update;
  if v.user_id is distinct from me then raise exception 'Not your goal.'; end if;
  if v.status <> 'underway' then raise exception 'This goal is not underway.'; end if;
  if v.mode = 'solo' then
    update piers_voyages set claimed_at = now() where id = p_voyage;
    return 'claimed';
  end if;
  update piers_voyages set status = 'returned', completed_at = now(), claimed_at = now() where id = p_voyage;
  return 'returned';
end $$;

create or replace function piers_confirm_done(p_token uuid, p_voyage uuid, p_confirm boolean)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); v piers_voyages;
begin
  select * into v from piers_voyages where id = p_voyage for update;
  if not exists (select 1 from piers_pier_members where voyage_id = p_voyage and user_id = me) then
    raise exception 'You''re not on this pier.';
  end if;
  if v.mode <> 'solo' or v.claimed_at is null or v.status <> 'underway' then
    raise exception 'Nothing to confirm.';
  end if;
  if p_confirm then
    update piers_voyages set status = 'returned', completed_at = now() where id = p_voyage;
  else
    update piers_voyages set claimed_at = null where id = p_voyage;
  end if;
end $$;

create or replace function piers_send_pulse(p_token uuid, p_voyage uuid, p_status text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); v piers_voyages; rests int; dk text := to_char(now() at time zone 'utc', 'YYYY-MM-DD');
begin
  select * into v from piers_voyages where id = p_voyage for update;
  if v.user_id is distinct from me then raise exception 'Not your goal.'; end if;
  if v.status <> 'underway' then raise exception 'This goal is not underway.'; end if;
  if p_status = 'rest_day' then
    select count(*) into rests from piers_supplies where voyage_id = p_voyage and kind = 'rest_day' and status = 'delivered';
    if exists (select 1 from piers_pulses where voyage_id = p_voyage and date_key = dk and status = 'rest_day') then
      null;
    elsif v.rest_days_used >= rests then
      raise exception 'No rest days left. Your peers can send one.';
    else
      update piers_voyages set rest_days_used = rest_days_used + 1 where id = p_voyage;
    end if;
  end if;
  insert into piers_pulses (voyage_id, status, note, date_key)
  values (p_voyage, p_status, nullif(left(trim(coalesce(p_note, '')), 200), ''), dk)
  on conflict (voyage_id, date_key) do update set status = excluded.status, note = excluded.note;
end $$;

create or replace function piers_reckon(p_token uuid, p_voyage uuid, p_text text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token);
begin
  update piers_voyages
  set reckoning = nullif(left(trim(coalesce(p_text, '')), 1000), ''), reckoning_at = now()
  where id = p_voyage and user_id = me and status in ('returned', 'lost');
end $$;

create or replace function piers_open_supply(p_token uuid, p_supply uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token);
begin
  update piers_supplies s set opened_at = coalesce(s.opened_at, now())
  from piers_voyages v
  where s.id = p_supply and v.id = s.voyage_id and v.user_id = me and s.status = 'delivered'
    and (s.kind <> 'sealed_note' or v.status in ('returned', 'lost'));
end $$;

-- ── Peers ────────────────────────────────────────────────────────────────────

create or replace function piers_join(p_token uuid, p_voyage uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token);
begin
  perform piers_sweep();
  perform piers_add_member(p_voyage, me);
end $$;

create or replace function piers_join_code(p_token uuid, p_code text)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); vid uuid;
begin
  perform piers_sweep();
  select id into vid from piers_voyages where invite_code = upper(trim(p_code));
  if vid is null then raise exception 'No pier with that code.'; end if;
  perform piers_add_member(vid, me);
  return vid;
end $$;

-- Takes a random listed pier with an open seat.
create or replace function piers_join_random(p_token uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); vid uuid;
begin
  perform piers_sweep();
  select v.id into vid from piers_voyages v
  where v.status = 'open' and v.listed and v.user_id <> me
    and not exists (select 1 from piers_pier_members m where m.voyage_id = v.id and m.user_id = me)
    and not piers_is_blocked(v.user_id, me)
    and piers_member_count(v.id) < (case when v.mode = 'solo' then 1 else 2 end)
  order by random() limit 1;
  if vid is null then raise exception 'No open piers right now.'; end if;
  perform piers_add_member(vid, me);
  return vid;
end $$;

create or replace function piers_require_peer(p_voyage uuid, p_user uuid)
returns piers_voyages language plpgsql stable security definer set search_path = public as $$
declare v piers_voyages;
begin
  select * into v from piers_voyages where id = p_voyage;
  if not exists (select 1 from piers_pier_members where voyage_id = p_voyage and user_id = p_user) then
    raise exception 'You''re not on this pier.';
  end if;
  return v;
end $$;

create or replace function piers_send_signal(p_token uuid, p_voyage uuid, p_quote text, p_author text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); v piers_voyages := piers_require_peer(p_voyage, me);
begin
  if v.status not in ('open', 'underway') then raise exception 'This goal has ended.'; end if;
  if coalesce(trim(p_quote), '') = '' then raise exception 'Write something.'; end if;
  insert into piers_signals (voyage_id, sender_id, quote, author)
  values (p_voyage, me, left(trim(p_quote), 500), nullif(left(trim(coalesce(p_author, '')), 160), ''));
end $$;

create or replace function piers_respond_pulse(p_token uuid, p_pulse uuid, p_word text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); vid uuid;
begin
  select voyage_id into vid from piers_pulses where id = p_pulse;
  perform piers_require_peer(vid, me);
  insert into piers_pulse_responses (pulse_id, sender_id, word)
  values (p_pulse, me, left(p_word, 40))
  on conflict (pulse_id, sender_id) do update set word = excluded.word;
end $$;

create or replace function piers_acknowledge(p_token uuid, p_voyage uuid, p_text text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); v piers_voyages := piers_require_peer(p_voyage, me);
begin
  if v.status not in ('returned', 'lost') then raise exception 'Their week isn''t over yet.'; end if;
  update piers_pier_members
  set acknowledged_at = now(), acknowledgement = left(trim(coalesce(p_text, '')), 500)
  where voyage_id = p_voyage and user_id = me;
end $$;

create or replace function piers_shore_send(p_token uuid, p_voyage uuid, p_body text)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); v piers_voyages := piers_require_peer(p_voyage, me);
begin
  if coalesce(trim(p_body), '') = '' then raise exception 'Write something.'; end if;
  insert into piers_shore_messages (voyage_id, sender_id, body) values (p_voyage, me, left(trim(p_body), 500));
end $$;

create or replace function piers_supply_propose(
  p_token uuid, p_voyage uuid, p_kind text, p_body text, p_url text
) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); v piers_voyages := piers_require_peer(p_voyage, me);
begin
  if v.status <> 'underway' then raise exception 'Supplies can go out once they''re underway.'; end if;
  if v.mode = 'solo' then raise exception 'Supplies take two peers. This pier went with one.'; end if;
  if p_kind in ('call', 'sealed_note') and coalesce(trim(p_body), '') = '' then
    raise exception 'Add a few words.';
  end if;
  if p_kind = 'link' and coalesce(trim(p_url), '') = '' then raise exception 'Add a link.'; end if;
  if (select count(*) from piers_supplies where voyage_id = p_voyage and status = 'proposed') >= 5 then
    raise exception 'Too many waiting. Settle one first.';
  end if;
  insert into piers_supplies (voyage_id, kind, body, url, proposed_by)
  values (p_voyage, p_kind, nullif(left(trim(coalesce(p_body, '')), 500), ''),
          nullif(left(trim(coalesce(p_url, '')), 500), ''), me);
end $$;

-- The other peer signs. Delivery applies the effect.
create or replace function piers_supply_cosign(p_token uuid, p_supply uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); s piers_supplies; v piers_voyages;
begin
  select * into s from piers_supplies where id = p_supply for update;
  if s.id is null then raise exception 'Not found.'; end if;
  v := piers_require_peer(s.voyage_id, me);
  if s.status <> 'proposed' then raise exception 'Already settled.'; end if;
  if s.proposed_by = me then raise exception 'The other peer has to sign.'; end if;
  if v.status <> 'underway' then raise exception 'This goal is not underway.'; end if;
  update piers_supplies set status = 'delivered', cosigned_by = me, delivered_at = now() where id = p_supply;
  if s.kind = 'extra_day' then
    update piers_voyages set expires_at = expires_at + interval '1 day' where id = s.voyage_id;
  end if;
end $$;

create or replace function piers_supply_decline(p_token uuid, p_supply uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); s piers_supplies;
begin
  select * into s from piers_supplies where id = p_supply for update;
  if s.id is null then raise exception 'Not found.'; end if;
  perform piers_require_peer(s.voyage_id, me);
  if s.status <> 'proposed' then raise exception 'Already settled.'; end if;
  update piers_supplies set status = 'declined' where id = p_supply;
end $$;

-- ── Safety ───────────────────────────────────────────────────────────────────

create or replace function piers_report(
  p_token uuid, p_target uuid, p_voyage uuid, p_message uuid, p_reason text
) returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token);
begin
  insert into piers_reports (reporter_id, target_user_id, voyage_id, message_id, reason)
  values (me, p_target, p_voyage, p_message, left(coalesce(p_reason, ''), 300));
end $$;

create or replace function piers_block(p_token uuid, p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token);
begin
  if p_target = me then return; end if;
  insert into piers_blocks (blocker_id, blocked_id) values (me, p_target) on conflict do nothing;
end $$;

-- ── Reads ────────────────────────────────────────────────────────────────────

create or replace function piers_home(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); mine piers_voyages; reck piers_voyages;
begin
  perform piers_sweep();
  select * into mine from piers_voyages
  where user_id = me and status in ('open', 'underway') order by created_at desc limit 1;
  select * into reck from piers_voyages
  where user_id = me and status in ('returned', 'lost') and reckoning_at is null
  order by created_at desc limit 1;
  return jsonb_build_object(
    'me', (select piers_user_json(u) from piers_users u where u.id = me),
    'my_voyage', case when mine.id is null then null else piers_voyage_json(mine) end,
    'needs_reckoning', case when reck.id is null then null else piers_voyage_json(reck) end,
    'watch_count', piers_active_watch_count(me),
    'watching', coalesce((
      select jsonb_agg(piers_voyage_json(v) || jsonb_build_object(
        'acknowledged', m.acknowledged_at is not null,
        'waiting_on_me', (
          select count(*) from piers_supplies s
          where s.voyage_id = v.id and s.status = 'proposed' and s.proposed_by <> me
        ) + case when v.mode = 'solo' and v.claimed_at is not null and v.status = 'underway' then 1 else 0 end
      ) order by v.created_at desc)
      from piers_pier_members m join piers_voyages v on v.id = m.voyage_id
      where m.user_id = me and (v.status in ('open', 'underway') or m.acknowledged_at is null)
    ), '[]'::jsonb),
    'open', coalesce((
      select jsonb_agg(piers_voyage_json(v) order by v.created_at)
      from (
        select * from piers_voyages v
        where v.status = 'open' and v.listed and v.user_id <> me
          and not exists (select 1 from piers_pier_members m where m.voyage_id = v.id and m.user_id = me)
          and not piers_is_blocked(v.user_id, me)
        order by v.created_at limit 40
      ) v
    ), '[]'::jsonb)
  );
end $$;

create or replace function piers_voyage_detail(p_token uuid, p_voyage uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); v piers_voyages; role text; ended boolean; rests int;
begin
  perform piers_sweep();
  select * into v from piers_voyages where id = p_voyage;
  if v.id is null then raise exception 'Not found.'; end if;
  if v.user_id = me then role := 'pursuer';
  elsif exists (select 1 from piers_pier_members where voyage_id = p_voyage and user_id = me) then role := 'peer';
  elsif v.status = 'open' and v.listed then role := 'visitor';
  else raise exception 'Not found.';
  end if;
  ended := v.status in ('returned', 'lost');
  select count(*) into rests from piers_supplies where voyage_id = p_voyage and kind = 'rest_day' and status = 'delivered';

  return jsonb_build_object(
    'role', role,
    'voyage', piers_voyage_json(v)
      || case when role = 'pursuer' then jsonb_build_object('reckoning', v.reckoning) else '{}'::jsonb end,
    'rest_days_left', greatest(rests - v.rest_days_used, 0),
    'members', case when role = 'visitor' then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', m.user_id, 'handle', u.handle, 'joined_at', m.joined_at,
        'acknowledged_at', m.acknowledged_at, 'acknowledgement', m.acknowledgement
      ) order by m.joined_at)
      from piers_pier_members m join piers_users u on u.id = m.user_id
      where m.voyage_id = p_voyage
    ), '[]'::jsonb) end,
    'signals', case when role = 'visitor' then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id, 'quote', s.quote, 'author', s.author, 'sender_id', s.sender_id,
        'handle', u.handle, 'created_at', s.created_at
      ) order by s.created_at)
      from piers_signals s join piers_users u on u.id = s.sender_id
      where s.voyage_id = p_voyage
    ), '[]'::jsonb) end,
    'pulses', case when role = 'visitor' then '[]'::jsonb else coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'status', p.status, 'note', p.note, 'date_key', p.date_key, 'created_at', p.created_at,
        'responses', coalesce((
          select jsonb_agg(jsonb_build_object('sender_id', r.sender_id, 'handle', u.handle, 'word', r.word))
          from piers_pulse_responses r join piers_users u on u.id = r.sender_id
          where r.pulse_id = p.id
        ), '[]'::jsonb)
      ) order by p.date_key desc)
      from piers_pulses p where p.voyage_id = p_voyage
    ), '[]'::jsonb) end,
    'supplies', case
      when role = 'peer' then coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', s.id, 'kind', s.kind, 'body', s.body, 'url', s.url, 'status', s.status,
          'proposed_by', s.proposed_by, 'proposer', pu.handle, 'cosigner', cu.handle,
          'created_at', s.created_at, 'delivered_at', s.delivered_at, 'opened_at', s.opened_at
        ) order by s.created_at desc)
        from piers_supplies s
        join piers_users pu on pu.id = s.proposed_by
        left join piers_users cu on cu.id = s.cosigned_by
        where s.voyage_id = p_voyage
      ), '[]'::jsonb)
      when role = 'pursuer' then coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', s.id, 'kind', s.kind,
          'body', case when s.kind = 'sealed_note' and not ended then null else s.body end,
          'url', s.url, 'status', s.status, 'sealed', s.kind = 'sealed_note' and not ended,
          'from', pu.handle || ' + ' || cu.handle,
          'delivered_at', s.delivered_at, 'opened_at', s.opened_at
        ) order by s.delivered_at desc)
        from piers_supplies s
        join piers_users pu on pu.id = s.proposed_by
        join piers_users cu on cu.id = s.cosigned_by
        where s.voyage_id = p_voyage and s.status = 'delivered'
      ), '[]'::jsonb)
      else '[]'::jsonb end,
    'shore', case when role = 'peer' then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', sm.id, 'body', sm.body, 'sender_id', sm.sender_id, 'handle', u.handle, 'created_at', sm.created_at
      ) order by sm.created_at)
      from piers_shore_messages sm join piers_users u on u.id = sm.sender_id
      where sm.voyage_id = p_voyage
        and not exists (select 1 from piers_blocks b where b.blocker_id = me and b.blocked_id = sm.sender_id)
    ), '[]'::jsonb) else null end
  );
end $$;

create or replace function piers_harbor(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', v.id, 'goal', v.goal, 'handle', u.handle, 'completed_at', v.completed_at, 'mode', v.mode
    ) order by v.completed_at desc)
    from (
      select * from piers_voyages
      where status = 'returned' and not piers_is_blocked(user_id, me)
      order by completed_at desc limit 40
    ) v join piers_users u on u.id = v.user_id
  ), '[]'::jsonb);
end $$;

create or replace function piers_logbook(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token);
begin
  perform piers_sweep();
  return coalesce((
    select jsonb_agg(to_jsonb(v) || jsonb_build_object(
      'acknowledgements', coalesce((
        select jsonb_agg(jsonb_build_object('handle', u.handle, 'acknowledgement', m.acknowledgement))
        from piers_pier_members m join piers_users u on u.id = m.user_id
        where m.voyage_id = v.id and m.acknowledged_at is not null
      ), '[]'::jsonb),
      'supply_count', (select count(*) from piers_supplies s where s.voyage_id = v.id and s.status = 'delivered')
    ) order by v.created_at desc)
    from (
      select * from piers_voyages where user_id = me and status in ('returned', 'lost')
      order by created_at desc limit 30
    ) v
  ), '[]'::jsonb);
end $$;

-- ── Dev seeding (used by the in-app Dev panel in development builds) ─────────

create or replace function piers_dev_seed(p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := piers_uid(p_token);
  handles text[] := array['marco_d', 'suli_w', 'priya_k'];
  goals text[] := array[
    'Finish the first draft of my short story by Sunday.',
    'Call my dad three times this week.',
    'Run four times this week, 20 minutes each.'
  ];
  obstacles text[] := array[
    'I edit as I go instead of writing.',
    'I find an excuse when the moment comes.',
    'Mornings. I never want to start.'
  ];
  helper uuid; owner uuid; vid uuid; i int;
begin
  insert into piers_users (handle) values ('nadia_t') on conflict (handle) do nothing;
  select id into helper from piers_users where handle = 'nadia_t';
  for i in 1..3 loop
    insert into piers_users (handle) values (handles[i]) on conflict (handle) do nothing;
    select id into owner from piers_users where handle = handles[i];
    if exists (select 1 from piers_voyages where user_id = owner and status in ('open', 'underway')) then
      continue;
    end if;
    insert into piers_voyages (user_id, goal, obstacle, status, expires_at, mode, listed, invite_code)
    values (owner, goals[i], obstacles[i], 'open', now() + interval '7 days', 'pair', true, piers_new_code())
    returning id into vid;
    if i > 1 then
      insert into piers_pier_members (voyage_id, user_id) values (vid, helper);
      insert into piers_shore_messages (voyage_id, sender_id, body)
      values (vid, helper, 'Glad you''re here. Want to send them something once we''re underway?');
    end if;
  end loop;
end $$;

create or replace function piers_dev_fill(p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
declare me uuid := piers_uid(p_token); vid uuid; h text; uid uuid; seats int;
begin
  select id into vid from piers_voyages where user_id = me and status = 'open' limit 1;
  if vid is null then raise exception 'Set a goal first.'; end if;
  foreach h in array array['cam_r', 'nadia_t'] loop
    select (case when mode = 'solo' then 1 else 2 end) - piers_member_count(vid) into seats
    from piers_voyages where id = vid;
    exit when seats <= 0;
    insert into piers_users (handle) values (h) on conflict (handle) do nothing;
    select id into uid from piers_users where handle = h;
    begin
      perform piers_add_member(vid, uid);
    exception when others then null;
    end;
  end loop;
end $$;

-- ── Grants ───────────────────────────────────────────────────────────────────

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'piers\_%'
  loop
    execute format('revoke all on function %s from public', f.sig);
  end loop;
end $$;

grant execute on function
  piers_create_user(text),
  piers_me(uuid),
  piers_set_open_to_watch(uuid, boolean),
  piers_cast_off(uuid, text, text, text, boolean),
  piers_go_with_one(uuid, uuid),
  piers_set_listed(uuid, uuid, boolean),
  piers_claim_done(uuid, uuid),
  piers_confirm_done(uuid, uuid, boolean),
  piers_send_pulse(uuid, uuid, text, text),
  piers_reckon(uuid, uuid, text),
  piers_open_supply(uuid, uuid),
  piers_join(uuid, uuid),
  piers_join_code(uuid, text),
  piers_join_random(uuid),
  piers_send_signal(uuid, uuid, text, text),
  piers_respond_pulse(uuid, uuid, text),
  piers_acknowledge(uuid, uuid, text),
  piers_shore_send(uuid, uuid, text),
  piers_supply_propose(uuid, uuid, text, text, text),
  piers_supply_cosign(uuid, uuid),
  piers_supply_decline(uuid, uuid),
  piers_report(uuid, uuid, uuid, uuid, text),
  piers_block(uuid, uuid),
  piers_home(uuid),
  piers_voyage_detail(uuid, uuid),
  piers_harbor(uuid),
  piers_logbook(uuid),
  piers_dev_seed(uuid),
  piers_dev_fill(uuid)
to anon, authenticated;
