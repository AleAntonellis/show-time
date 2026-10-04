-- ShowTime · recensione generale delle serie TV
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0011_reconcile_series_status.sql.

create table if not exists public.series_reviews (
  id               uuid primary key default gen_random_uuid(),
  library_item_id  uuid not null unique
    references public.library_items (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  reviewed_on      date not null default current_date,
  note             text check (note is null or char_length(note) <= 1000),
  rating           numeric(3, 1) check (rating >= 0 and rating <= 10),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint series_reviews_content_required
    check (rating is not null or nullif(trim(note), '') is not null)
);

create index if not exists series_reviews_user_date_idx
  on public.series_reviews (user_id, reviewed_on desc);

alter table public.series_reviews enable row level security;

drop policy if exists "series_reviews: gestisci le proprie"
  on public.series_reviews;
create policy "series_reviews: gestisci le proprie"
on public.series_reviews for all
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.library_items li
    join public.titles t on t.id = li.title_id
    where li.id = series_reviews.library_item_id
      and li.user_id = auth.uid()
      and t.media_type = 'tv'
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.library_items li
    join public.titles t on t.id = li.title_id
    where li.id = series_reviews.library_item_id
      and li.user_id = auth.uid()
      and t.media_type = 'tv'
  )
);

drop trigger if exists series_reviews_touch on public.series_reviews;
create trigger series_reviews_touch
  before update on public.series_reviews
  for each row execute function public.touch_updated_at();

create or replace function public.get_followed_profile(p_username text)
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

        union all

        select sr.id
        from public.series_reviews sr
        join public.library_items li on li.id = sr.library_item_id
        join public.titles t on t.id = li.title_id
        where sr.user_id = v_profile_id
          and li.user_id = v_profile_id
          and t.media_type = 'tv'
      ) diary_entries
    )
  from public.profiles p
  where p.id = v_profile_id;
end;
$$;

create or replace function public.get_followed_diary(
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

    union all

    select
      t.tmdb_id,
      t.media_type,
      t.title,
      t.year,
      t.poster_path,
      'Recensione serie'::text as detail,
      sr.reviewed_on as watched_on,
      sr.rating,
      sr.note,
      sr.updated_at as created_at
    from public.series_reviews sr
    join public.library_items li on li.id = sr.library_item_id
    join public.titles t on t.id = li.title_id
    where sr.user_id = v_profile_id
      and li.user_id = v_profile_id
      and t.media_type = 'tv'
  ) entries
  order by entries.watched_on desc, entries.created_at desc
  limit p_limit
  offset p_offset;
end;
$$;

create or replace function public.get_followed_title_activity(
  p_media_type text,
  p_tmdb_id integer,
  p_limit integer default 3,
  p_offset integer default 0
)
returns table (
  username text,
  display_name text,
  detail text,
  watched_on date,
  rating numeric,
  note text,
  viewing_number bigint,
  total_count bigint,
  contact_count bigint,
  average_rating numeric
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
  if p_media_type not in ('movie', 'tv') or p_tmdb_id <= 0 then
    raise exception 'Titolo non valido'
      using errcode = '22023';
  end if;
  if p_limit < 1 or p_limit > 50 then
    raise exception 'Limite attività non valido'
      using errcode = '22023';
  end if;
  if p_offset < 0 then
    raise exception 'Offset attività non valido'
      using errcode = '22023';
  end if;

  return query
  with raw_entries as (
    select
      p.id as contact_id,
      p.username,
      p.display_name,
      'movie'::text as activity_key,
      'Film'::text as detail,
      v.watched_on,
      v.rating,
      v.note,
      v.created_at
    from public.user_follows f
    join public.profiles p on p.id = f.followed_id
    join public.library_items li on li.user_id = p.id
    join public.titles t on t.id = li.title_id
    join public.viewings v
      on v.library_item_id = li.id
      and v.user_id = p.id
    where auth.uid() = f.follower_id
      and f.status = 'accepted'
      and p.username is not null
      and p_media_type = 'movie'
      and t.media_type = 'movie'
      and t.tmdb_id = p_tmdb_id

    union all

    select
      p.id as contact_id,
      p.username,
      p.display_name,
      'series_review'::text as activity_key,
      'Recensione serie'::text as detail,
      sr.reviewed_on as watched_on,
      sr.rating,
      sr.note,
      sr.updated_at as created_at
    from public.user_follows f
    join public.profiles p on p.id = f.followed_id
    join public.library_items li on li.user_id = p.id
    join public.titles t on t.id = li.title_id
    join public.series_reviews sr
      on sr.library_item_id = li.id
      and sr.user_id = p.id
    where auth.uid() = f.follower_id
      and f.status = 'accepted'
      and p.username is not null
      and p_media_type = 'tv'
      and t.media_type = 'tv'
      and t.tmdb_id = p_tmdb_id

    union all

    select
      p.id as contact_id,
      p.username,
      p.display_name,
      ev.season_number::text || '|' || ev.episode_number::text as activity_key,
      format('S%s E%s', ev.season_number, ev.episode_number)::text as detail,
      ev.watched_on,
      ev.rating,
      ev.note,
      ev.created_at
    from public.user_follows f
    join public.profiles p on p.id = f.followed_id
    join public.library_items li on li.user_id = p.id
    join public.titles t on t.id = li.title_id
    join public.episode_viewings ev
      on ev.library_item_id = li.id
      and ev.user_id = p.id
    where auth.uid() = f.follower_id
      and f.status = 'accepted'
      and p.username is not null
      and p_media_type = 'tv'
      and t.media_type = 'tv'
      and t.tmdb_id = p_tmdb_id

    union all

    select
      p.id as contact_id,
      p.username,
      p.display_name,
      ew.season_number::text || '|' || ew.episode_number::text as activity_key,
      format('S%s E%s', ew.season_number, ew.episode_number)::text as detail,
      ew.watched_on,
      null::numeric as rating,
      null::text as note,
      ew.created_at
    from public.user_follows f
    join public.profiles p on p.id = f.followed_id
    join public.library_items li on li.user_id = p.id
    join public.titles t on t.id = li.title_id
    join public.episode_watches ew
      on ew.library_item_id = li.id
      and ew.user_id = p.id
    where auth.uid() = f.follower_id
      and f.status = 'accepted'
      and p.username is not null
      and p_media_type = 'tv'
      and t.media_type = 'tv'
      and t.tmdb_id = p_tmdb_id
      and ew.source = 'tracked'
      and not exists (
        select 1
        from public.episode_viewings ev
        where ev.library_item_id = ew.library_item_id
          and ev.user_id = p.id
          and ev.season_number = ew.season_number
          and ev.episode_number = ew.episode_number
      )
  ),
  numbered_entries as (
    select
      raw_entries.*,
      row_number() over (
        partition by raw_entries.contact_id, raw_entries.activity_key
        order by raw_entries.watched_on, raw_entries.created_at
      ) as viewing_number
    from raw_entries
  ),
  summary as (
    select
      count(*)::bigint as total_count,
      count(distinct numbered_entries.contact_id)::bigint as contact_count,
      avg(numbered_entries.rating)::numeric as average_rating
    from numbered_entries
  )
  select
    numbered_entries.username,
    numbered_entries.display_name,
    numbered_entries.detail,
    numbered_entries.watched_on,
    numbered_entries.rating,
    numbered_entries.note,
    numbered_entries.viewing_number,
    summary.total_count,
    summary.contact_count,
    summary.average_rating
  from numbered_entries
  cross join summary
  order by
    numbered_entries.watched_on desc,
    numbered_entries.created_at desc,
    numbered_entries.username
  limit p_limit
  offset p_offset;
end;
$$;

revoke all on function public.get_followed_profile(text) from public;
revoke all on function public.get_followed_diary(text, integer, integer)
  from public;
revoke all on function public.get_followed_title_activity(
  text, integer, integer, integer
) from public;

grant execute on function public.get_followed_profile(text) to authenticated;
grant execute on function public.get_followed_diary(
  text, integer, integer
) to authenticated;
grant execute on function public.get_followed_title_activity(
  text, integer, integer, integer
) to authenticated;
