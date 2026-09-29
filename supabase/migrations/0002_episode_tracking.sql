-- ShowTime · tracking per episodio (serie TV)
-- Esegui questo file nel SQL Editor del tuo progetto Supabase, DOPO 0001_init.sql.
--
-- Aggiunge:
--   titles.total_episodes  → numero totale episodi (per la barra di progresso)
--   episode_watches        → episodi visti da un utente per una serie
--   add_to_library(...)    → aggiornata per salvare total_episodes

-- ---------------------------------------------------------------------------
-- Numero totale episodi sui titoli (serie TV)
-- ---------------------------------------------------------------------------
alter table public.titles
  add column if not exists total_episodes integer;

-- ---------------------------------------------------------------------------
-- episode_watches (un episodio visto = una riga)
-- ---------------------------------------------------------------------------
create table if not exists public.episode_watches (
  id               uuid primary key default gen_random_uuid(),
  library_item_id  uuid not null references public.library_items (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  season_number    integer not null,
  episode_number   integer not null,
  watched_on       date not null default current_date,
  created_at       timestamptz not null default now(),
  unique (library_item_id, season_number, episode_number)
);

create index if not exists episode_watches_item_idx
  on public.episode_watches (library_item_id);
create index if not exists episode_watches_user_idx
  on public.episode_watches (user_id);

alter table public.episode_watches enable row level security;

create policy "episode_watches: gestisci i propri"
  on public.episode_watches for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- add_to_library aggiornata: salva anche total_episodes
-- ---------------------------------------------------------------------------
create or replace function public.add_to_library(
  p_tmdb_id        integer,
  p_media_type     text,
  p_title          text,
  p_year           text,
  p_poster_path    text,
  p_overview       text,
  p_status         text default 'to_watch',
  p_total_episodes integer default null
)
returns public.library_items
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_title_id uuid;
  v_item     public.library_items;
begin
  insert into public.titles (tmdb_id, media_type, title, year, poster_path, overview, total_episodes)
  values (p_tmdb_id, p_media_type, p_title, p_year, p_poster_path, p_overview, p_total_episodes)
  on conflict (tmdb_id, media_type)
  do update set title = excluded.title,
                year = excluded.year,
                poster_path = excluded.poster_path,
                overview = excluded.overview,
                total_episodes = coalesce(excluded.total_episodes, public.titles.total_episodes)
  returning id into v_title_id;

  insert into public.library_items (user_id, title_id, status)
  values (auth.uid(), v_title_id, p_status)
  on conflict (user_id, title_id)
  do update set status = excluded.status
  returning * into v_item;

  return v_item;
end;
$$;
