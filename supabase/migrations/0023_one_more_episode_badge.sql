-- ShowTime · badge Ancora un episodio
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0022_genre_explorer_badge.sql.

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
  'one_more_episode',
  1,
  'viewing',
  'Ancora un episodio',
  'Completa più episodi della stessa serie nello stesso giorno.',
  'one-more-episode',
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
    'one_more_episode',
    1,
    1,
    'bronze',
    'Bronzo',
    'Completa 3 episodi della stessa serie in un giorno.',
    3,
    'one-more-episode-bronze'
  ),
  (
    'one_more_episode',
    1,
    2,
    'silver',
    'Argento',
    'Completa 5 episodi della stessa serie in un giorno.',
    5,
    'one-more-episode-silver'
  ),
  (
    'one_more_episode',
    1,
    3,
    'gold',
    'Oro',
    'Completa 8 episodi della stessa serie in un giorno.',
    8,
    'one-more-episode-gold'
  ),
  (
    'one_more_episode',
    1,
    4,
    'platinum',
    'Platino',
    'Completa 12 episodi della stessa serie in un giorno.',
    12,
    'one-more-episode-platinum'
  )
on conflict (badge_id, badge_version, level) do update
set
  level_key = excluded.level_key,
  name = excluded.name,
  description = excluded.description,
  threshold = excluded.threshold,
  icon_key = excluded.icon_key;
