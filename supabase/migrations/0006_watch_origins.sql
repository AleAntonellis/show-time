-- ShowTime · distinzione tra attività registrata e storico importato
-- Esegui questo file nel SQL Editor del tuo progetto Supabase, DOPO
-- 0005_share_invites.sql.

alter table public.episode_watches
  add column if not exists source text not null default 'tracked';

alter table public.episode_watches
  drop constraint if exists episode_watches_source_check;
alter table public.episode_watches
  add constraint episode_watches_source_check
  check (source in ('tracked', 'imported'));

alter table public.episode_watches
  drop constraint if exists episode_watches_date_by_source;

-- Compatibilità con client precedenti: manteniamo la data tecnica obbligatoria.
-- La nuova dashboard ignora `watched_on` quando source = 'imported'.
update public.episode_watches
set watched_on = current_date
where watched_on is null;

alter table public.episode_watches
  alter column watched_on set default current_date;
alter table public.episode_watches
  alter column watched_on set not null;

create index if not exists episode_watches_item_source_idx
  on public.episode_watches (library_item_id, source);
