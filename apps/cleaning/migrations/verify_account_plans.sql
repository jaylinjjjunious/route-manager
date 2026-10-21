-- Disposable verification: all test identities and plans roll back.
begin;
do $$
declare a uuid := gen_random_uuid(); b uuid := gen_random_uuid(); r bigint; n integer;
  sample jsonb := '{"version":1,"spaces":[],"tasks":[],"history":[]}'::jsonb;
begin
  insert into auth.users(id,email) values(a,'cleaning-check-a-'||a||'@example.invalid'),(b,'cleaning-check-b-'||b||'@example.invalid');
  perform set_config('request.jwt.claim.sub',a::text,true);
  execute 'set local role authenticated';
  select revision into r from public.cleaning_save_plan(sample,0);
  if r <> 1 then raise exception 'Initial revision failed'; end if;
  select revision into r from public.cleaning_save_plan(sample,1);
  if r <> 2 then raise exception 'Revision update failed'; end if;
  begin
    perform public.cleaning_save_plan(sample,1);
    raise exception 'Stale write was accepted';
  exception when serialization_failure then null;
  end;
  begin
    update public.cleaning_plans set revision=99;
    raise exception 'Direct table writes were allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.cleaning_save_plan(jsonb_build_object('version',1,'spaces',jsonb_build_array(repeat('x',2097153)),'tasks','[]'::jsonb,'history','[]'::jsonb),2);
    raise exception 'Oversized plan accepted';
  exception when invalid_parameter_value then null;
  end;
  perform set_config('request.jwt.claim.sub',b::text,true);
  select count(*) into n from public.cleaning_plans;
  if n <> 0 then raise exception 'Cross-account read was allowed'; end if;
  select revision into r from public.cleaning_save_plan(sample,0);
  if r <> 1 then raise exception 'Second owner failed'; end if;
  select count(*) into n from public.cleaning_plans where owner_id=a;
  if n <> 0 then raise exception 'Other owner visible'; end if;
  execute 'set local role anon';
  begin
    perform public.cleaning_save_plan(sample,0);
    raise exception 'Anonymous write allowed';
  exception when insufficient_privilege then null;
  end;
  execute 'set local role postgres';
end;
$$;
select 'Isolation, revisions, stale-write denial, anonymous denial and size limits passed; all test data rolls back.' as verification;
rollback;
