-- ShowTime · schema iniziale
-- Esegui questo file nel SQL Editor del tuo progetto Supabase.
--
-- Modello:
--   profiles       → utenti (estende auth.users)
--   titles         → cache condivisa dei metadati TMDB
--   library_items  → titolo salvato da un utente, con stato/priorita'/rating
--   viewings       → una riga per visione, con nota e voto propri
--
-- Sicurezza: RLS attiva ovunque. Ogni utente vede/modifica solo i propri dati.
-- La tabella `titles` e' una cache condivisa fra gli utenti autenticati.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: leggi il proprio profilo"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles: crea il proprio profilo"
  on public.profiles for insert
  with check (id = auth.uid());

create policy "profiles: aggiorna il proprio profilo"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Crea automaticamente un profilo quando nasce un nuovo utente auth.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- titles (cache condivisa TMDB)
-- ---------------------------------------------------------------------------
create table if not exists public.titles (
  id          uuid primary key default gen_random_uuid(),
  tmdb_id     integer not null,
  media_type  text    not null check (media_type in ('movie', 'tv')),
  title       text    not null,
  year        text,
  poster_path text,
  overview    text,
  runtime     integer,        -- minuti (film) o durata media episodio (serie)
  genres      text[]  not null default '{}',
  created_at  timestamptz not null default now(),
  unique (tmdb_id, media_type)
);

alter table public.titles enable row level security;

create policy "titles: lettura per autenticati"
  on public.titles for select
  to authenticated
  using (true);

create policy "titles: inserimento per autenticati"
  on public.titles for insert
  to authenticated
  with check (true);

create policy "titles: aggiornamento per autenticati"
  on public.titles for update
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- library_items (titolo salvato da un utente)
-- ---------------------------------------------------------------------------
create table if not exists public.library_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  title_id   uuid not null references public.titles (id) on delete cascade,
  status     text not null default 'to_watch' check (status in ('to_watch', 'watching', 'watched')),
  priority   smallint not null default 0,
  rating     numeric(3, 1) check (rating >= 0 and rating <= 10),
  notes      text,
  added_at   timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, title_id)
);

create index if not exists library_items_user_status_idx
  on public.library_items (user_id, status);

alter table public.library_items enable row level security;

create policy "library_items: gestisci i propri"
  on public.library_items for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- viewings (una riga per visione, con nota e voto propri)
-- ---------------------------------------------------------------------------
create table if not exists public.viewings (
  id               uuid primary key default gen_random_uuid(),
  library_item_id  uuid not null references public.library_items (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  watched_on       date not null default current_date,
  note             text,
  rating           numeric(3, 1) check (rating >= 0 and rating <= 10),
  created_at       timestamptz not null default now()
);

create index if not exists viewings_user_idx on public.viewings (user_id);
create index if not exists viewings_item_idx on public.viewings (library_item_id);

alter table public.viewings enable row level security;

create policy "viewings: gestisci le proprie"
  on public.viewings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- updated_at automatico su library_items
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists library_items_touch on public.library_items;
create trigger library_items_touch
  before update on public.library_items
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- RPC: salva un titolo nella libreria in modo atomico
-- Fa upsert del titolo (cache) e crea/aggiorna la voce di libreria dell'utente.
-- ---------------------------------------------------------------------------
create or replace function public.add_to_library(
  p_tmdb_id     integer,
  p_media_type  text,
  p_title       text,
  p_year        text,
  p_poster_path text,
  p_overview    text,
  p_status      text default 'to_watch'
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
  insert into public.titles (tmdb_id, media_type, title, year, poster_path, overview)
  values (p_tmdb_id, p_media_type, p_title, p_year, p_poster_path, p_overview)
  on conflict (tmdb_id, media_type)
  do update set title = excluded.title,
                year = excluded.year,
                poster_path = excluded.poster_path,
                overview = excluded.overview
  returning id into v_title_id;

  insert into public.library_items (user_id, title_id, status)
  values (auth.uid(), v_title_id, p_status)
  on conflict (user_id, title_id)
  do update set status = excluded.status
  returning * into v_item;

  return v_item;
end;
$$;
