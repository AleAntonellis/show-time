-- ShowTime · storico visioni degli episodi
-- Esegui questo file nel SQL Editor del tuo progetto Supabase, DOPO 0002_episode_tracking.sql.
--
-- `episode_watches` continua a rappresentare il progresso (episodio spuntato).
-- `episode_viewings` conserva invece ogni singola visione con data, nota e voto.

create table if not exists public.episode_viewings (
  id               uuid primary key default gen_random_uuid(),
  library_item_id  uuid not null references public.library_items (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  season_number    integer not null,
  episode_number   integer not null,
  watched_on       date not null default current_date,
  note             text,
  rating           numeric(3, 1) check (rating >= 0 and rating <= 10),
  created_at       timestamptz not null default now()
);

create index if not exists episode_viewings_item_episode_idx
  on public.episode_viewings (library_item_id, season_number, episode_number);
create index if not exists episode_viewings_user_idx
  on public.episode_viewings (user_id);

alter table public.episode_viewings enable row level security;

create policy "episode_viewings: gestisci le proprie"
  on public.episode_viewings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
