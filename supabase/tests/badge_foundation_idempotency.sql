-- Test transazionale delle fondazioni badge sull'account @testshowtime.
-- Il ROLLBACK finale ripristina integralmente progressi e sblocchi.

begin;

do $$
declare
  v_user_id uuid;
  v_badge_count integer;
  v_progress integer;
  v_max_progress integer;
  v_next_threshold integer;
begin
  select p.id
  into v_user_id
  from public.profiles p
  where p.username = 'testshowtime';

  if v_user_id is null then
    raise exception 'Profilo @testshowtime non trovato';
  end if;

  perform public.apply_badge_evaluation(
    v_user_id,
    'cinephile',
    1,
    500,
    jsonb_build_object(
      'itemIds',
      jsonb_build_array('transactional-test')
    ),
    now(),
    false
  );

  select count(*)
  into v_badge_count
  from public.user_badges ub
  where ub.user_id = v_user_id
    and ub.badge_id = 'cinephile'
    and ub.badge_version = 1;

  if v_badge_count <> 3 then
    raise exception
      'Attesi 3 livelli Cinefilo, trovati %',
      v_badge_count;
  end if;

  perform public.apply_badge_evaluation(
    v_user_id,
    'cinephile',
    1,
    500,
    jsonb_build_object(
      'itemIds',
      jsonb_build_array('transactional-test')
    ),
    now() + interval '1 second',
    false
  );

  select count(*)
  into v_badge_count
  from public.user_badges ub
  where ub.user_id = v_user_id
    and ub.badge_id = 'cinephile'
    and ub.badge_version = 1;

  if v_badge_count <> 3 then
    raise exception
      'La rivalutazione ha creato duplicati: % livelli',
      v_badge_count;
  end if;

  perform public.apply_badge_evaluation(
    v_user_id,
    'cinephile',
    1,
    3,
    jsonb_build_object(
      'itemIds',
      jsonb_build_array('transactional-test')
    ),
    now() + interval '2 seconds',
    false
  );

  select
    ubp.progress,
    ubp.max_progress,
    ubp.next_threshold
  into
    v_progress,
    v_max_progress,
    v_next_threshold
  from public.user_badge_progress ubp
  where ubp.user_id = v_user_id
    and ubp.badge_id = 'cinephile';

  if v_progress <> 3 then
    raise exception
      'Progresso corrente atteso 3, trovato %',
      v_progress;
  end if;
  if v_max_progress <> 500 then
    raise exception
      'Massimo storico atteso 500, trovato %',
      v_max_progress;
  end if;
  if v_next_threshold <> 1500 then
    raise exception
      'Prossima soglia attesa 1500, trovata %',
      v_next_threshold;
  end if;

  raise notice
    'Badge foundation OK: 3 livelli, idempotenza, current=3, max=500, next=1500';
end;
$$;

rollback;
