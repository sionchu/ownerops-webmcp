do $$
declare
  v_owner uuid := '11111111-1111-1111-1111-111111111111';
  v_other uuid := '22222222-2222-2222-2222-222222222222';
  v_receipts bigint;
begin
  insert into public.oo_store_memberships(store_id, user_id, role)
  values ('demo-kr-seoul-coffee', v_owner, 'owner');
  select count(*) into v_receipts from public.oo_purchase_receipts where store_id = 'demo-kr-seoul-coffee';

  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  set local role authenticated;
  perform public.oo_update_owned_store_master('demo-kr-seoul-coffee', jsonb_build_object(
    'business', jsonb_build_object('name', 'Owner-secured Coffee', 'occupancy', jsonb_build_object('baseRentMonthly', 3300000)),
    'menu', jsonb_build_array(), 'inventory', jsonb_build_array()
  ));
  reset role;
  if (select name from public.oo_stores where id = 'demo-kr-seoul-coffee') <> 'Owner-secured Coffee' then
    raise exception 'owner update was not persisted';
  end if;
  if (select count(*) from public.oo_purchase_receipts where store_id = 'demo-kr-seoul-coffee') <> v_receipts then
    raise exception 'master edit mutated receipt history';
  end if;

  perform set_config('request.jwt.claim.sub', v_other::text, true);
  set local role authenticated;
  begin
    perform public.oo_update_owned_store_master('demo-kr-seoul-coffee', jsonb_build_object('business', jsonb_build_object('name', 'Forbidden')));
    raise exception 'different user update unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  reset role;

  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
  begin
    perform public.oo_update_owned_store_master('demo-kr-seoul-coffee', '{}'::jsonb);
    raise exception 'anonymous update unexpectedly succeeded';
  exception when insufficient_privilege or undefined_function then null;
  end;
  reset role;
end;
$$;
