-- ShowTime · registrazione film atomica e pulizia placeholder duplicati
-- Esegui questo file nel SQL Editor del progetto Supabase DOPO
-- 0017_introductory_badges.sql.

drop function if exists public.record_movie_viewing(
  uuid,
  date,
  text,
  numeric
);
create function public.record_movie_viewing(
  p_library_item_id uuid,
  p_watched_on date,
  p_note text,
  p_rating numeric
)
returns table (
  id uuid,
  watched_on date,
  note text,
  rating numeric,
  created_at timestamptz
)
language plpgsql
security invoker
volatile
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_note text := nullif(trim(p_note), '');
  v_placeholder_id uuid;
  v_viewing public.viewings%rowtype;
begin
  if v_user_id is null then
    raise exception 'Autenticazione richiesta'
      using errcode = '42501';
  end if;
  if p_library_item_id is null or p_watched_on is null then
    raise exception 'Dati visione non validi'
      using errcode = '22023';
  end if;
  if v_note is not null and char_length(v_note) > 1000 then
    raise exception 'La nota può contenere al massimo 1000 caratteri'
      using errcode = '22023';
  end if;
  if p_rating is not null and (p_rating < 0 or p_rating > 10) then
    raise exception 'Il voto deve essere compreso tra 0 e 10'
      using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.library_items li
    join public.titles t on t.id = li.title_id
    where li.id = p_library_item_id
      and li.user_id = v_user_id
      and t.media_type = 'movie'
  ) then
    raise exception 'Film non disponibile'
      using errcode = '42501';
  end if;

  if v_note is not null or p_rating is not null then
    select v.id
    into v_placeholder_id
    from public.viewings v
    where v.library_item_id = p_library_item_id
      and v.user_id = v_user_id
      and v.watched_on = p_watched_on
      and nullif(trim(v.note), '') is null
      and v.rating is null
    order by v.created_at, v.id
    limit 1
    for update;
  end if;

  if v_placeholder_id is not null then
    update public.viewings v
    set
      note = v_note,
      rating = p_rating
    where v.id = v_placeholder_id
    returning v.* into v_viewing;
  else
    insert into public.viewings (
      library_item_id,
      user_id,
      watched_on,
      note,
      rating
    )
    values (
      p_library_item_id,
      v_user_id,
      p_watched_on,
      v_note,
      p_rating
    )
    returning * into v_viewing;
  end if;

  update public.library_items li
  set status = 'watched'
  where li.id = p_library_item_id
    and li.user_id = v_user_id;

  return query
  select
    v_viewing.id,
    v_viewing.watched_on,
    v_viewing.note,
    v_viewing.rating,
    v_viewing.created_at;
end;
$$;

revoke all on function public.record_movie_viewing(
  uuid,
  date,
  text,
  numeric
) from public;
grant execute on function public.record_movie_viewing(
  uuid,
  date,
  text,
  numeric
) to authenticated;

-- Elimina soltanto la spunta vuota creata prima di una successiva voce
-- dettagliata dello stesso film e giorno. I rewatch dettagliati restano distinti.
delete from public.viewings placeholder
where nullif(trim(placeholder.note), '') is null
  and placeholder.rating is null
  and exists (
    select 1
    from public.viewings detailed
    where detailed.user_id = placeholder.user_id
      and detailed.library_item_id = placeholder.library_item_id
      and detailed.watched_on = placeholder.watched_on
      and detailed.id <> placeholder.id
      and (
        nullif(trim(detailed.note), '') is not null
        or detailed.rating is not null
      )
      and detailed.created_at >= placeholder.created_at
  );
