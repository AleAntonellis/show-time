-- ShowTime · badge Passaparola
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0026_critic_badge.sql.

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
  'word_of_mouth',
  1,
  'social',
  'Passaparola',
  'Condividi titoli che vengono letti dai tuoi contatti.',
  'word-of-mouth',
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
    'word_of_mouth',
    1,
    1,
    'bronze',
    'Bronzo',
    'Fai leggere 25 titoli condivisi.',
    25,
    'word-of-mouth-bronze'
  ),
  (
    'word_of_mouth',
    1,
    2,
    'silver',
    'Argento',
    'Fai leggere 100 titoli condivisi.',
    100,
    'word-of-mouth-silver'
  ),
  (
    'word_of_mouth',
    1,
    3,
    'gold',
    'Oro',
    'Fai leggere 250 titoli condivisi.',
    250,
    'word-of-mouth-gold'
  ),
  (
    'word_of_mouth',
    1,
    4,
    'platinum',
    'Platino',
    'Fai leggere 500 titoli condivisi.',
    500,
    'word-of-mouth-platinum'
  )
on conflict (badge_id, badge_version, level) do update
set
  level_key = excluded.level_key,
  name = excluded.name,
  description = excluded.description,
  threshold = excluded.threshold,
  icon_key = excluded.icon_key;
