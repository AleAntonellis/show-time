-- Test transazionale di Archivista sull'account @testshowtime.
-- Richiede la migration 0019. Il ROLLBACK finale ripristina integralmente i dati.

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
    'archivist',
    1,
    1500,
    '{}'::jsonb,
    now(),
    false
  );

  select count(*)
  into v_badge_count
  from public.user_badges ub
  where ub.user_id = v_user_id
    and ub.badge_id = 'archivist'
    and ub.badge_version = 1;

  if v_badge_count <> 2 then
    raise exception
      'Attesi 2 livelli Archivista, trovati %',
      v_badge_count;
  end if;

  perform public.apply_badge_evaluation(
    v_user_id,
    'archivist',
    1,
    1500,
    '{}'::jsonb,
    now() + interval '1 second',
    false
  );

  select count(*)
  into v_badge_count
  from public.user_badges ub
  where ub.user_id = v_user_id
    and ub.badge_id = 'archivist'
    and ub.badge_version = 1;

  if v_badge_count <> 2 then
    raise exception
      'La rivalutazione ha creato duplicati: % livelli',
      v_badge_count;
  end if;

  perform public.apply_badge_evaluation(
    v_user_id,
    'archivist',
    1,
    5,
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
    and ubp.badge_id = 'archivist';

  if v_progress <> 5 then
    raise exception
      'Progresso corrente atteso 5, trovato %',
      v_progress;
  end if;
  if v_max_progress <> 1500 then
    raise exception
      'Massimo storico atteso 1500, trovato %',
      v_max_progress;
  end if;
  if v_next_threshold <> 2500 then
    raise exception
      'Prossima soglia attesa 2500, trovata %',
      v_next_threshold;
  end if;

  raise notice
    'Archivista OK: 2 livelli, idempotenza, current=5, max=1500, next=2500';
end;
$$;

rollback;
