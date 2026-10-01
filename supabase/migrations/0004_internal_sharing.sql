-- ShowTime · profili pubblici, contatti e condivisioni interne
-- Esegui questo file nel SQL Editor del tuo progetto Supabase, DOPO
-- 0003_episode_viewings.sql.

-- ---------------------------------------------------------------------------
-- Username pubblico
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (
    username is null
    or (
      username = lower(username)
      and username ~ '^[a-z0-9_]{3,24}$'
    )
  );

create unique index if not exists profiles_username_unique_idx
  on public.profiles (lower(username))
  where username is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_username text := lower(nullif(trim(new.raw_user_meta_data ->> 'username'), ''));
begin
  if v_username is not null and v_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Username non valido'
      using errcode = '22023';
  end if;

  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      split_part(new.email, '@', 1)
    ),
    v_username
  );
  return new;
end;
$$;

create or replace function public.username_available(p_username text)
returns boolean
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_username text := lower(trim(p_username));
begin
  if v_username is null or v_username !~ '^[a-z0-9_]{3,24}$' then
    return false;
  end if;

  return not exists (
    select 1
    from public.profiles p
    where lower(p.username) = v_username
  );
end;
$$;

create or replace function public.set_username(p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_username text := lower(trim(p_username));
begin
  if v_user_id is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;
  if v_username is null or v_username !~ '^[a-z0-9_]{3,24}$' then
    raise exception 'Usa 3-24 caratteri: lettere minuscole, numeri o underscore'
      using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.profiles p
    where lower(p.username) = v_username
      and p.id <> v_user_id
  ) then
    raise exception 'Username già in uso'
      using errcode = '23505';
  end if;

  update public.profiles
  set username = v_username
  where id = v_user_id;

  return v_username;
end;
$$;

-- ---------------------------------------------------------------------------
-- Relazioni one-way con accettazione
-- ---------------------------------------------------------------------------
create table if not exists public.user_follows (
  id           uuid primary key default gen_random_uuid(),
  follower_id  uuid not null references public.profiles (id) on delete cascade,
  followed_id  uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending', 'accepted', 'rejected')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (follower_id, followed_id),
  check (follower_id <> followed_id)
);

create index if not exists user_follows_followed_status_idx
  on public.user_follows (followed_id, status);
create index if not exists user_follows_follower_status_idx
  on public.user_follows (follower_id, status);

alter table public.user_follows enable row level security;

revoke all on public.user_follows from anon, authenticated;
grant select on public.user_follows to authenticated;

create policy "user_follows: leggi relazioni coinvolte"
  on public.user_follows for select
  to authenticated
  using (
    (select auth.uid()) = follower_id
    or (select auth.uid()) = followed_id
  );

drop trigger if exists user_follows_touch on public.user_follows;
create trigger user_follows_touch
  before update on public.user_follows
  for each row execute function public.touch_updated_at();

create or replace function public.search_public_profiles(p_query text)
returns table (
  id uuid,
  username text,
  display_name text,
  outgoing_status text,
  incoming_status text
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    p.id,
    p.username,
    p.display_name,
    (
      select f.status
      from public.user_follows f
      where f.follower_id = auth.uid()
        and f.followed_id = p.id
      limit 1
    ) as outgoing_status,
    (
      select f.status
      from public.user_follows f
      where f.follower_id = p.id
        and f.followed_id = auth.uid()
      limit 1
    ) as incoming_status
  from public.profiles p
  where auth.uid() is not null
    and p.id <> auth.uid()
    and p.username is not null
    and length(trim(p_query)) >= 2
    and p.username like '%' || lower(trim(p_query)) || '%'
  order by
    case when p.username = lower(trim(p_query)) then 0 else 1 end,
    p.username
  limit 20;
$$;

create or replace function public.get_follow_connections()
returns table (
  follow_id uuid,
  user_id uuid,
  username text,
  display_name text,
  direction text,
  status text,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = ''
as $$
  select
    f.id,
    case
      when f.follower_id = auth.uid() then f.followed_id
      else f.follower_id
    end as user_id,
    p.username,
    p.display_name,
    case
      when f.follower_id = auth.uid() then 'outgoing'
      else 'incoming'
    end as direction,
    f.status,
    f.created_at
  from public.user_follows f
  join public.profiles p
    on p.id = case
      when f.follower_id = auth.uid() then f.followed_id
      else f.follower_id
    end
  where auth.uid() is not null
    and (f.follower_id = auth.uid() or f.followed_id = auth.uid())
    and p.username is not null
  order by
    case f.status when 'pending' then 0 when 'accepted' then 1 else 2 end,
    f.created_at desc;
$$;

create or replace function public.request_follow(p_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_follow_id uuid;
begin
  if v_user_id is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;
  if p_user_id = v_user_id then
    raise exception 'Non puoi seguire te stesso'
      using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.id = p_user_id and p.username is not null
  ) then
    raise exception 'Utente non disponibile'
      using errcode = 'P0002';
  end if;

  insert into public.user_follows (follower_id, followed_id, status)
  values (v_user_id, p_user_id, 'pending')
  on conflict (follower_id, followed_id)
  do update set
    status = case
      when public.user_follows.status = 'accepted' then 'accepted'
      else 'pending'
    end,
    updated_at = now()
  returning id into v_follow_id;

  return v_follow_id;
end;
$$;

create or replace function public.respond_follow(
  p_follow_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;

  update public.user_follows
  set status = case when p_accept then 'accepted' else 'rejected' end
  where id = p_follow_id
    and followed_id = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'Richiesta non disponibile'
      using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.remove_follow(p_follow_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;

  delete from public.user_follows
  where id = p_follow_id
    and (follower_id = auth.uid() or followed_id = auth.uid());

  if not found then
    raise exception 'Relazione non disponibile'
      using errcode = 'P0002';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Condivisioni interne di titoli
-- ---------------------------------------------------------------------------
create table if not exists public.title_shares (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references public.profiles (id) on delete cascade,
  recipient_id  uuid not null references public.profiles (id) on delete cascade,
  tmdb_id       integer not null,
  media_type    text not null check (media_type in ('movie', 'tv')),
  title         text not null,
  year          text,
  poster_path   text,
  message       text check (message is null or char_length(message) <= 500),
  created_at    timestamptz not null default now(),
  read_at       timestamptz,
  check (sender_id <> recipient_id)
);

create index if not exists title_shares_recipient_created_idx
  on public.title_shares (recipient_id, created_at desc);
create index if not exists title_shares_sender_created_idx
  on public.title_shares (sender_id, created_at desc);
create index if not exists title_shares_recipient_unread_idx
  on public.title_shares (recipient_id, created_at desc)
  where read_at is null;

alter table public.title_shares enable row level security;

revoke all on public.title_shares from anon, authenticated;
grant select on public.title_shares to authenticated;

create policy "title_shares: leggi inviate o ricevute"
  on public.title_shares for select
  to authenticated
  using (
    (select auth.uid()) = sender_id
    or (select auth.uid()) = recipient_id
  );

create or replace function public.share_title_with_contact(
  p_recipient_id uuid,
  p_tmdb_id integer,
  p_media_type text,
  p_title text,
  p_year text default null,
  p_poster_path text default null,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := auth.uid();
  v_share_id uuid;
  v_message text := nullif(trim(p_message), '');
begin
  if v_sender_id is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;
  if p_media_type not in ('movie', 'tv') then
    raise exception 'Tipo titolo non valido'
      using errcode = '22023';
  end if;
  if p_tmdb_id <= 0 or nullif(trim(p_title), '') is null then
    raise exception 'Titolo non valido'
      using errcode = '22023';
  end if;
  if v_message is not null and char_length(v_message) > 500 then
    raise exception 'Il messaggio può contenere al massimo 500 caratteri'
      using errcode = '22001';
  end if;
  if not exists (
    select 1
    from public.user_follows f
    where f.follower_id = v_sender_id
      and f.followed_id = p_recipient_id
      and f.status = 'accepted'
  ) then
    raise exception 'Puoi condividere solo con utenti che hanno accettato la richiesta'
      using errcode = '42501';
  end if;

  insert into public.title_shares (
    sender_id,
    recipient_id,
    tmdb_id,
    media_type,
    title,
    year,
    poster_path,
    message
  )
  values (
    v_sender_id,
    p_recipient_id,
    p_tmdb_id,
    p_media_type,
    trim(p_title),
    nullif(trim(p_year), ''),
    nullif(trim(p_poster_path), ''),
    v_message
  )
  returning id into v_share_id;

  return v_share_id;
end;
$$;

create or replace function public.get_title_shares(p_box text default 'received')
returns table (
  id uuid,
  counterparty_id uuid,
  counterparty_username text,
  counterparty_display_name text,
  tmdb_id integer,
  media_type text,
  title text,
  year text,
  poster_path text,
  message text,
  created_at timestamptz,
  read_at timestamptz
)
language plpgsql
security definer
stable
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;
  if p_box not in ('received', 'sent') then
    raise exception 'Casella non valida'
      using errcode = '22023';
  end if;

  return query
  select
    s.id,
    case when p_box = 'sent' then s.recipient_id else s.sender_id end,
    p.username,
    p.display_name,
    s.tmdb_id,
    s.media_type,
    s.title,
    s.year,
    s.poster_path,
    s.message,
    s.created_at,
    s.read_at
  from public.title_shares s
  join public.profiles p
    on p.id = case when p_box = 'sent' then s.recipient_id else s.sender_id end
  where
    (p_box = 'received' and s.recipient_id = auth.uid())
    or (p_box = 'sent' and s.sender_id = auth.uid())
  order by s.created_at desc
  limit 200;
end;
$$;

create or replace function public.mark_title_share_read(p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;

  update public.title_shares
  set read_at = coalesce(read_at, now())
  where id = p_share_id
    and recipient_id = auth.uid();

  if not found then
    raise exception 'Condivisione non disponibile'
      using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.get_unread_share_count()
returns integer
language sql
security definer
stable
set search_path = ''
as $$
  select count(*)::integer
  from public.title_shares s
  where auth.uid() is not null
    and s.recipient_id = auth.uid()
    and s.read_at is null;
$$;

-- ---------------------------------------------------------------------------
-- Grants RPC
-- ---------------------------------------------------------------------------
revoke all on function public.username_available(text) from public;
revoke all on function public.set_username(text) from public;
revoke all on function public.search_public_profiles(text) from public;
revoke all on function public.get_follow_connections() from public;
revoke all on function public.request_follow(uuid) from public;
revoke all on function public.respond_follow(uuid, boolean) from public;
revoke all on function public.remove_follow(uuid) from public;
revoke all on function public.share_title_with_contact(
  uuid, integer, text, text, text, text, text
) from public;
revoke all on function public.get_title_shares(text) from public;
revoke all on function public.mark_title_share_read(uuid) from public;
revoke all on function public.get_unread_share_count() from public;

grant execute on function public.username_available(text) to anon, authenticated;
grant execute on function public.set_username(text) to authenticated;
grant execute on function public.search_public_profiles(text) to authenticated;
grant execute on function public.get_follow_connections() to authenticated;
grant execute on function public.request_follow(uuid) to authenticated;
grant execute on function public.respond_follow(uuid, boolean) to authenticated;
grant execute on function public.remove_follow(uuid) to authenticated;
grant execute on function public.share_title_with_contact(
  uuid, integer, text, text, text, text, text
) to authenticated;
grant execute on function public.get_title_shares(text) to authenticated;
grant execute on function public.mark_title_share_read(uuid) to authenticated;
grant execute on function public.get_unread_share_count() to authenticated;

-- Realtime per badge e Inbox.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'title_shares'
  ) then
    alter publication supabase_realtime add table public.title_shares;
  end if;
end;
$$;
