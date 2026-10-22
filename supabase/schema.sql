-- Facts-Finder accounts, progress, and feedback.
-- Run this once in the Supabase SQL editor.
-- Then open Authentication → Sign In / Providers → Email and turn off
-- Confirm email, so Create account signs the player in immediately.
-- Put the project URL and the anon public key in the app.
-- Never put the service_role key in the app. Read emails under
-- Authentication → Users, notes under Table Editor → feedback, and
-- voice files under Storage → feedback-audio.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null,
  last_name text not null,
  username text not null unique,
  username_changed_at timestamptz,
  avatar jsonb not null default '{"portrait":"fox","color":"cyan"}'::jsonb,
  created_at timestamptz not null default now(),
  constraint username_shape check (username ~ '^[a-z0-9]{3,16}$')
);

create table if not exists public.progress (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  xp integer not null default 0,
  streak integer not null default 0,
  last_played_date date,
  daily_cleared_on date,
  paths jsonb not null,
  badge text not null default 'Curious mind',
  feedback_prompted boolean not null default false
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  body text,
  audio_path text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.feedback enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "update own profile" on public.profiles;
create policy "update own profile"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "read own progress" on public.progress;
create policy "read own progress"
  on public.progress for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "update own progress" on public.progress;
create policy "update own progress"
  on public.progress for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "insert feedback" on public.feedback;
create policy "insert feedback"
  on public.feedback for insert
  to anon, authenticated
  with check (
    (auth.uid() is null and user_id is null)
    or auth.uid() = user_id
  );

grant select on public.profiles to authenticated;
grant update (username, avatar) on public.profiles to authenticated;
grant select, update on public.progress to authenticated;
grant insert on public.feedback to anon, authenticated;

create or replace function public.username_taken(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where username = candidate
  );
$$;

revoke all on function public.username_taken(text) from public;
grant execute on function public.username_taken(text) to anon, authenticated;

create or replace function public.guard_username()
returns trigger
language plpgsql
as $$
begin
  if new.username is distinct from old.username then
    if old.username_changed_at is not null
       and old.username_changed_at > now() - interval '3 months' then
      raise exception 'username_locked';
    end if;
    if new.username !~ '^[a-z0-9]{3,16}$' then
      raise exception 'username_invalid';
    end if;
    new.username_changed_at := now();
  else
    new.username_changed_at := old.username_changed_at;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_username on public.profiles;
create trigger profiles_guard_username
  before update on public.profiles
  for each row execute function public.guard_username();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, username)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'first_name'), ''), 'Player'),
    coalesce(trim(new.raw_user_meta_data->>'last_name'), ''),
    coalesce(new.raw_user_meta_data->>'username', 'player')
  );
  insert into public.progress (user_id, paths)
  values (
    new.id,
    '{"general":{"completed":[],"attempts":0},"history":{"completed":[],"attempts":0},"science":{"completed":[],"attempts":0}}'::jsonb
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into storage.buckets (id, name, public)
values ('feedback-audio', 'feedback-audio', false)
on conflict (id) do nothing;

drop policy if exists "insert feedback audio" on storage.objects;
create policy "insert feedback audio"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'feedback-audio');

-- ---------------------------------------------------------------------------
-- Admin dashboard and voice transcripts.
-- Safe to run again on a project that already ran the part above.
--
-- After you create your own account in the app, make it the admin by running
-- this once in the SQL editor (use your own email):
--
--   update public.profiles set is_admin = true
--   where id = (select id from auth.users where email = 'you@example.com');
--
-- is_admin cannot be changed from the app. Players are only allowed to update
-- their username and avatar (see the column grant above).
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Where the feedback text came from:
--   none     typed note, or no audio
--   browser  the phone turned speech into text while recording
--   pending  a voice note with no text yet; the server should transcribe it
--   done     the server transcribed it
--   failed   the server tried and could not
alter table public.feedback
  add column if not exists transcript_status text not null default 'none';

alter table public.feedback
  drop constraint if exists feedback_transcript_status_check;
alter table public.feedback
  add constraint feedback_transcript_status_check
  check (transcript_status in ('none', 'browser', 'pending', 'done', 'failed'));

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Everyone who has joined, with progress. Returns nothing for non-admins.
create or replace function public.admin_players()
returns table (
  id uuid,
  first_name text,
  last_name text,
  username text,
  email text,
  created_at timestamptz,
  xp integer,
  streak integer,
  last_played_date date,
  badge text,
  paths jsonb
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    p.id,
    p.first_name,
    p.last_name,
    p.username,
    u.email::text,
    p.created_at,
    g.xp,
    g.streak,
    g.last_played_date,
    g.badge,
    g.paths
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.progress g on g.user_id = p.id
  where public.is_admin()
  order by p.created_at desc;
$$;

-- Every note, newest first. Returns nothing for non-admins.
create or replace function public.admin_feedback()
returns table (
  id uuid,
  created_at timestamptz,
  rating integer,
  body text,
  audio_path text,
  transcript_status text,
  user_id uuid,
  first_name text,
  username text,
  email text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    f.id,
    f.created_at,
    f.rating,
    f.body,
    f.audio_path,
    f.transcript_status,
    f.user_id,
    p.first_name,
    p.username,
    u.email::text
  from public.feedback f
  left join public.profiles p on p.id = f.user_id
  left join auth.users u on u.id = f.user_id
  where public.is_admin()
  order by f.created_at desc;
$$;

revoke all on function public.admin_players() from public;
revoke all on function public.admin_feedback() from public;
grant execute on function public.admin_players() to authenticated;
grant execute on function public.admin_feedback() to authenticated;

-- Lets the admin play voice notes (through short-lived signed links).
drop policy if exists "admin read feedback audio" on storage.objects;
create policy "admin read feedback audio"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'feedback-audio' and public.is_admin());

-- Admin functions are for signed-in users only. Supabase lets the anon role
-- run new functions by default, so take that away explicitly.
revoke all on function public.is_admin() from anon;
revoke all on function public.admin_players() from anon;
revoke all on function public.admin_feedback() from anon;

-- ---------------------------------------------------------------------------
-- Compete: friends, rooms, and the room leaderboard.
-- Safe to run again.
--
-- The three tables below are closed to the app. Nobody can read or write them
-- directly; every action goes through the functions further down, which check
-- who is asking. Room settings you may want to change:
--   expiry:       '48 hours'  (in create_room)
--   room size:    20          (in join_room)
--   open rooms a host can have: 10 (in create_room)
-- ---------------------------------------------------------------------------

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.profiles (id) on delete cascade,
  addressee uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  constraint friendships_not_self check (requester <> addressee)
);

-- One row per pair of people, whichever of them asked first.
create unique index if not exists friendships_one_per_pair
  on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_addressee on public.friendships (addressee);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references public.profiles (id) on delete cascade,
  path text not null check (path in ('general', 'history', 'science')),
  question_count integer not null check (question_count in (5, 10)),
  seed text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.room_players (
  room_id uuid not null references public.rooms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid references public.profiles (id) on delete set null,
  joined_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  correct integer,
  points integer,
  total_time_ms integer,
  primary key (room_id, user_id)
);
create index if not exists room_players_user on public.room_players (user_id);

alter table public.friendships enable row level security;
alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

-- No policies on purpose, and no table access for the app roles.
revoke all on table public.friendships from anon, authenticated;
revoke all on table public.rooms from anon, authenticated;
revoke all on table public.room_players from anon, authenticated;

-- ---- Friends --------------------------------------------------------------

-- Find one player by exact username. Returns no email, only what a friend
-- request needs, and how you are already related.
create or replace function public.find_player(p_username text)
returns table (
  id uuid,
  username text,
  first_name text,
  avatar jsonb,
  relation text
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  return query
  select
    p.id,
    p.username,
    p.first_name,
    p.avatar,
    coalesce(
      (
        select case
          when f.status = 'accepted' then 'friend'
          when f.requester = me then 'sent'
          else 'received'
        end
        from public.friendships f
        where (f.requester = me and f.addressee = p.id)
           or (f.requester = p.id and f.addressee = me)
        limit 1
      ),
      'none'
    )
  from public.profiles p
  where p.username = lower(trim(p_username))
    and p.id <> me;
end;
$$;

-- Ask someone to be friends. If they already asked you, this accepts.
create or replace function public.send_friend_request(p_target uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  existing public.friendships;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_target = me then raise exception 'self_request'; end if;
  if not exists (select 1 from public.profiles where id = p_target) then
    raise exception 'player_not_found';
  end if;

  select * into existing
  from public.friendships f
  where (f.requester = me and f.addressee = p_target)
     or (f.requester = p_target and f.addressee = me);

  if found then
    if existing.status = 'accepted' then return 'already'; end if;
    if existing.requester = me then return 'sent'; end if;
    update public.friendships set status = 'accepted' where id = existing.id;
    return 'accepted';
  end if;

  insert into public.friendships (requester, addressee) values (me, p_target);
  return 'sent';
end;
$$;

-- Accept or decline a request someone sent you.
create or replace function public.respond_friend_request(p_request uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_accept then
    update public.friendships
    set status = 'accepted'
    where id = p_request and addressee = me and status = 'pending';
  else
    delete from public.friendships
    where id = p_request and addressee = me and status = 'pending';
  end if;
end;
$$;

-- Remove a friend, or cancel a request you sent.
create or replace function public.remove_friend(p_other uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  delete from public.friendships
  where (requester = me and addressee = p_other)
     or (requester = p_other and addressee = me);
end;
$$;

create or replace function public.my_friends()
returns table (
  id uuid,
  username text,
  first_name text,
  avatar jsonb,
  xp integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  return query
  select p.id, p.username, p.first_name, p.avatar, coalesce(g.xp, 0)
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester = me then f.addressee else f.requester end
  left join public.progress g on g.user_id = p.id
  where f.status = 'accepted'
    and (f.requester = me or f.addressee = me)
  order by p.first_name, p.username;
end;
$$;

create or replace function public.my_friend_requests()
returns table (
  request_id uuid,
  id uuid,
  username text,
  first_name text,
  avatar jsonb,
  direction text
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  return query
  select
    f.id,
    p.id,
    p.username,
    p.first_name,
    p.avatar,
    case when f.addressee = me then 'incoming' else 'outgoing' end
  from public.friendships f
  join public.profiles p
    on p.id = case when f.requester = me then f.addressee else f.requester end
  where f.status = 'pending'
    and (f.requester = me or f.addressee = me)
  order by f.created_at desc;
end;
$$;

-- ---- Rooms ----------------------------------------------------------------

-- Six characters with no 0, O, 1, or I, so a code is easy to say out loud.
create or replace function public.make_room_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  i integer;
begin
  loop
    result := '';
    for i in 1..6 loop
      result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;
    exit when not exists (select 1 from public.rooms where code = result);
  end loop;
  return result;
end;
$$;

create or replace function public.room_json(r public.rooms)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', r.id,
    'code', r.code,
    'path', r.path,
    'question_count', r.question_count,
    'seed', r.seed,
    'expires_at', r.expires_at,
    'host_id', r.host_id,
    'host_name', coalesce((select p.first_name from public.profiles p where p.id = r.host_id), 'Someone')
  );
$$;

-- Make a room. Optionally add an accepted friend straight away (a challenge).
create or replace function public.create_room(
  p_path text,
  p_count integer,
  p_invite uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.rooms;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  if p_path not in ('general', 'history', 'science') then raise exception 'bad_path'; end if;
  if p_count not in (5, 10) then raise exception 'bad_count'; end if;
  if (
    select count(*) from public.rooms
    where host_id = me and expires_at > now()
  ) >= 10 then
    raise exception 'too_many_rooms';
  end if;
  if p_invite is not null and not exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester = me and f.addressee = p_invite)
        or (f.requester = p_invite and f.addressee = me))
  ) then
    raise exception 'not_friends';
  end if;

  insert into public.rooms (code, host_id, path, question_count, seed, expires_at)
  values (
    public.make_room_code(),
    me,
    p_path,
    p_count,
    gen_random_uuid()::text,
    now() + interval '48 hours'
  )
  returning * into r;

  insert into public.room_players (room_id, user_id) values (r.id, me);
  if p_invite is not null then
    insert into public.room_players (room_id, user_id, invited_by)
    values (r.id, p_invite, me);
  end if;

  return public.room_json(r);
end;
$$;

-- Join by code. Members can always look again, even after it closes.
create or replace function public.join_room(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.rooms;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into r
  from public.rooms
  where code = upper(regexp_replace(p_code, '\s', '', 'g'));
  if not found then raise exception 'room_not_found'; end if;

  if exists (
    select 1 from public.room_players where room_id = r.id and user_id = me
  ) then
    return public.room_json(r);
  end if;

  if r.expires_at <= now() then raise exception 'room_expired'; end if;
  if (select count(*) from public.room_players where room_id = r.id) >= 20 then
    raise exception 'room_full';
  end if;

  insert into public.room_players (room_id, user_id) values (r.id, me)
  on conflict do nothing;
  return public.room_json(r);
end;
$$;

-- The room and its ranked leaderboard. Members only.
create or replace function public.get_room(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.rooms;
  board jsonb;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into r
  from public.rooms
  where code = upper(regexp_replace(p_code, '\s', '', 'g'));
  if not found then raise exception 'room_not_found'; end if;
  if not exists (
    select 1 from public.room_players where room_id = r.id and user_id = me
  ) then
    raise exception 'not_member';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'user_id', x.user_id,
        'username', x.username,
        'first_name', x.first_name,
        'avatar', x.avatar,
        'status', x.status,
        'position', case when x.status = 'finished' then x.pos end,
        'correct', x.correct,
        'points', x.points,
        'total_time_ms', x.total_time_ms,
        'is_host', x.user_id = r.host_id,
        'invited', x.invited_by is not null
      )
      order by (x.status <> 'finished'), x.pos, x.joined_at
    ),
    '[]'::jsonb
  )
  into board
  from (
    select
      rp.user_id,
      p.username,
      p.first_name,
      p.avatar,
      rp.invited_by,
      rp.joined_at,
      rp.correct,
      rp.points,
      rp.total_time_ms,
      case
        when rp.finished_at is not null then 'finished'
        when rp.started_at is not null then 'playing'
        else 'waiting'
      end as status,
      row_number() over (
        partition by (rp.finished_at is not null)
        order by rp.points desc nulls last,
                 rp.total_time_ms asc nulls last,
                 rp.finished_at asc nulls last
      ) as pos
    from public.room_players rp
    join public.profiles p on p.id = rp.user_id
    where rp.room_id = r.id
  ) x;

  return jsonb_build_object('room', public.room_json(r), 'players', board);
end;
$$;

-- Called when someone taps Play. One attempt only, so a second start fails.
create or replace function public.begin_room_round(p_room uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.rooms;
  rp public.room_players;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into r from public.rooms where id = p_room;
  if not found then raise exception 'room_not_found'; end if;
  select * into rp
  from public.room_players
  where room_id = p_room and user_id = me
  for update;
  if not found then raise exception 'not_member'; end if;
  if r.expires_at <= now() then raise exception 'room_expired'; end if;
  if rp.started_at is not null then raise exception 'already_played'; end if;
  update public.room_players
  set started_at = now()
  where room_id = p_room and user_id = me;
end;
$$;

-- Save a finished (or left) round. Rejects scores that could not happen.
create or replace function public.submit_room_score(
  p_room uuid,
  p_correct integer,
  p_points integer,
  p_time_ms integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  r public.rooms;
  rp public.room_players;
begin
  if me is null then raise exception 'not_signed_in'; end if;
  select * into r from public.rooms where id = p_room;
  if not found then raise exception 'room_not_found'; end if;
  select * into rp
  from public.room_players
  where room_id = p_room and user_id = me
  for update;
  if not found then raise exception 'not_member'; end if;
  if rp.started_at is null then raise exception 'not_started'; end if;
  if rp.finished_at is not null then raise exception 'already_finished'; end if;
  if r.expires_at <= now() then raise exception 'room_expired'; end if;
  if now() > rp.started_at + interval '10 minutes' then raise exception 'too_late'; end if;

  -- A correct answer is worth 100 to 140 points (100 plus 2 per second left).
  if p_correct < 0 or p_correct > r.question_count
     or p_points < p_correct * 100
     or p_points > p_correct * 140
     or p_time_ms < 0
     or p_time_ms > r.question_count * 21000 then
    raise exception 'bad_score';
  end if;

  update public.room_players
  set finished_at = now(),
      correct = p_correct,
      points = p_points,
      total_time_ms = p_time_ms
  where room_id = p_room and user_id = me;
end;
$$;

-- Rooms you are in, newest first, for the Compete screen.
create or replace function public.my_rooms()
returns table (
  code text,
  path text,
  question_count integer,
  expires_at timestamptz,
  host_name text,
  player_count integer,
  finished boolean,
  started boolean,
  invited_by_name text,
  my_points integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'not_signed_in'; end if;
  return query
  select
    r.code,
    r.path,
    r.question_count,
    r.expires_at,
    hp.first_name,
    (select count(*)::integer from public.room_players x where x.room_id = r.id),
    rp.finished_at is not null,
    rp.started_at is not null,
    ip.first_name,
    rp.points
  from public.room_players rp
  join public.rooms r on r.id = rp.room_id
  join public.profiles hp on hp.id = r.host_id
  left join public.profiles ip on ip.id = rp.invited_by
  where rp.user_id = me
    and r.created_at > now() - interval '14 days'
  order by (r.expires_at > now()) desc, r.created_at desc
  limit 20;
end;
$$;

-- Everything above is for signed-in players only.
revoke all on function public.find_player(text) from public, anon;
revoke all on function public.send_friend_request(uuid) from public, anon;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.my_friends() from public, anon;
revoke all on function public.my_friend_requests() from public, anon;
revoke all on function public.create_room(text, integer, uuid) from public, anon;
revoke all on function public.join_room(text) from public, anon;
revoke all on function public.get_room(text) from public, anon;
revoke all on function public.begin_room_round(uuid) from public, anon;
revoke all on function public.submit_room_score(uuid, integer, integer, integer) from public, anon;
revoke all on function public.my_rooms() from public, anon;
-- Internal helpers: not callable from the app at all.
revoke all on function public.make_room_code() from public, anon, authenticated;
revoke all on function public.room_json(public.rooms) from public, anon, authenticated;

grant execute on function public.find_player(text) to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.my_friends() to authenticated;
grant execute on function public.my_friend_requests() to authenticated;
grant execute on function public.create_room(text, integer, uuid) to authenticated;
grant execute on function public.join_room(text) to authenticated;
grant execute on function public.get_room(text) to authenticated;
grant execute on function public.begin_room_round(uuid) to authenticated;
grant execute on function public.submit_room_score(uuid, integer, integer, integer) to authenticated;
grant execute on function public.my_rooms() to authenticated;
