-- ShowTime · badge Serialista e cache TMDB protetta
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0020_nostalgic_badge.sql.

create table if not exists public.badge_title_metadata (
  title_id               uuid primary key
    references public.titles (id) on delete cascade,
  tmdb_status            text not null,
  regular_episodes       integer not null,
  regular_season_counts  jsonb not null,
  refreshed_at           timestamptz not null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint badge_title_metadata_status_present
    check (nullif(trim(tmdb_status), '') is not null),
  constraint badge_title_metadata_episodes_nonnegative
    check (regular_episodes >= 0),
  constraint badge_title_metadata_seasons_array
    check (jsonb_typeof(regular_season_counts) = 'array')
);

drop trigger if exists badge_title_metadata_touch
  on public.badge_title_metadata;
create trigger badge_title_metadata_touch
  before update on public.badge_title_metadata
  for each row execute function public.touch_updated_at();

create index if not exists badge_title_metadata_refreshed_idx
  on public.badge_title_metadata (refreshed_at);

alter table public.badge_title_metadata enable row level security;

revoke all on table public.badge_title_metadata from public;
revoke all on table public.badge_title_metadata from anon;
revoke all on table public.badge_title_metadata from authenticated;
grant select, insert, update, delete
  on table public.badge_title_metadata
  to service_role;

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
  'serialist',
  1,
  'catalog',
  'Serialista',
  'Completa serie concluse e tutti i loro episodi regolari.',
  'serialist',
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
    'serialist',
    1,
    1,
    'bronze',
    'Bronzo',
    'Completa 25 serie concluse.',
    25,
    'serialist-bronze'
  ),
  (
    'serialist',
    1,
    2,
    'silver',
    'Argento',
    'Completa 100 serie concluse.',
    100,
    'serialist-silver'
  ),
  (
    'serialist',
    1,
    3,
    'gold',
    'Oro',
    'Completa 250 serie concluse.',
    250,
    'serialist-gold'
  ),
  (
    'serialist',
    1,
    4,
    'platinum',
    'Platino',
    'Completa 500 serie concluse.',
    500,
    'serialist-platinum'
  )
on conflict (badge_id, badge_version, level) do update
set
  level_key = excluded.level_key,
  name = excluded.name,
  description = excluded.description,
  threshold = excluded.threshold,
  icon_key = excluded.icon_key;
