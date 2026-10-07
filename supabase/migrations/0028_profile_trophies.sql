-- ShowTime · trofei pubblici sul profilo
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0027_word_of_mouth_badge.sql.

create or replace function public.get_followed_profile_badges(
  p_username text
)
returns table (
  badge_id text,
  badge_name text,
  badge_description text,
  level smallint,
  level_key text,
  level_name text,
  unlocked_at timestamptz
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
  with ranked_badges as (
    select
      ub.badge_id,
      bd.name as badge_name,
      bd.description as badge_description,
      ub.level,
      bl.level_key,
      bl.name as level_name,
      ub.unlocked_at,
      row_number() over (
        partition by ub.badge_id
        order by
          ub.level desc,
          ub.badge_version desc,
          ub.unlocked_at asc
      ) as badge_rank
    from public.user_badges ub
    join public.badge_definitions bd
      on bd.id = ub.badge_id
      and bd.version = ub.badge_version
      and bd.is_active
    join public.badge_levels bl
      on bl.badge_id = ub.badge_id
      and bl.badge_version = ub.badge_version
      and bl.level = ub.level
    where ub.user_id = v_profile_id
  )
  select
    rb.badge_id,
    rb.badge_name,
    rb.badge_description,
    rb.level,
    rb.level_key,
    rb.level_name,
    rb.unlocked_at
  from ranked_badges rb
  where rb.badge_rank = 1
  order by rb.badge_id;
end;
$$;

revoke all on function public.get_followed_profile_badges(text)
  from public;
grant execute on function public.get_followed_profile_badges(text)
  to authenticated;
