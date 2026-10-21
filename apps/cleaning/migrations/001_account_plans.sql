begin;
create table if not exists public.cleaning_plans (
  owner_id uuid primary key references auth.users(id),
  plan jsonb not null,
  revision bigint not null check (revision > 0),
  updated_at timestamptz not null default now(),
  check (octet_length(plan::text) <= 2097152),
  check (jsonb_typeof(plan) = 'object' and plan->>'version' in ('1','2','3','4'))
);
alter table public.cleaning_plans enable row level security;
revoke all on public.cleaning_plans from anon, authenticated;
grant select on public.cleaning_plans to authenticated;
create policy cleaning_read_own on public.cleaning_plans for select to authenticated using (owner_id = (select auth.uid()));

create or replace function public.cleaning_save_plan(p_plan jsonb, p_revision bigint)
returns setof public.cleaning_plans
language plpgsql security definer set search_path = pg_catalog, public as $$
declare v_owner uuid := auth.uid(); v_count integer;
begin
  if v_owner is null then raise exception 'Authentication required' using errcode = '28000'; end if;
  if p_revision is null or p_revision < 0 or p_plan is null
    or octet_length(p_plan::text) > 2097152
    or jsonb_typeof(p_plan) <> 'object'
    or coalesce(p_plan->>'version', '') not in ('1','2','3','4')
    or coalesce(jsonb_typeof(p_plan->'spaces'), '') <> 'array'
    or coalesce(jsonb_typeof(p_plan->'tasks'), '') <> 'array'
    or coalesce(jsonb_typeof(p_plan->'history'), '') <> 'array'
  then raise exception 'Invalid cleaning plan' using errcode = '22023'; end if;
  if p_revision = 0 then
    insert into public.cleaning_plans(owner_id,plan,revision) values(v_owner,p_plan,1) on conflict do nothing;
  else
    update public.cleaning_plans set plan=p_plan, revision=revision+1, updated_at=now() where owner_id=v_owner and revision=p_revision;
  end if;
  get diagnostics v_count = row_count;
  if v_count <> 1 then raise exception 'Cloud plan changed; load the latest revision' using errcode = '40001'; end if;
  return query select * from public.cleaning_plans where owner_id=v_owner;
end;
$$;
revoke all on function public.cleaning_save_plan(jsonb,bigint) from public, anon;
grant execute on function public.cleaning_save_plan(jsonb,bigint) to authenticated;
notify pgrst, 'reload schema';
commit;
