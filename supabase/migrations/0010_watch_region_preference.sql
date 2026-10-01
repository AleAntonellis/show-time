-- ShowTime · paese personale per la disponibilità streaming
-- Esegui questo file nel SQL Editor del tuo progetto Supabase, DOPO
-- 0009_followed_title_activity.sql.

alter table public.profiles
  add column if not exists watch_region text;

update public.profiles
set watch_region = 'IT'
where watch_region is null;

alter table public.profiles
  alter column watch_region set default 'IT',
  alter column watch_region set not null;

alter table public.profiles
  drop constraint if exists profiles_watch_region_format;
alter table public.profiles
  add constraint profiles_watch_region_format
  check (watch_region ~ '^[A-Z]{2}$');

create or replace function public.get_watch_region()
returns text
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_region text;
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;

  select p.watch_region
  into v_region
  from public.profiles p
  where p.id = auth.uid();

  if v_region is null then
    raise exception 'Profilo non disponibile'
      using errcode = 'P0002';
  end if;

  return v_region;
end;
$$;

create or replace function public.set_watch_region(p_region text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_region text := upper(trim(p_region));
begin
  if auth.uid() is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;
  if v_region !~ '^[A-Z]{2}$' then
    raise exception 'Paese non valido'
      using errcode = '22023';
  end if;

  update public.profiles
  set watch_region = v_region
  where id = auth.uid();

  if not found then
    raise exception 'Profilo non disponibile'
      using errcode = 'P0002';
  end if;

  return v_region;
end;
$$;

revoke all on function public.get_watch_region() from public;
revoke all on function public.set_watch_region(text) from public;

grant execute on function public.get_watch_region() to authenticated;
grant execute on function public.set_watch_region(text) to authenticated;
