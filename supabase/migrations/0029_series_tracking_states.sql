-- ShowTime · stato manuale Abbandonata per le serie
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0028_profile_trophies.sql.

alter table public.library_items
  add column if not exists series_tracking_state text
  not null default 'active';

alter table public.library_items
  drop constraint if exists library_items_series_tracking_state_check;
alter table public.library_items
  add constraint library_items_series_tracking_state_check
  check (
    series_tracking_state in ('active', 'abandoned')
  );

create index if not exists library_items_series_tracking_state_idx
  on public.library_items (user_id, series_tracking_state)
  where series_tracking_state <> 'active';

create or replace function public.normalize_series_tracking_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_media_type text;
begin
  select t.media_type
  into v_media_type
  from public.titles t
  where t.id = new.title_id;

  if v_media_type <> 'tv' or new.status <> 'watching' then
    new.series_tracking_state := 'active';
  end if;

  return new;
end;
$$;

drop trigger if exists library_items_normalize_series_tracking_state
  on public.library_items;
create trigger library_items_normalize_series_tracking_state
  before insert or update of status, title_id, series_tracking_state
  on public.library_items
  for each row execute function public.normalize_series_tracking_state();

create or replace function public.set_series_tracking_state(
  p_library_item_id uuid,
  p_state text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_status text;
  v_media_type text;
begin
  if v_user_id is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;
  if p_state is null or p_state not in ('active', 'abandoned') then
    raise exception 'Stato serie non valido'
      using errcode = '22023';
  end if;

  select li.status, t.media_type
  into v_status, v_media_type
  from public.library_items li
  join public.titles t on t.id = li.title_id
  where li.id = p_library_item_id
    and li.user_id = v_user_id;

  if not found then
    raise exception 'Serie non disponibile'
      using errcode = 'P0002';
  end if;
  if v_media_type <> 'tv' then
    raise exception 'Lo stato manuale è disponibile solo per le serie'
      using errcode = '22023';
  end if;
  if p_state <> 'active' and v_status <> 'watching' then
    raise exception 'Puoi abbandonare solo una serie in corso'
      using errcode = '22023';
  end if;

  update public.library_items
  set series_tracking_state = p_state
  where id = p_library_item_id
    and user_id = v_user_id;
end;
$$;

revoke all on function public.set_series_tracking_state(uuid, text)
  from public;
grant execute on function public.set_series_tracking_state(uuid, text)
  to authenticated;

drop function if exists public.get_followed_library(text);
create function public.get_followed_library(p_username text)
returns table (
  tmdb_id integer,
  media_type text,
  title text,
  year text,
  poster_path text,
  status text,
  series_tracking_state text,
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
    li.series_tracking_state,
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

revoke all on function public.get_followed_library(text) from public;
grant execute on function public.get_followed_library(text)
  to authenticated;
