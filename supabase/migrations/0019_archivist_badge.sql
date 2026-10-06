-- ShowTime · badge Archivista
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0018_merge_same_day_movie_viewings.sql.

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
  'archivist',
  1,
  'catalog',
  'Archivista',
  'Costruisci una Libreria sempre più ampia, tra film e serie.',
  'archivist',
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
    'archivist',
    1,
    1,
    'bronze',
    'Bronzo',
    'Aggiungi 500 titoli alla Libreria.',
    500,
    'archivist-bronze'
  ),
  (
    'archivist',
    1,
    2,
    'silver',
    'Argento',
    'Aggiungi 1.500 titoli alla Libreria.',
    1500,
    'archivist-silver'
  ),
  (
    'archivist',
    1,
    3,
    'gold',
    'Oro',
    'Aggiungi 2.500 titoli alla Libreria.',
    2500,
    'archivist-gold'
  ),
  (
    'archivist',
    1,
    4,
    'platinum',
    'Platino',
    'Aggiungi 5.000 titoli alla Libreria.',
    5000,
    'archivist-platinum'
  )
on conflict (badge_id, badge_version, level) do update
set
  level_key = excluded.level_key,
  name = excluded.name,
  description = excluded.description,
  threshold = excluded.threshold,
  icon_key = excluded.icon_key;
