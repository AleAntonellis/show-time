-- Test transazionale di Serialista sull'account @testshowtime.
-- Richiede la migration 0021. Il ROLLBACK finale ripristina integralmente i dati.

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

  if has_table_privilege(
    'authenticated',
    'public.badge_title_metadata',
    'SELECT'
  ) or has_table_privilege(
    'authenticated',
    'public.badge_title_metadata',
    'INSERT'
  ) or has_table_privilege(
    'authenticated',
    'public.badge_title_metadata',
    'UPDATE'
  ) then
    raise exception
      'La cache TMDB badge è scrivibile o leggibile dal client';
  end if;

  if not has_table_privilege(
    'service_role',
    'public.badge_title_metadata',
    'SELECT'
  ) or not has_table_privilege(
    'service_role',
    'public.badge_title_metadata',
    'INSERT'
  ) or not has_table_privilege(
    'service_role',
    'public.badge_title_metadata',
    'UPDATE'
  ) then
    raise exception
      'Permessi service_role mancanti sulla cache TMDB badge';
  end if;

  perform public.apply_badge_evaluation(
    v_user_id,
    'serialist',
    1,
    100,
    '{}'::jsonb,
    now(),
    false
  );

  select count(*)
  into v_badge_count
  from public.user_badges ub
  where ub.user_id = v_user_id
    and ub.badge_id = 'serialist'
    and ub.badge_version = 1;

  if v_badge_count <> 2 then
    raise exception
      'Attesi 2 livelli Serialista, trovati %',
      v_badge_count;
  end if;

  perform public.apply_badge_evaluation(
    v_user_id,
    'serialist',
    1,
    100,
    '{}'::jsonb,
    now() + interval '1 second',
    false
  );

  select count(*)
  into v_badge_count
  from public.user_badges ub
  where ub.user_id = v_user_id
    and ub.badge_id = 'serialist'
    and ub.badge_version = 1;

  if v_badge_count <> 2 then
    raise exception
      'La rivalutazione ha creato duplicati: % livelli',
      v_badge_count;
  end if;

  perform public.apply_badge_evaluation(
    v_user_id,
    'serialist',
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
    and ubp.badge_id = 'serialist';

  if v_progress <> 0 then
    raise exception
      'Progresso corrente atteso 0, trovato %',
      v_progress;
  end if;
  if v_max_progress <> 100 then
    raise exception
      'Massimo storico atteso 100, trovato %',
      v_max_progress;
  end if;
  if v_next_threshold <> 250 then
    raise exception
      'Prossima soglia attesa 250, trovata %',
      v_next_threshold;
  end if;

  raise notice
    'Serialista OK: 2 livelli, idempotenza, current=0, max=100, next=250';
end;
$$;

rollback;
