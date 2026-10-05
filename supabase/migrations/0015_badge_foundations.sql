-- ShowTime · fondazioni del sistema badge
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0014_followed_commented_activity.sql.

create table if not exists public.badge_definitions (
  id           text not null,
  version      integer not null,
  category     text not null,
  name         text not null,
  description  text not null,
  icon_key     text not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  primary key (id, version),
  constraint badge_definitions_id_format
    check (id ~ '^[a-z][a-z0-9_]*$'),
  constraint badge_definitions_version_positive
    check (version > 0),
  constraint badge_definitions_category_valid
    check (
      category in (
        'catalog',
        'viewing',
        'diary',
        'social',
        'people',
        'exploration'
      )
    ),
  constraint badge_definitions_name_present
    check (nullif(trim(name), '') is not null),
  constraint badge_definitions_description_present
    check (nullif(trim(description), '') is not null),
  constraint badge_definitions_icon_present
    check (nullif(trim(icon_key), '') is not null)
);

create table if not exists public.badge_levels (
  badge_id          text not null,
  badge_version     integer not null,
  level             smallint not null,
  level_key         text not null,
  name              text not null,
  description       text not null,
  threshold         integer not null,
  icon_key          text not null,
  primary key (badge_id, badge_version, level),
  unique (badge_id, badge_version, level_key),
  foreign key (badge_id, badge_version)
    references public.badge_definitions (id, version)
    on update cascade
    on delete cascade,
  constraint badge_levels_level_valid
    check (level between 1 and 4),
  constraint badge_levels_key_valid
    check (level_key in ('bronze', 'silver', 'gold', 'platinum')),
  constraint badge_levels_threshold_positive
    check (threshold > 0),
  constraint badge_levels_name_present
    check (nullif(trim(name), '') is not null),
  constraint badge_levels_description_present
    check (nullif(trim(description), '') is not null),
  constraint badge_levels_icon_present
    check (nullif(trim(icon_key), '') is not null)
);

create table if not exists public.user_badges (
  user_id             uuid not null
    references public.profiles (id) on delete cascade,
  badge_id            text not null,
  badge_version       integer not null,
  level                smallint not null,
  unlocked_at         timestamptz not null default now(),
  progress_at_unlock  integer not null,
  evidence            jsonb not null default '{}'::jsonb,
  is_backfill         boolean not null default false,
  seen_at              timestamptz,
  primary key (user_id, badge_id, badge_version, level),
  foreign key (badge_id, badge_version, level)
    references public.badge_levels (badge_id, badge_version, level)
    on update cascade
    on delete restrict,
  constraint user_badges_progress_nonnegative
    check (progress_at_unlock >= 0),
  constraint user_badges_evidence_object
    check (jsonb_typeof(evidence) = 'object')
);

create index if not exists user_badges_unseen_idx
  on public.user_badges (user_id, unlocked_at desc)
  where seen_at is null;

create table if not exists public.user_badge_progress (
  user_id         uuid not null
    references public.profiles (id) on delete cascade,
  badge_id        text not null,
  rule_version    integer not null,
  progress        integer not null default 0,
  max_progress    integer not null default 0,
  next_threshold  integer,
  evaluated_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (user_id, badge_id),
  foreign key (badge_id, rule_version)
    references public.badge_definitions (id, version)
    on update cascade
    on delete restrict,
  constraint user_badge_progress_current_nonnegative
    check (progress >= 0),
  constraint user_badge_progress_max_nonnegative
    check (max_progress >= 0),
  constraint user_badge_progress_max_not_lower
    check (max_progress >= progress),
  constraint user_badge_progress_next_positive
    check (next_threshold is null or next_threshold > 0)
);

drop trigger if exists user_badge_progress_touch
  on public.user_badge_progress;
create trigger user_badge_progress_touch
  before update on public.user_badge_progress
  for each row execute function public.touch_updated_at();

alter table public.badge_definitions enable row level security;
alter table public.badge_levels enable row level security;
alter table public.user_badges enable row level security;
alter table public.user_badge_progress enable row level security;

drop policy if exists "badge_definitions: lettura autenticati"
  on public.badge_definitions;
create policy "badge_definitions: lettura autenticati"
on public.badge_definitions for select
to authenticated
using (true);

drop policy if exists "badge_levels: lettura autenticati"
  on public.badge_levels;
create policy "badge_levels: lettura autenticati"
on public.badge_levels for select
to authenticated
using (true);

drop policy if exists "user_badges: lettura propri"
  on public.user_badges;
create policy "user_badges: lettura propri"
on public.user_badges for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "user_badge_progress: lettura propri"
  on public.user_badge_progress;
create policy "user_badge_progress: lettura propri"
on public.user_badge_progress for select
to authenticated
using (user_id = auth.uid());

insert into public.badge_definitions (
  id,
  version,
  category,
  name,
  description,
  icon_key,
  is_active
)
values (
  'cinephile',
  1,
  'catalog',
  'Cinefilo',
  'Completa film e fai crescere la tua passione per il cinema.',
  'cinephile',
  true
)
on conflict (id, version) do update
set
  category = excluded.category,
  name = excluded.name,
  description = excluded.description,
  icon_key = excluded.icon_key,
  is_active = excluded.is_active;

insert into public.badge_levels (
  badge_id,
  badge_version,
  level,
  level_key,
  name,
  description,
  threshold,
  icon_key
)
values
  (
    'cinephile',
    1,
    1,
    'bronze',
    'Bronzo',
    'Completa 50 film.',
    50,
    'cinephile-bronze'
  ),
  (
    'cinephile',
    1,
    2,
    'silver',
    'Argento',
    'Completa 250 film.',
    250,
    'cinephile-silver'
  ),
  (
    'cinephile',
    1,
    3,
    'gold',
    'Oro',
    'Completa 500 film.',
    500,
    'cinephile-gold'
  ),
  (
    'cinephile',
    1,
    4,
    'platinum',
    'Platino',
    'Completa 1.500 film.',
    1500,
    'cinephile-platinum'
  )
on conflict (badge_id, badge_version, level) do update
set
  level_key = excluded.level_key,
  name = excluded.name,
  description = excluded.description,
  threshold = excluded.threshold,
  icon_key = excluded.icon_key;

drop function if exists public.get_my_badge_catalog();
create function public.get_my_badge_catalog()
returns table (
  badge_id text,
  badge_version integer,
  category text,
  badge_name text,
  badge_description text,
  badge_icon_key text,
  is_active boolean,
  level smallint,
  level_key text,
  level_name text,
  level_description text,
  threshold integer,
  level_icon_key text,
  unlocked_at timestamptz,
  progress_at_unlock integer,
  seen_at timestamptz,
  current_progress integer,
  max_progress integer,
  next_threshold integer,
  evaluated_at timestamptz
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;

  return query
  select
    bd.id,
    bd.version,
    bd.category,
    bd.name,
    bd.description,
    bd.icon_key,
    bd.is_active,
    bl.level,
    bl.level_key,
    bl.name,
    bl.description,
    bl.threshold,
    bl.icon_key,
    ub.unlocked_at,
    ub.progress_at_unlock,
    ub.seen_at,
    ubp.progress,
    ubp.max_progress,
    ubp.next_threshold,
    ubp.evaluated_at
  from public.badge_definitions bd
  join public.badge_levels bl
    on bl.badge_id = bd.id
    and bl.badge_version = bd.version
  left join public.user_badges ub
    on ub.user_id = v_user_id
    and ub.badge_id = bl.badge_id
    and ub.badge_version = bl.badge_version
    and ub.level = bl.level
  left join public.user_badge_progress ubp
    on ubp.user_id = v_user_id
    and ubp.badge_id = bd.id
    and ubp.rule_version = bd.version
  order by bd.category, bd.id, bd.version desc, bl.level;
end;
$$;

drop function if exists public.get_my_unseen_badge_count();
create function public.get_my_unseen_badge_count()
returns bigint
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_count bigint;
begin
  if v_user_id is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;

  select count(*)
  into v_count
  from public.user_badges ub
  where ub.user_id = v_user_id
    and ub.seen_at is null;

  return v_count;
end;
$$;

drop function if exists public.mark_my_badges_seen();
create function public.mark_my_badges_seen()
returns integer
language plpgsql
security definer
volatile
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_updated integer;
begin
  if v_user_id is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;

  update public.user_badges ub
  set seen_at = now()
  where ub.user_id = v_user_id
    and ub.seen_at is null;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

drop function if exists public.apply_badge_evaluation(
  uuid, text, integer, integer, jsonb, timestamptz, boolean
);
create function public.apply_badge_evaluation(
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

revoke all on table public.badge_definitions from public;
revoke all on table public.badge_levels from public;
revoke all on table public.user_badges from public;
revoke all on table public.user_badge_progress from public;

grant select on table public.badge_definitions to authenticated;
grant select on table public.badge_levels to authenticated;
grant select on table public.user_badges to authenticated;
grant select on table public.user_badge_progress to authenticated;

revoke all on function public.get_my_badge_catalog() from public;
revoke all on function public.get_my_unseen_badge_count() from public;
revoke all on function public.mark_my_badges_seen() from public;
revoke all on function public.apply_badge_evaluation(
  uuid, text, integer, integer, jsonb, timestamptz, boolean
) from public;

grant execute on function public.get_my_badge_catalog() to authenticated;
grant execute on function public.get_my_unseen_badge_count() to authenticated;
grant execute on function public.mark_my_badges_seen() to authenticated;
grant execute on function public.apply_badge_evaluation(
  uuid, text, integer, integer, jsonb, timestamptz, boolean
) to service_role;
