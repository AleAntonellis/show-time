-- ShowTime · badge Esploratore di generi e cache generi TMDB protetta
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0021_serialist_badge.sql.

create table if not exists public.badge_title_genres (
  title_id         uuid primary key
    references public.titles (id) on delete cascade,
  tmdb_genre_ids   jsonb not null,
  refreshed_at     timestamptz not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint badge_title_genres_ids_array
    check (jsonb_typeof(tmdb_genre_ids) = 'array')
);

drop trigger if exists badge_title_genres_touch
  on public.badge_title_genres;
create trigger badge_title_genres_touch
  before update on public.badge_title_genres
  for each row execute function public.touch_updated_at();

create index if not exists badge_title_genres_refreshed_idx
  on public.badge_title_genres (refreshed_at);

alter table public.badge_title_genres enable row level security;

revoke all on table public.badge_title_genres from public;
revoke all on table public.badge_title_genres from anon;
revoke all on table public.badge_title_genres from authenticated;
grant select, insert, update, delete
  on table public.badge_title_genres
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
  'genre_explorer',
  1,
  'exploration',
  'Esploratore di generi',
  'Completa titoli appartenenti a generi sempre diversi.',
  'genre-explorer',
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
    'genre_explorer',
    1,
    1,
    'bronze',
    'Bronzo',
    'Completa titoli in 5 generi differenti.',
    5,
    'genre-explorer-bronze'
  ),
  (
    'genre_explorer',
    1,
    2,
    'silver',
    'Argento',
    'Completa titoli in 8 generi differenti.',
    8,
    'genre-explorer-silver'
  ),
  (
    'genre_explorer',
    1,
    3,
    'gold',
    'Oro',
    'Completa titoli in 12 generi differenti.',
    12,
    'genre-explorer-gold'
  ),
  (
    'genre_explorer',
    1,
    4,
    'platinum',
    'Platino',
    'Completa titoli in tutti i 15 generi.',
    15,
    'genre-explorer-platinum'
  )
on conflict (badge_id, badge_version, level) do update
set
  level_key = excluded.level_key,
  name = excluded.name,
  description = excluded.description,
  threshold = excluded.threshold,
  icon_key = excluded.icon_key;
