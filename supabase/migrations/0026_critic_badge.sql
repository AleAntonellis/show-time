-- ShowTime · badge Critico
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0025_encore_badge.sql.

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
  'critic',
  1,
  'diary',
  'Critico',
  'Scrivi note sulle tue visioni nel Diario.',
  'critic',
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
    'critic',
    1,
    1,
    'bronze',
    'Bronzo',
    'Scrivi 50 note nel Diario.',
    50,
    'critic-bronze'
  ),
  (
    'critic',
    1,
    2,
    'silver',
    'Argento',
    'Scrivi 150 note nel Diario.',
    150,
    'critic-silver'
  ),
  (
    'critic',
    1,
    3,
    'gold',
    'Oro',
    'Scrivi 250 note nel Diario.',
    250,
    'critic-gold'
  ),
  (
    'critic',
    1,
    4,
    'platinum',
    'Platino',
    'Scrivi 500 note nel Diario.',
    500,
    'critic-platinum'
  )
on conflict (badge_id, badge_version, level) do update
set
  level_key = excluded.level_key,
  name = excluded.name,
  description = excluded.description,
  threshold = excluded.threshold,
  icon_key = excluded.icon_key;
