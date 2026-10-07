-- Test transazionale dei trofei profilo sull'account @testshowtime.
-- Richiede la migration 0028. Il ROLLBACK finale ripristina integralmente i dati.

begin;

do $$
declare
  v_user_id uuid;
  v_row_count integer;
  v_level integer;
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
    250,
    '{}'::jsonb,
    now(),
    false
  );

  perform set_config(
    'request.jwt.claim.sub',
    v_user_id::text,
    true
  );

  select count(*), max(t.level)
  into v_row_count, v_level
  from public.get_followed_profile_badges('testshowtime') t
  where t.badge_id = 'cinephile';

  if v_row_count <> 1 then
    raise exception
      'Atteso un solo trofeo Cinefilo, trovati %',
      v_row_count;
  end if;
  if v_level <> 2 then
    raise exception
      'Livello Cinefilo atteso 2, trovato %',
      v_level;
  end if;

  raise notice
    'Trofei profilo OK: una famiglia, livello massimo 2';
end;
$$;

rollback;
