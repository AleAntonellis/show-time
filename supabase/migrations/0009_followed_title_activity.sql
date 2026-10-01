-- ShowTime · attività dei profili seguiti nella scheda titolo
-- Esegui questo file nel SQL Editor del tuo progetto Supabase, DOPO
-- 0008_follower_profiles.sql.

drop function if exists public.get_followed_title_activity(
  text, integer, integer, integer
);
create function public.get_followed_title_activity(
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

revoke all on function public.get_followed_title_activity(
  text, integer, integer, integer
) from public;
grant execute on function public.get_followed_title_activity(
  text, integer, integer, integer
) to authenticated;
