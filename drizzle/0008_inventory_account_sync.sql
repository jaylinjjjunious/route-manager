-- Owner-scoped inventory snapshots; the RPC permits only history extensions.
create table if not exists public.inventory_custody_ledgers (
  owner_id uuid not null references auth.users(id),
  domain text not null check (domain in ('merchandising', 'contract_parts')),
  job_id text not null,
  ledger jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, domain, job_id),
  check (octet_length(ledger::text) <= 3145728)
);
alter table public.inventory_custody_ledgers enable row level security;
revoke all on public.inventory_custody_ledgers from anon, authenticated;
grant select, insert, update on public.inventory_custody_ledgers to service_role;

create or replace function public.save_inventory_custody(p_owner uuid, p_domain text, p_job text, p_ledger jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare old jsonb; entry jsonb; replacement jsonb; idx integer; total_bytes bigint; total_rows integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('inventory:storage', 0));
  if p_domain not in ('merchandising', 'contract_parts') or p_ledger->>'domain' <> p_domain
    or p_ledger->>'jobId' <> p_job or p_ledger->>'ownerId' <> p_owner::text
    or octet_length(p_ledger::text) > 3145728 then raise exception 'Invalid inventory'; end if;
  select ledger into old from inventory_custody_ledgers where owner_id=p_owner and domain=p_domain and job_id=p_job for update;
  if old is not null then
    if jsonb_array_length(p_ledger->'events') < jsonb_array_length(old->'events') then raise exception 'Inventory conflict'; end if;
    for idx in 0..jsonb_array_length(old->'events')-1 loop
      if ((p_ledger->'events')->idx) - 'syncStatus' <> ((old->'events')->idx) - 'syncStatus' then raise exception 'Inventory conflict'; end if;
    end loop;
    for entry in select value from jsonb_array_elements(old->'items') loop
      select value into replacement from jsonb_array_elements(p_ledger->'items') where value->>'id'=entry->>'id';
      if replacement is null or replacement->>'partNumber' <> entry->>'partNumber'
        or replacement->>'serialNumber' <> entry->>'serialNumber'
        or not ((replacement->'evidence') @> (entry->'evidence')) then raise exception 'Inventory evidence conflict'; end if;
    end loop;
  end if;
  select count(*), coalesce(sum(octet_length(ledger::text)),0) into total_rows,total_bytes from inventory_custody_ledgers where owner_id=p_owner;
  if (old is null and total_rows >= 20) or total_bytes-coalesce(octet_length(old::text),0)+octet_length(p_ledger::text)>10485760 then
    raise exception 'Inventory storage limit';
  end if;
  select coalesce(sum(octet_length(ledger::text)),0) into total_bytes from inventory_custody_ledgers;
  if total_bytes-coalesce(octet_length(old::text),0)+octet_length(p_ledger::text)>104857600 then raise exception 'Inventory storage limit'; end if;
  insert into inventory_custody_ledgers(owner_id,domain,job_id,ledger) values(p_owner,p_domain,p_job,p_ledger)
    on conflict(owner_id,domain,job_id) do update set ledger=excluded.ledger,updated_at=now();
  return p_ledger;
end $$;
revoke all on function public.save_inventory_custody(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.save_inventory_custody(uuid,text,text,jsonb) to service_role;
