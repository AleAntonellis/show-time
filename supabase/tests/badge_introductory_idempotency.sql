-- Test transazionale dei badge introduttivi sull'account @testshowtime.
-- Richiede la migration 0017. Il ROLLBACK finale ripristina integralmente i dati.

begin;

do $$
declare
  v_user_id uuid;
  v_badge_id text;
  v_unlock_count integer;
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

  foreach v_badge_id in array array[
    'first_watch',
    'first_review',
    'season_complete'
  ]
  loop
    perform public.apply_badge_evaluation(
      v_user_id,
      v_badge_id,
      1,
      1,
      jsonb_build_object(
        'activityIds',
        jsonb_build_array('transactional-test')
      ),
      now(),
      false
    );

    perform public.apply_badge_evaluation(
      v_user_id,
      v_badge_id,
      1,
      1,
      jsonb_build_object(
        'activityIds',
        jsonb_build_array('transactional-test')
      ),
      now() + interval '1 second',
      false
    );

    select count(*)
    into v_unlock_count
    from public.user_badges ub
    where ub.user_id = v_user_id
      and ub.badge_id = v_badge_id
      and ub.badge_version = 1;

    if v_unlock_count <> 1 then
      raise exception
        'Badge %: atteso uno sblocco, trovati %',
        v_badge_id,
        v_unlock_count;
    end if;

    perform public.apply_badge_evaluation(
      v_user_id,
      v_badge_id,
      1,
      0,
      '{}'::jsonb,
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
      and ubp.badge_id = v_badge_id;

    if v_progress <> 0 then
      raise exception
        'Badge %: progresso corrente atteso 0, trovato %',
        v_badge_id,
        v_progress;
    end if;
    if v_max_progress <> 1 then
      raise exception
        'Badge %: massimo storico atteso 1, trovato %',
        v_badge_id,
        v_max_progress;
    end if;
    if v_next_threshold is not null then
      raise exception
        'Badge %: prossima soglia attesa null, trovata %',
        v_badge_id,
        v_next_threshold;
    end if;
  end loop;

  raise notice
    'Badge introduttivi OK: sblocco unico, idempotenza e permanenza';
end;
$$;

rollback;
