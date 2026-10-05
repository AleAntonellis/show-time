-- ShowTime · badge introduttivi
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0016_fix_badge_evaluation_conflicts.sql.
--
-- I badge introduttivi sono traguardi singoli in UI. Lo schema condiviso li
-- rappresenta con un unico livello tecnico a soglia 1.

insert into public.badge_definitions (
  id,
  version,
  category,
  name,
  description,
  icon_key,
  is_active
)
values
  (
    'first_watch',
    1,
    'viewing',
    'Primo ciak',
    'Registra la tua prima visione reale in ShowTime.',
    'first-watch',
    true
  ),
  (
    'first_review',
    1,
    'diary',
    'Prima recensione',
    'Scrivi la tua prima nota testuale nel Diario.',
    'first-review',
    true
  ),
  (
    'season_complete',
    1,
    'viewing',
    'Stagione chiusa',
    'Completa tutti gli episodi di una stagione, esclusi gli Speciali.',
    'season-complete',
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
    'first_watch',
    1,
    1,
    'bronze',
    'Primo ciak',
    'Registra una visione reale. Lo storico importato non conta.',
    1,
    'first-watch'
  ),
  (
    'first_review',
    1,
    1,
    'bronze',
    'Prima recensione',
    'Aggiungi una nota testuale a una visione.',
    1,
    'first-review'
  ),
  (
    'season_complete',
    1,
    1,
    'bronze',
    'Stagione chiusa',
    'Completa una stagione con almeno un episodio.',
    1,
    'season-complete'
  )
on conflict (badge_id, badge_version, level) do update
set
  level_key = excluded.level_key,
  name = excluded.name,
  description = excluded.description,
  threshold = excluded.threshold,
  icon_key = excluded.icon_key;
