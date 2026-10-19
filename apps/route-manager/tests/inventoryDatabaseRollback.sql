-- Run in the project's SQL editor. Every fixture write is rolled back.
begin;
do $$
declare owner_a uuid; owner_b uuid; fixture jsonb; other jsonb; rejected boolean; idx integer;
begin
  select id into owner_a from auth.users order by created_at limit 1;
  select id into owner_b from auth.users where id <> owner_a order by created_at limit 1;
  if owner_a is null or owner_b is null then raise exception 'Two existing accounts are required for isolation verification'; end if;
  fixture = jsonb_build_object('version',1,'ownerId',owner_a,'domain','merchandising','jobId','inventory-rollback-probe',
    'events',jsonb_build_array(jsonb_build_object('id','event-1','hash','hash-1','syncStatus','queued')),
    'items',jsonb_build_array(jsonb_build_object('id','item-1','partNumber','P1','serialNumber','S1','evidence',jsonb_build_array(jsonb_build_object('id','proof-1','dataUrl','test-proof')))));
  perform save_inventory_custody(owner_a,'merchandising','inventory-rollback-probe',fixture);
  perform save_inventory_custody(owner_a,'merchandising','inventory-rollback-probe',fixture);
  if (select count(*) from inventory_custody_ledgers where owner_id=owner_a and job_id='inventory-rollback-probe') <> 1 then raise exception 'Replay duplicated a ledger'; end if;
  other = jsonb_set(fixture,'{ownerId}',to_jsonb(owner_b::text));
  perform save_inventory_custody(owner_b,'merchandising','inventory-rollback-probe',other);
  if (select count(*) from inventory_custody_ledgers where owner_id=owner_b and job_id='inventory-rollback-probe') <> 1 then raise exception 'Owner isolation failed'; end if;
  rejected=false;
  begin perform save_inventory_custody(owner_a,'merchandising','inventory-rollback-probe',jsonb_set(fixture,'{events,0,hash}','"altered"')); exception when others then rejected=true; end;
  if not rejected then raise exception 'Changed history was accepted'; end if;
  rejected=false;
  begin perform save_inventory_custody(owner_a,'merchandising','inventory-rollback-probe',jsonb_set(fixture,'{events}','[]')); exception when others then rejected=true; end;
  if not rejected then raise exception 'Shortened history was accepted'; end if;
  rejected=false;
  begin perform save_inventory_custody(owner_a,'merchandising','inventory-rollback-probe',jsonb_set(fixture,'{items,0,evidence}','[]')); exception when others then rejected=true; end;
  if not rejected then raise exception 'Proof removal was accepted'; end if;
  fixture=jsonb_set(fixture,'{events}',(fixture->'events') || jsonb_build_array(jsonb_build_object('id','event-2','hash','hash-2','syncStatus','queued')));
  perform save_inventory_custody(owner_a,'merchandising','inventory-rollback-probe',fixture);
  if (select jsonb_array_length(ledger->'events') from inventory_custody_ledgers where owner_id=owner_a and job_id='inventory-rollback-probe') <> 2 then raise exception 'Append failed'; end if;
  if has_table_privilege('anon','public.inventory_custody_ledgers','select')
    or has_table_privilege('authenticated','public.inventory_custody_ledgers','select')
    or has_function_privilege('authenticated','public.save_inventory_custody(uuid,text,text,jsonb)','execute')
    or not (select relrowsecurity from pg_class where oid='public.inventory_custody_ledgers'::regclass) then raise exception 'Inventory access protection failed'; end if;
  -- The freshly-created table has no production ledgers. Fill only temporary rows.
  for idx in 2..20 loop
    other=jsonb_set(fixture,'{jobId}',to_jsonb('inventory-quota-probe-' || idx));
    perform save_inventory_custody(owner_a,'merchandising','inventory-quota-probe-' || idx,other);
  end loop;
  rejected=false;
  begin
    other=jsonb_set(fixture,'{jobId}','"inventory-quota-overflow"');
    perform save_inventory_custody(owner_a,'merchandising','inventory-quota-overflow',other);
  exception when others then rejected=true; end;
  if not rejected then raise exception 'Account ledger cap was not enforced'; end if;
end $$;
rollback;
select 'Inventory replay, isolation, append, conflict, proof preservation, access and quota checks passed; fixtures rolled back.' as result;
