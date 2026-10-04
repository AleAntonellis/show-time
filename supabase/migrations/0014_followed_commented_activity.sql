-- ShowTime · attività titolo dei contatti limitata ai commenti
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0013_series_viewings.sql.

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
  with all_entries as (
    select
      v.id as entry_id,
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
      sv.id as entry_id,
      p.id as contact_id,
      p.username,
      p.display_name,
      'series'::text as activity_key,
      'Serie completa'::text as detail,
      sv.watched_on,
      sv.rating,
      sv.note,
      sv.created_at
    from public.user_follows f
    join public.profiles p on p.id = f.followed_id
    join public.library_items li on li.user_id = p.id
    join public.titles t on t.id = li.title_id
    join public.series_viewings sv
      on sv.library_item_id = li.id
      and sv.user_id = p.id
    where auth.uid() = f.follower_id
      and f.status = 'accepted'
      and p.username is not null
      and p_media_type = 'tv'
      and t.media_type = 'tv'
      and t.tmdb_id = p_tmdb_id

    union all

    select
      ev.id as entry_id,
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
  ),
  numbered_entries as (
    select
      all_entries.*,
      row_number() over (
        partition by all_entries.contact_id, all_entries.activity_key
        order by
          all_entries.watched_on,
          all_entries.created_at,
          all_entries.entry_id
      ) as viewing_number
    from all_entries
  ),
  commented_entries as (
    select *
    from numbered_entries
    where nullif(trim(numbered_entries.note), '') is not null
  ),
  summary as (
    select
      count(*)::bigint as total_count,
      count(distinct commented_entries.contact_id)::bigint as contact_count,
      avg(commented_entries.rating)::numeric as average_rating
    from commented_entries
  )
  select
    commented_entries.username,
    commented_entries.display_name,
    commented_entries.detail,
    commented_entries.watched_on,
    commented_entries.rating,
    commented_entries.note,
    commented_entries.viewing_number,
    summary.total_count,
    summary.contact_count,
    summary.average_rating
  from commented_entries
  cross join summary
  order by
    commented_entries.watched_on desc,
    commented_entries.created_at desc,
    commented_entries.entry_id,
    commented_entries.username
  limit p_limit
  offset p_offset;
end;
$$;

revoke all on function public.get_followed_title_activity(
  text, integer, integer, integer
) from public;
grant execute on function public.get_followed_title_activity(
  text, integer, integer, integer
) to authenticated;
