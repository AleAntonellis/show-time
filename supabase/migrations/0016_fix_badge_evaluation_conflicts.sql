-- ShowTime · fix idempotenza RPC badge
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0015_badge_foundations.sql.

create or replace function public.apply_badge_evaluation(
  p_user_id uuid,
  p_badge_id text,
  p_rule_version integer,
  p_progress integer,
  p_evidence jsonb,
  p_evaluated_at timestamptz,
  p_is_backfill boolean default false
)
returns table (
  badge_id text,
  badge_version integer,
  level smallint,
  level_key text,
  unlocked_at timestamptz
)
language plpgsql
security definer
volatile
set search_path = ''
as $$
declare
  v_max_progress integer;
  v_next_threshold integer;
  v_evidence jsonb := coalesce(p_evidence, '{}'::jsonb);
begin
  if p_user_id is null
    or p_badge_id is null
    or p_rule_version <= 0
    or p_progress < 0
    or p_evaluated_at is null
  then
    raise exception 'Valutazione badge non valida'
      using errcode = '22023';
  end if;
  if jsonb_typeof(v_evidence) <> 'object' then
    raise exception 'Evidence badge non valida'
      using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
  ) then
    raise exception 'Profilo non disponibile'
      using errcode = 'P0002';
  end if;
  if not exists (
    select 1
    from public.badge_definitions bd
    where bd.id = p_badge_id
      and bd.version = p_rule_version
      and bd.is_active
  ) then
    raise exception 'Definizione badge non disponibile'
      using errcode = 'P0002';
  end if;

  select greatest(coalesce(ubp.max_progress, 0), p_progress)
  into v_max_progress
  from (select 1) seed
  left join public.user_badge_progress ubp
    on ubp.user_id = p_user_id
    and ubp.badge_id = p_badge_id;

  select min(bl.threshold)
  into v_next_threshold
  from public.badge_levels bl
  where bl.badge_id = p_badge_id
    and bl.badge_version = p_rule_version
    and bl.threshold > v_max_progress;

  insert into public.user_badge_progress as current_progress (
    user_id,
    badge_id,
    rule_version,
    progress,
    max_progress,
    next_threshold,
    evaluated_at
  )
  values (
    p_user_id,
    p_badge_id,
    p_rule_version,
    p_progress,
    v_max_progress,
    v_next_threshold,
    p_evaluated_at
  )
  on conflict on constraint user_badge_progress_pkey do update
  set
    rule_version = excluded.rule_version,
    progress = case
      when excluded.evaluated_at >= current_progress.evaluated_at
        then excluded.progress
      else current_progress.progress
    end,
    max_progress = greatest(
      current_progress.max_progress,
      excluded.max_progress
    ),
    next_threshold = (
      select min(bl.threshold)
      from public.badge_levels bl
      where bl.badge_id = excluded.badge_id
        and bl.badge_version = excluded.rule_version
        and bl.threshold > greatest(
          current_progress.max_progress,
          excluded.max_progress
        )
    ),
    evaluated_at = greatest(
      current_progress.evaluated_at,
      excluded.evaluated_at
    );

  select ubp.max_progress
  into v_max_progress
  from public.user_badge_progress ubp
  where ubp.user_id = p_user_id
    and ubp.badge_id = p_badge_id;

  return query
  with inserted as (
    insert into public.user_badges (
      user_id,
      badge_id,
      badge_version,
      level,
      unlocked_at,
      progress_at_unlock,
      evidence,
      is_backfill
    )
    select
      p_user_id,
      bl.badge_id,
      bl.badge_version,
      bl.level,
      p_evaluated_at,
      v_max_progress,
      v_evidence || jsonb_build_object(
        'count', v_max_progress,
        'evaluatedAt', p_evaluated_at,
        'ruleVersion', p_rule_version
      ),
      p_is_backfill
    from public.badge_levels bl
    where bl.badge_id = p_badge_id
      and bl.badge_version = p_rule_version
      and bl.threshold <= v_max_progress
    on conflict on constraint user_badges_pkey do nothing
    returning
      user_badges.badge_id,
      user_badges.badge_version,
      user_badges.level,
      user_badges.unlocked_at
  )
  select
    inserted.badge_id,
    inserted.badge_version,
    inserted.level,
    bl.level_key,
    inserted.unlocked_at
  from inserted
  join public.badge_levels bl
    on bl.badge_id = inserted.badge_id
    and bl.badge_version = inserted.badge_version
    and bl.level = inserted.level
  order by inserted.level;
end;
$$;

revoke all on function public.apply_badge_evaluation(
  uuid, text, integer, integer, jsonb, timestamptz, boolean
) from public;
grant execute on function public.apply_badge_evaluation(
  uuid, text, integer, integer, jsonb, timestamptz, boolean
) to service_role;
