-- ShowTime · visioni film importate prima dell'uso dell'app
-- Esegui questo file nel SQL Editor del tuo progetto Supabase, DOPO
-- 0006_watch_origins.sql.

alter table public.library_items
  add column if not exists imported_viewings smallint not null default 0;

alter table public.library_items
  drop constraint if exists library_items_imported_viewings_check;
alter table public.library_items
  add constraint library_items_imported_viewings_check
  check (imported_viewings >= 0);

-- I film già marcati come visti senza una visione esplicita vengono considerati
-- importati. Non viene inventata alcuna data.
update public.library_items li
set imported_viewings = 1
from public.titles t
where li.title_id = t.id
  and t.media_type = 'movie'
  and li.status = 'watched'
  and li.imported_viewings = 0
  and not exists (
    select 1
    from public.viewings v
    where v.library_item_id = li.id
  );
