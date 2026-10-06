-- ShowTime · badge Nostalgico
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0019_archivist_badge.sql.

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
  'nostalgic',
  1,
  'exploration',
  'Nostalgico',
  'Riscopri film e serie usciti prima del 1990.',
  'nostalgic',
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
    'nostalgic',
    1,
    1,
    'bronze',
    'Bronzo',
    'Completa 50 titoli usciti prima del 1990.',
    50,
    'nostalgic-bronze'
  ),
  (
    'nostalgic',
    1,
    2,
    'silver',
    'Argento',
    'Completa 150 titoli usciti prima del 1990.',
    150,
    'nostalgic-silver'
  ),
  (
    'nostalgic',
    1,
    3,
    'gold',
    'Oro',
    'Completa 250 titoli usciti prima del 1990.',
    250,
    'nostalgic-gold'
  ),
  (
    'nostalgic',
    1,
    4,
    'platinum',
    'Platino',
    'Completa 500 titoli usciti prima del 1990.',
    500,
    'nostalgic-platinum'
  )
on conflict (badge_id, badge_version, level) do update
set
  level_key = excluded.level_key,
  name = excluded.name,
  description = excluded.description,
  threshold = excluded.threshold,
  icon_key = excluded.icon_key;
