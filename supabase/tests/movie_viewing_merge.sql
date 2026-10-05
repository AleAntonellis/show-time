-- Test transazionale della registrazione film sul profilo @testshowtime.
-- Il ROLLBACK finale rimuove date e note fittizie.

begin;

do $$
declare
  v_user_id uuid;
  v_item_id uuid;
  v_placeholder_id uuid;
  v_completed_id uuid;
  v_rewatch_id uuid;
  v_count integer;
begin
  select p.id
  into v_user_id
  from public.profiles p
  where p.username = 'testshowtime';

  select li.id
  into v_item_id
  from public.library_items li
  join public.titles t on t.id = li.title_id
  where li.user_id = v_user_id
    and t.media_type = 'movie'
  order by li.id
  limit 1;

  if v_user_id is null or v_item_id is null then
    raise exception 'Profilo Test o film di prova non disponibile';
  end if;

  perform set_config('request.jwt.claim.sub', v_user_id::text, true);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', v_user_id,
      'role', 'authenticated'
    )::text,
    true
  );

  delete from public.viewings v
  where v.user_id = v_user_id
    and v.library_item_id = v_item_id
    and v.watched_on = date '1900-01-01';

  select r.id
  into v_placeholder_id
  from public.record_movie_viewing(
    v_item_id,
    date '1900-01-01',
    null,
    null
  ) r;

  select r.id
  into v_completed_id
  from public.record_movie_viewing(
    v_item_id,
    date '1900-01-01',
    'nota transazionale',
    8.0
  ) r;

  if v_completed_id <> v_placeholder_id then
    raise exception 'La nota non ha completato il placeholder esistente';
  end if;

  select count(*)
  into v_count
  from public.viewings v
  where v.user_id = v_user_id
    and v.library_item_id = v_item_id
    and v.watched_on = date '1900-01-01'
    and v.note = 'nota transazionale'
    and v.rating = 8.0;

  if v_count <> 1 then
    raise exception 'Attesa una sola visione dettagliata, trovate %', v_count;
  end if;

  select r.id
  into v_rewatch_id
  from public.record_movie_viewing(
    v_item_id,
    date '1900-01-01',
    'rewatch transazionale',
    9.0
  ) r;

  if v_rewatch_id = v_completed_id then
    raise exception 'Il vero rewatch non ha creato una nuova visione';
  end if;

  select count(*)
  into v_count
  from public.viewings v
  where v.user_id = v_user_id
    and v.library_item_id = v_item_id
    and v.watched_on = date '1900-01-01';

  if v_count <> 2 then
    raise exception 'Attese due visioni dopo il rewatch, trovate %', v_count;
  end if;

  raise notice
    'Visioni film OK: placeholder completato e rewatch distinto';
end;
$$;

rollback;
