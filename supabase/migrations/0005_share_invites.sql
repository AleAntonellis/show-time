-- ShowTime · inviti esterni monouso per contatto + condivisione interna
-- Esegui questo file nel SQL Editor del tuo progetto Supabase, DOPO
-- 0004_internal_sharing.sql.

create extension if not exists pgcrypto;

create table if not exists public.title_share_invites (
  id            uuid primary key default gen_random_uuid(),
  token_hash    text not null unique,
  sender_id     uuid not null references public.profiles (id) on delete cascade,
  claimed_by    uuid references public.profiles (id) on delete cascade,
  tmdb_id       integer not null,
  media_type    text not null check (media_type in ('movie', 'tv')),
  title         text not null,
  year          text,
  poster_path   text,
  message       text check (message is null or char_length(message) <= 500),
  status        text not null default 'pending'
                check (status in ('pending', 'accepted', 'declined')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default (now() + interval '7 days'),
  claimed_at    timestamptz,
  resolved_at   timestamptz,
  check (claimed_by is null or claimed_by <> sender_id)
);

create index if not exists title_share_invites_sender_idx
  on public.title_share_invites (sender_id, created_at desc);
create index if not exists title_share_invites_expiry_idx
  on public.title_share_invites (expires_at)
  where status = 'pending';

alter table public.title_share_invites enable row level security;
revoke all on public.title_share_invites from anon, authenticated;

alter table public.title_shares
  add column if not exists invite_id uuid
  references public.title_share_invites (id) on delete set null;

create unique index if not exists title_shares_invite_unique_idx
  on public.title_shares (invite_id)
  where invite_id is not null;

create or replace function public.create_title_share_invite(
  p_tmdb_id integer,
  p_media_type text,
  p_title text,
  p_year text default null,
  p_poster_path text default null,
  p_message text default null
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sender_id uuid := auth.uid();
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
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

  insert into public.title_share_invites (
    token_hash,
    sender_id,
    tmdb_id,
    media_type,
    title,
    year,
    poster_path,
    message
  )
  values (
    encode(extensions.digest(v_token, 'sha256'), 'hex'),
    v_sender_id,
    p_tmdb_id,
    p_media_type,
    trim(p_title),
    nullif(trim(p_year), ''),
    nullif(trim(p_poster_path), ''),
    v_message
  );

  return v_token;
end;
$$;

create or replace function public.claim_title_share_invite(p_token text)
returns table (
  invite_id uuid,
  sender_id uuid,
  sender_username text,
  sender_display_name text,
  tmdb_id integer,
  media_type text,
  title text,
  year text,
  poster_path text,
  message text,
  status text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.title_share_invites;
begin
  if v_user_id is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;
  if p_token is null or char_length(p_token) < 32 then
    raise exception 'Invito non valido'
      using errcode = '22023';
  end if;

  select i.*
  into v_invite
  from public.title_share_invites i
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'Invito non disponibile'
      using errcode = 'P0002';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'Invito scaduto'
      using errcode = '22023';
  end if;
  if v_invite.sender_id = v_user_id then
    raise exception 'Non puoi accettare il tuo invito'
      using errcode = '22023';
  end if;
  if v_invite.claimed_by is not null and v_invite.claimed_by <> v_user_id then
    raise exception 'Invito già utilizzato'
      using errcode = '42501';
  end if;

  if v_invite.claimed_by is null then
    update public.title_share_invites
    set claimed_by = v_user_id,
        claimed_at = now()
    where id = v_invite.id;
    v_invite.claimed_by := v_user_id;
  end if;

  return query
  select
    v_invite.id,
    v_invite.sender_id,
    p.username,
    p.display_name,
    v_invite.tmdb_id,
    v_invite.media_type,
    v_invite.title,
    v_invite.year,
    v_invite.poster_path,
    v_invite.message,
    v_invite.status,
    v_invite.expires_at
  from public.profiles p
  where p.id = v_invite.sender_id;
end;
$$;

create or replace function public.accept_title_share_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.title_share_invites;
  v_share_id uuid;
begin
  if v_user_id is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;

  select i.*
  into v_invite
  from public.title_share_invites i
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'Invito non disponibile'
      using errcode = 'P0002';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'Invito scaduto'
      using errcode = '22023';
  end if;
  if v_invite.sender_id = v_user_id then
    raise exception 'Non puoi accettare il tuo invito'
      using errcode = '22023';
  end if;
  if v_invite.claimed_by is not null and v_invite.claimed_by <> v_user_id then
    raise exception 'Invito già utilizzato'
      using errcode = '42501';
  end if;

  if v_invite.status = 'accepted' then
    select s.id into v_share_id
    from public.title_shares s
    where s.invite_id = v_invite.id;
    return v_share_id;
  end if;
  if v_invite.status <> 'pending' then
    raise exception 'Invito già risolto'
      using errcode = '22023';
  end if;

  insert into public.user_follows (follower_id, followed_id, status)
  values (v_invite.sender_id, v_user_id, 'accepted')
  on conflict (follower_id, followed_id)
  do update set status = 'accepted', updated_at = now();

  insert into public.user_follows (follower_id, followed_id, status)
  values (v_user_id, v_invite.sender_id, 'accepted')
  on conflict (follower_id, followed_id)
  do update set status = 'accepted', updated_at = now();

  insert into public.title_shares (
    sender_id,
    recipient_id,
    tmdb_id,
    media_type,
    title,
    year,
    poster_path,
    message,
    read_at,
    invite_id
  )
  values (
    v_invite.sender_id,
    v_user_id,
    v_invite.tmdb_id,
    v_invite.media_type,
    v_invite.title,
    v_invite.year,
    v_invite.poster_path,
    v_invite.message,
    now(),
    v_invite.id
  )
  returning id into v_share_id;

  update public.title_share_invites
  set claimed_by = v_user_id,
      claimed_at = coalesce(claimed_at, now()),
      status = 'accepted',
      resolved_at = now()
  where id = v_invite.id;

  return v_share_id;
end;
$$;

create or replace function public.decline_title_share_invite(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.title_share_invites;
begin
  if v_user_id is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;

  select i.*
  into v_invite
  from public.title_share_invites i
  where i.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
  for update;

  if not found then
    raise exception 'Invito non disponibile'
      using errcode = 'P0002';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'Invito scaduto'
      using errcode = '22023';
  end if;
  if v_invite.sender_id = v_user_id then
    raise exception 'Non puoi risolvere il tuo invito'
      using errcode = '22023';
  end if;
  if v_invite.claimed_by is not null and v_invite.claimed_by <> v_user_id then
    raise exception 'Invito già utilizzato'
      using errcode = '42501';
  end if;
  if v_invite.status = 'accepted' then
    raise exception 'Invito già accettato'
      using errcode = '22023';
  end if;

  update public.title_share_invites
  set claimed_by = v_user_id,
      claimed_at = coalesce(claimed_at, now()),
      status = 'declined',
      resolved_at = now()
  where id = v_invite.id;
end;
$$;

create or replace function public.revoke_title_share_invite(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;

  delete from public.title_share_invites
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and sender_id = auth.uid()
    and status = 'pending'
    and claimed_by is null;

  return found;
end;
$$;

revoke all on function public.create_title_share_invite(
  integer, text, text, text, text, text
) from public;
revoke all on function public.claim_title_share_invite(text) from public;
revoke all on function public.accept_title_share_invite(text) from public;
revoke all on function public.decline_title_share_invite(text) from public;
revoke all on function public.revoke_title_share_invite(text) from public;

grant execute on function public.create_title_share_invite(
  integer, text, text, text, text, text
) to authenticated;
grant execute on function public.claim_title_share_invite(text) to authenticated;
grant execute on function public.accept_title_share_invite(text) to authenticated;
grant execute on function public.decline_title_share_invite(text) to authenticated;
grant execute on function public.revoke_title_share_invite(text) to authenticated;
