-- ShowTime · badge Encore
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0024_marathon_badge.sql.

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
  'encore',
  1,
  'viewing',
  'Encore',
  'Rivedi film e serie già completati.',
  'encore',
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
    'encore',
    1,
    1,
    'bronze',
    'Bronzo',
    'Rivedi 5 titoli diversi.',
    5,
    'encore-bronze'
  ),
  (
    'encore',
    1,
    2,
    'silver',
    'Argento',
    'Rivedi 25 titoli diversi.',
    25,
    'encore-silver'
  ),
  (
    'encore',
    1,
    3,
    'gold',
    'Oro',
    'Rivedi 100 titoli diversi.',
    100,
    'encore-gold'
  ),
  (
    'encore',
    1,
    4,
    'platinum',
    'Platino',
    'Rivedi 250 titoli diversi.',
    250,
    'encore-platinum'
  )
on conflict (badge_id, badge_version, level) do update
set
  level_key = excluded.level_key,
  name = excluded.name,
  description = excluded.description,
  threshold = excluded.threshold,
  icon_key = excluded.icon_key;
