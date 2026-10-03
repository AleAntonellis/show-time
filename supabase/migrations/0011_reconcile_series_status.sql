-- ShowTime · riallineamento stato serie con il progresso episodi
-- Esegui questo file nel SQL Editor del tuo progetto Supabase, DOPO
-- 0010_watch_region_preference.sql.

-- Le vecchie versioni permettevano di salvare uno stato serie senza materializzare
-- il progresso episodio per episodio. Lo stato operativo viene ora derivato soltanto
-- dalle spunte reali:
--   0 episodi                         -> Da vedere
--   almeno 1 ma meno del totale       -> In corso
--   tutti gli episodi                 -> Visto
update public.library_items li
set status = case
  when not exists (
    select 1
    from public.episode_watches ew
    where ew.library_item_id = li.id
  ) then 'to_watch'
  when t.total_episodes is not null
    and (
      select count(*)
      from public.episode_watches ew
      where ew.library_item_id = li.id
    ) >= t.total_episodes
    then 'watched'
  else 'watching'
end
from public.titles t
where t.id = li.title_id
  and t.media_type = 'tv';
