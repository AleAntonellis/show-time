-- ShowTime · badge Maratoneta
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0023_one_more_episode_badge.sql.

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
  'marathon',
  1,
  'viewing',
  'Maratoneta',
  'Completa stagioni di almeno 8 episodi in uno o due giorni consecutivi.',
  'marathon',
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
    'marathon',
    1,
    1,
    'bronze',
    'Bronzo',
    'Completa 1 stagione in maratona.',
    1,
    'marathon-bronze'
  ),
  (
    'marathon',
    1,
    2,
    'silver',
    'Argento',
    'Completa 5 stagioni in maratona.',
    5,
    'marathon-silver'
  ),
  (
    'marathon',
    1,
    3,
    'gold',
    'Oro',
    'Completa 15 stagioni in maratona.',
    15,
    'marathon-gold'
  ),
  (
    'marathon',
    1,
    4,
    'platinum',
    'Platino',
    'Completa 30 stagioni in maratona.',
    30,
    'marathon-platinum'
  )
on conflict (badge_id, badge_version, level) do update
set
  level_key = excluded.level_key,
  name = excluded.name,
  description = excluded.description,
  threshold = excluded.threshold,
  icon_key = excluded.icon_key;
