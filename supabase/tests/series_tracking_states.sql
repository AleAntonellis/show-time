-- Test transazionale dello stato Abbandonata.
-- Richiede la migration 0029. Il ROLLBACK finale ripristina i dati.

begin;

do $$
declare
  v_user_id uuid;
  v_item_id uuid;
  v_state text;
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
    and t.media_type = 'tv'
    and li.status = 'watching'
  order by li.id
  limit 1;

  if v_user_id is null or v_item_id is null then
    raise exception 'Serie Test in corso non disponibile';
  end if;

  perform set_config(
    'request.jwt.claim.sub',
    v_user_id::text,
    true
  );

  perform public.set_series_tracking_state(
    v_item_id,
    'abandoned'
  );

  select li.series_tracking_state
  into v_state
  from public.library_items li
  where li.id = v_item_id;

  if v_state <> 'abandoned' then
    raise exception
      'Stato atteso abandoned, trovato %',
      v_state;
  end if;

  update public.library_items
  set status = 'watched'
  where id = v_item_id;

  select li.series_tracking_state
  into v_state
  from public.library_items li
  where li.id = v_item_id;

  if v_state <> 'active' then
    raise exception
      'Completamento non ha ripristinato active: %',
      v_state;
  end if;

  raise notice
    'Stati serie OK: abandoned, completamento -> active';
end;
$$;

rollback;
