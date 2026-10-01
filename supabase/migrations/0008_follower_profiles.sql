-- ShowTime · profili consultabili dai follower accettati
-- Esegui questo file nel SQL Editor del tuo progetto Supabase, DOPO
-- 0007_movie_imports.sql.

-- Verifica centralizzata: il proprietario vede sempre il proprio profilo,
-- gli altri utenti solo se lo seguono con una relazione accettata.
create or replace function public.require_viewable_profile(p_username text)
returns uuid
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_viewer_id uuid := auth.uid();
  v_profile_id uuid;
  v_username text := lower(trim(p_username));
begin
  if v_viewer_id is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;

  select p.id
  into v_profile_id
  from public.profiles p
  where p.username = v_username;

  if v_profile_id is null then
    raise exception 'Profilo non disponibile'
      using errcode = 'P0002';
  end if;

  if v_profile_id <> v_viewer_id
    and not exists (
      select 1
      from public.user_follows f
      where f.follower_id = v_viewer_id
        and f.followed_id = v_profile_id
        and f.status = 'accepted'
    )
  then
    raise exception 'Accesso al profilo non autorizzato'
      using errcode = '42501';
  end if;

  return v_profile_id;
end;
$$;

drop function if exists public.get_followed_profile(text);
create function public.get_followed_profile(p_username text)
returns table (
  username text,
  display_name text,
  library_count bigint,
  diary_count bigint
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  v_profile_id := public.require_viewable_profile(p_username);

  return query
  select
    p.username,
    p.display_name,
    (
      select count(*)
      from public.library_items li
      where li.user_id = v_profile_id
    ),
    (
      select count(*)
      from (
        select v.id
        from public.viewings v
        join public.library_items li on li.id = v.library_item_id
        where v.user_id = v_profile_id
          and li.user_id = v_profile_id
          and (v.rating is not null or nullif(trim(v.note), '') is not null)

        union all

        select ev.id
        from public.episode_viewings ev
        join public.library_items li on li.id = ev.library_item_id
        where ev.user_id = v_profile_id
          and li.user_id = v_profile_id
          and (ev.rating is not null or nullif(trim(ev.note), '') is not null)
      ) diary_entries
    )
  from public.profiles p
  where p.id = v_profile_id;
end;
$$;

drop function if exists public.get_followed_library(text);
create function public.get_followed_library(p_username text)
returns table (
  tmdb_id integer,
  media_type text,
  title text,
  year text,
  poster_path text,
  status text,
  total_episodes integer,
  watched_episodes bigint
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  v_profile_id := public.require_viewable_profile(p_username);

  return query
  select
    t.tmdb_id,
    t.media_type,
    t.title,
    t.year,
    t.poster_path,
    li.status,
    t.total_episodes,
    (
      select count(*)
      from public.episode_watches ew
      where ew.library_item_id = li.id
        and ew.user_id = v_profile_id
    ) as watched_episodes
  from public.library_items li
  join public.titles t on t.id = li.title_id
  where li.user_id = v_profile_id
  order by
    case li.status
      when 'watching' then 0
      when 'to_watch' then 1
      else 2
    end,
    li.updated_at desc
  limit 500;
end;
$$;

drop function if exists public.get_followed_diary(text, integer, integer);
create function public.get_followed_diary(
  p_username text,
  p_limit integer default 30,
  p_offset integer default 0
)
returns table (
  tmdb_id integer,
  media_type text,
  title text,
  year text,
  poster_path text,
  detail text,
  watched_on date,
  rating numeric,
  note text
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  if p_limit < 1 or p_limit > 50 then
    raise exception 'Limite diario non valido'
      using errcode = '22023';
  end if;
  if p_offset < 0 then
    raise exception 'Offset diario non valido'
      using errcode = '22023';
  end if;

  v_profile_id := public.require_viewable_profile(p_username);

  return query
  select
    entries.tmdb_id,
    entries.media_type,
    entries.title,
    entries.year,
    entries.poster_path,
    entries.detail,
    entries.watched_on,
    entries.rating,
    entries.note
  from (
    select
      t.tmdb_id,
      t.media_type,
      t.title,
      t.year,
      t.poster_path,
      'Film'::text as detail,
      v.watched_on,
      v.rating,
      v.note,
      v.created_at
    from public.viewings v
    join public.library_items li on li.id = v.library_item_id
    join public.titles t on t.id = li.title_id
    where v.user_id = v_profile_id
      and li.user_id = v_profile_id
      and (v.rating is not null or nullif(trim(v.note), '') is not null)

    union all

    select
      t.tmdb_id,
      t.media_type,
      t.title,
      t.year,
      t.poster_path,
      format('S%s E%s', ev.season_number, ev.episode_number)::text as detail,
      ev.watched_on,
      ev.rating,
      ev.note,
      ev.created_at
    from public.episode_viewings ev
    join public.library_items li on li.id = ev.library_item_id
    join public.titles t on t.id = li.title_id
    where ev.user_id = v_profile_id
      and li.user_id = v_profile_id
      and (ev.rating is not null or nullif(trim(ev.note), '') is not null)
  ) entries
  order by entries.watched_on desc, entries.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

revoke all on function public.require_viewable_profile(text) from public;
revoke all on function public.get_followed_profile(text) from public;
revoke all on function public.get_followed_library(text) from public;
revoke all on function public.get_followed_diary(text, integer, integer) from public;

grant execute on function public.get_followed_profile(text) to authenticated;
grant execute on function public.get_followed_library(text) to authenticated;
grant execute on function public.get_followed_diary(text, integer, integer) to authenticated;
