-- Authenticated owner boundary for Store Master edits.
-- Service-role projection RPC remains server-only; browser sessions receive only
-- this narrow RLS-protected update surface.

create table if not exists public.oo_store_memberships (
  store_id text not null references public.oo_stores(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('owner', 'manager')),
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

alter table public.oo_store_memberships enable row level security;
drop policy if exists oo_memberships_read_own on public.oo_store_memberships;
create policy oo_memberships_read_own on public.oo_store_memberships
  for select to authenticated using (user_id = (select auth.uid()));

alter table public.oo_stores enable row level security;
alter table public.oo_occupancy_costs enable row level security;
alter table public.oo_operating_costs enable row level security;
alter table public.oo_menu_items enable row level security;
alter table public.oo_menu_bom enable row level security;
alter table public.oo_inventory_items enable row level security;
alter table public.oo_suppliers enable row level security;

drop policy if exists oo_stores_owner_read on public.oo_stores;
drop policy if exists oo_stores_owner_update on public.oo_stores;
create policy oo_stores_owner_read on public.oo_stores for select to authenticated
  using (exists(select 1 from public.oo_store_memberships m where m.store_id = id and m.user_id = (select auth.uid())));
create policy oo_stores_owner_update on public.oo_stores for update to authenticated
  using (exists(select 1 from public.oo_store_memberships m where m.store_id = id and m.user_id = (select auth.uid()) and m.role = 'owner'))
  with check (exists(select 1 from public.oo_store_memberships m where m.store_id = id and m.user_id = (select auth.uid()) and m.role = 'owner'));

drop policy if exists oo_occupancy_owner_all on public.oo_occupancy_costs;
create policy oo_occupancy_owner_all on public.oo_occupancy_costs for all to authenticated
  using (exists(select 1 from public.oo_store_memberships m where m.store_id = oo_occupancy_costs.store_id and m.user_id = (select auth.uid()) and m.role = 'owner'))
  with check (exists(select 1 from public.oo_store_memberships m where m.store_id = oo_occupancy_costs.store_id and m.user_id = (select auth.uid()) and m.role = 'owner'));

drop policy if exists oo_operating_costs_owner_all on public.oo_operating_costs;
create policy oo_operating_costs_owner_all on public.oo_operating_costs for all to authenticated
  using (exists(select 1 from public.oo_store_memberships m where m.store_id = oo_operating_costs.store_id and m.user_id = (select auth.uid()) and m.role = 'owner'))
  with check (exists(select 1 from public.oo_store_memberships m where m.store_id = oo_operating_costs.store_id and m.user_id = (select auth.uid()) and m.role = 'owner'));

drop policy if exists oo_menu_items_owner_all on public.oo_menu_items;
create policy oo_menu_items_owner_all on public.oo_menu_items for all to authenticated
  using (exists(select 1 from public.oo_store_memberships m where m.store_id = oo_menu_items.store_id and m.user_id = (select auth.uid()) and m.role = 'owner'))
  with check (exists(select 1 from public.oo_store_memberships m where m.store_id = oo_menu_items.store_id and m.user_id = (select auth.uid()) and m.role = 'owner'));

drop policy if exists oo_menu_bom_owner_all on public.oo_menu_bom;
create policy oo_menu_bom_owner_all on public.oo_menu_bom for all to authenticated
  using (exists(select 1 from public.oo_store_memberships m where m.store_id = oo_menu_bom.store_id and m.user_id = (select auth.uid()) and m.role = 'owner'))
  with check (exists(select 1 from public.oo_store_memberships m where m.store_id = oo_menu_bom.store_id and m.user_id = (select auth.uid()) and m.role = 'owner'));

drop policy if exists oo_inventory_items_owner_all on public.oo_inventory_items;
create policy oo_inventory_items_owner_all on public.oo_inventory_items for all to authenticated
  using (exists(select 1 from public.oo_store_memberships m where m.store_id = oo_inventory_items.store_id and m.user_id = (select auth.uid()) and m.role = 'owner'))
  with check (exists(select 1 from public.oo_store_memberships m where m.store_id = oo_inventory_items.store_id and m.user_id = (select auth.uid()) and m.role = 'owner'));

drop policy if exists oo_suppliers_owner_read on public.oo_suppliers;
create policy oo_suppliers_owner_read on public.oo_suppliers for select to authenticated
  using (exists(select 1 from public.oo_store_memberships m where m.store_id = oo_suppliers.store_id and m.user_id = (select auth.uid())));

grant select on public.oo_store_memberships to authenticated;
grant select, update on public.oo_stores, public.oo_occupancy_costs, public.oo_operating_costs,
  public.oo_menu_items, public.oo_menu_bom, public.oo_inventory_items to authenticated;
grant select on public.oo_suppliers to authenticated;

create or replace function public.oo_update_owned_store_master(p_store_id text, p_master jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business jsonb := p_master->'business';
  v_item jsonb;
  v_line jsonb;
begin
  if (select auth.uid()) is null then raise exception 'authentication required' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.oo_store_memberships
    where store_id = p_store_id and user_id = (select auth.uid()) and role = 'owner'
  ) then raise exception 'store ownership required' using errcode = '42501'; end if;

  update public.oo_stores set
    name = coalesce(nullif(v_business->>'name', ''), name),
    opening_hours = coalesce(v_business->'openingHours', opening_hours),
    targets = targets || jsonb_strip_nulls(jsonb_build_object(
      'targetLaborRatio', v_business->'targetLaborRatio',
      'targetFoodCostRatio', v_business->'targetFoodCostRatio'
    ))
  where id = p_store_id;

  if v_business->'occupancy' is not null then
    update public.oo_occupancy_costs set
      base_rent_monthly = coalesce((v_business->'occupancy'->>'baseRentMonthly')::numeric, base_rent_monthly),
      recurring_fees_monthly = coalesce((v_business->'occupancy'->>'recurringFeesMonthly')::numeric, recurring_fees_monthly),
      deposit = nullif(v_business->'occupancy'->>'deposit', '')::numeric,
      lease_start = nullif(v_business->'occupancy'->>'leaseStart', '')::date,
      lease_end = nullif(v_business->'occupancy'->>'leaseEnd', '')::date,
      next_escalation_date = nullif(v_business->'occupancy'->>'nextEscalationDate', '')::date,
      next_escalation_rate = nullif(v_business->'occupancy'->>'nextEscalationRate', '')::numeric
    where store_id = p_store_id;
  end if;

  if v_business->'operatingCosts' is not null then
    update public.oo_operating_costs set
      packaging_consumables_rate = coalesce((v_business->'operatingCosts'->'variableRates'->>'packagingAndConsumables')::numeric, packaging_consumables_rate),
      payment_processing_rate = coalesce((v_business->'operatingCosts'->'variableRates'->>'paymentProcessing')::numeric, payment_processing_rate),
      delivery_marketplace_rate = coalesce((v_business->'operatingCosts'->'variableRates'->>'deliveryAndMarketplace')::numeric, delivery_marketplace_rate),
      utilities_monthly = coalesce((v_business->'operatingCosts'->'fixedMonthly'->>'utilities')::numeric, utilities_monthly),
      software_security_rentals_monthly = coalesce((v_business->'operatingCosts'->'fixedMonthly'->>'softwareSecurityRentals')::numeric, software_security_rentals_monthly),
      marketing_monthly = coalesce((v_business->'operatingCosts'->'fixedMonthly'->>'marketing')::numeric, marketing_monthly),
      other_fixed_monthly = coalesce((v_business->'operatingCosts'->'fixedMonthly'->>'other')::numeric, other_fixed_monthly)
    where store_id = p_store_id;
  end if;

  for v_item in select value from jsonb_array_elements(coalesce(p_master->'menu', '[]'::jsonb)) loop
    update public.oo_menu_items set
      name = coalesce(nullif(v_item->>'name', ''), name), category = coalesce(nullif(v_item->>'category', ''), category),
      selling_price = coalesce((v_item->>'price')::numeric, selling_price), active = coalesce((v_item->>'active')::boolean, active)
    where store_id = p_store_id and menu_item_id = v_item->>'id';
    for v_line in select value from jsonb_array_elements(coalesce(v_item->'recipe', '[]'::jsonb)) loop
      update public.oo_menu_bom set quantity = (v_line->>'quantity')::numeric, unit = v_line->>'unit'
      where store_id = p_store_id and menu_item_id = v_item->>'id'
        and component_type = case when v_line ? 'prepItemId' then 'prep' else 'ingredient' end
        and component_id = coalesce(v_line->>'prepItemId', v_line->>'inventoryItemId');
    end loop;
  end loop;

  for v_item in select value from jsonb_array_elements(coalesce(p_master->'inventory', '[]'::jsonb)) loop
    update public.oo_inventory_items set
      name = coalesce(nullif(v_item->>'name', ''), name), category = coalesce(nullif(v_item->>'category', ''), category),
      purchase_form = coalesce(nullif(v_item->>'purchaseForm', ''), purchase_form),
      par_level = coalesce((v_item->>'parLevel')::numeric, par_level),
      reorder_point = coalesce((v_item->>'reorderPoint')::numeric, reorder_point),
      lead_time_days = coalesce((v_item->>'leadTimeDays')::integer, lead_time_days),
      supplier_id = nullif(v_item->>'supplierId', '')
    where store_id = p_store_id and item_id = v_item->>'id';
  end loop;

  return jsonb_build_object('storeId', p_store_id, 'updatedAt', now(), 'updatedBy', (select auth.uid()));
end;
$$;

revoke all on function public.oo_update_owned_store_master(text, jsonb) from public, anon;
grant execute on function public.oo_update_owned_store_master(text, jsonb) to authenticated;
