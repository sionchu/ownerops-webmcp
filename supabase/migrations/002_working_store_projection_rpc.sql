-- Transactional working-store projection for OwnerOps.
-- Store-owned facts are normalized into oo_* tables; preview/reference cache are excluded.

alter table public.oo_prep_items add column if not exists category text not null default 'prep';
alter table public.oo_prep_items add column if not exists batch_yield_rate numeric(8,5)
  check (batch_yield_rate is null or (batch_yield_rate > 0 and batch_yield_rate <= 1));

create or replace function public.oo_replace_working_store_projection(p_projection jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id text := p_projection->>'storeId';
  v_business jsonb := p_projection->'business';
  v_worker jsonb;
  v_shift jsonb;
  v_entry jsonb;
  v_incident jsonb;
  v_sale jsonb;
  v_sale_item jsonb;
  v_supplier jsonb;
  v_inventory jsonb;
  v_purchase jsonb;
  v_order jsonb;
  v_waste jsonb;
  v_prep jsonb;
  v_line jsonb;
  v_menu jsonb;
  v_task jsonb;
  v_log jsonb;
begin
  if coalesce(v_store_id, '') = '' then
    raise exception 'storeId is required';
  end if;
  if v_business is null then
    raise exception 'business is required';
  end if;

  insert into public.oo_stores(
    id, name, industry, market_id, country_code, city_name, currency_code, timezone,
    opening_hours, targets, policies
  ) values (
    v_store_id,
    v_business->>'name',
    v_business->>'industry',
    v_business->>'market',
    split_part(v_business->>'market', '-', 1),
    v_business->>'market',
    v_business->>'currency',
    coalesce(v_business->>'timezone', 'UTC'),
    coalesce(v_business->'openingHours', '{}'::jsonb),
    jsonb_build_object(
      'targetLaborRatio', v_business->'targetLaborRatio',
      'targetFoodCostRatio', v_business->'targetFoodCostRatio',
      'weeklyHourWarningThreshold', v_business->'weeklyHourWarningThreshold',
      'expectedSalesByDay', coalesce(v_business->'expectedSalesByDay', '{}'::jsonb),
      'peakWindows', coalesce(v_business->'peakWindows', '[]'::jsonb)
    ),
    coalesce(v_business->'policies', '{}'::jsonb)
  )
  on conflict (id) do update set
    name = excluded.name,
    industry = excluded.industry,
    market_id = excluded.market_id,
    country_code = excluded.country_code,
    city_name = excluded.city_name,
    currency_code = excluded.currency_code,
    timezone = excluded.timezone,
    opening_hours = excluded.opening_hours,
    targets = excluded.targets,
    policies = excluded.policies;

  if v_business->'occupancy' is not null then
    insert into public.oo_occupancy_costs(
      store_id, base_rent_monthly, recurring_fees_monthly, deposit,
      lease_start, lease_end, next_escalation_date, next_escalation_rate
    ) values (
      v_store_id,
      coalesce((v_business->'occupancy'->>'baseRentMonthly')::numeric, 0),
      coalesce((v_business->'occupancy'->>'recurringFeesMonthly')::numeric, 0),
      nullif(v_business->'occupancy'->>'deposit', '')::numeric,
      nullif(v_business->'occupancy'->>'leaseStart', '')::date,
      nullif(v_business->'occupancy'->>'leaseEnd', '')::date,
      nullif(v_business->'occupancy'->>'nextEscalationDate', '')::date,
      nullif(v_business->'occupancy'->>'nextEscalationRate', '')::numeric
    )
    on conflict (store_id) do update set
      base_rent_monthly = excluded.base_rent_monthly,
      recurring_fees_monthly = excluded.recurring_fees_monthly,
      deposit = excluded.deposit,
      lease_start = excluded.lease_start,
      lease_end = excluded.lease_end,
      next_escalation_date = excluded.next_escalation_date,
      next_escalation_rate = excluded.next_escalation_rate;
  end if;

  if v_business->'operatingCosts' is not null then
    insert into public.oo_operating_costs(
      store_id, packaging_consumables_rate, payment_processing_rate, delivery_marketplace_rate,
      utilities_monthly, software_security_rentals_monthly, marketing_monthly, other_fixed_monthly
    ) values (
      v_store_id,
      coalesce((v_business->'operatingCosts'->'variableRates'->>'packagingAndConsumables')::numeric, 0),
      coalesce((v_business->'operatingCosts'->'variableRates'->>'paymentProcessing')::numeric, 0),
      coalesce((v_business->'operatingCosts'->'variableRates'->>'deliveryAndMarketplace')::numeric, 0),
      coalesce((v_business->'operatingCosts'->'fixedMonthly'->>'utilities')::numeric, 0),
      coalesce((v_business->'operatingCosts'->'fixedMonthly'->>'softwareSecurityRentals')::numeric, 0),
      coalesce((v_business->'operatingCosts'->'fixedMonthly'->>'marketing')::numeric, 0),
      coalesce((v_business->'operatingCosts'->'fixedMonthly'->>'other')::numeric, 0)
    )
    on conflict (store_id) do update set
      packaging_consumables_rate = excluded.packaging_consumables_rate,
      payment_processing_rate = excluded.payment_processing_rate,
      delivery_marketplace_rate = excluded.delivery_marketplace_rate,
      utilities_monthly = excluded.utilities_monthly,
      software_security_rentals_monthly = excluded.software_security_rentals_monthly,
      marketing_monthly = excluded.marketing_monthly,
      other_fixed_monthly = excluded.other_fixed_monthly;
  end if;

  -- Replace child facts in FK-safe order. One RPC call is one PostgreSQL transaction.
  delete from public.oo_time_entries where store_id = v_store_id;
  delete from public.oo_shifts where store_id = v_store_id;
  delete from public.oo_worker_availability_rules where store_id = v_store_id;
  delete from public.oo_worker_availability_exceptions where store_id = v_store_id;
  delete from public.oo_incidents where store_id = v_store_id;
  delete from public.oo_sales_snapshots where store_id = v_store_id;
  delete from public.oo_tasks where store_id = v_store_id;
  delete from public.oo_store_log where store_id = v_store_id;
  delete from public.oo_purchase_receipts where store_id = v_store_id;
  delete from public.oo_purchase_orders where store_id = v_store_id;
  delete from public.oo_inventory_counts where store_id = v_store_id;
  delete from public.oo_waste_records where store_id = v_store_id;
  delete from public.oo_menu_items where store_id = v_store_id;
  delete from public.oo_prep_items where store_id = v_store_id;
  delete from public.oo_inventory_items where store_id = v_store_id;
  delete from public.oo_suppliers where store_id = v_store_id;
  delete from public.oo_workers where store_id = v_store_id;

  for v_worker in select value from jsonb_array_elements(coalesce(p_projection->'workers', '[]'::jsonb)) loop
    insert into public.oo_workers(
      store_id, worker_id, name, display_name, contact_label, employment_type, role,
      skills, hourly_rate, preferred_weekly_hours, max_weekly_hours, active
    ) values (
      v_store_id,
      v_worker->>'id',
      v_worker->>'name',
      v_worker->>'displayName',
      v_worker->>'contactLabel',
      coalesce(v_worker->>'employmentType', 'hourly_part_time'),
      v_worker->>'role',
      coalesce(v_worker->'skills', '[]'::jsonb),
      (v_worker->>'hourlyRate')::numeric,
      nullif(v_worker->>'preferredWeeklyHours', '')::numeric,
      nullif(v_worker->>'maxWeeklyHours', '')::numeric,
      true
    );

    for v_line in select value from jsonb_array_elements(coalesce(v_worker->'regularAvailability', '[]'::jsonb)) loop
      insert into public.oo_worker_availability_rules(store_id, worker_id, weekday, start_time, end_time, available)
      values (
        v_store_id, v_worker->>'id', (v_line->>'weekday')::smallint,
        (v_line->>'start')::time, (v_line->>'end')::time,
        coalesce((v_line->>'available')::boolean, true)
      );
    end loop;

    for v_line in select value from jsonb_array_elements(coalesce(v_worker->'availabilityExceptions', '[]'::jsonb)) loop
      insert into public.oo_worker_availability_exceptions(id, store_id, worker_id, starts_at, ends_at, available, reason, source)
      values (
        v_line->>'id', v_store_id, v_worker->>'id',
        (v_line->>'start')::timestamptz, (v_line->>'end')::timestamptz,
        (v_line->>'available')::boolean, v_line->>'reason', coalesce(v_line->>'source', 'owner')
      );
    end loop;
  end loop;

  for v_shift in select value from jsonb_array_elements(coalesce(p_projection->'shifts', '[]'::jsonb)) loop
    insert into public.oo_shifts(store_id, shift_id, worker_id, starts_at, ends_at, role, required_skills, status, published)
    values (
      v_store_id, v_shift->>'id', nullif(v_shift->>'workerId', ''),
      (v_shift->>'start')::timestamptz, (v_shift->>'end')::timestamptz,
      v_shift->>'role', coalesce(v_shift->'requiredSkills', '[]'::jsonb), v_shift->>'status', true
    );
  end loop;

  for v_entry in select value from jsonb_array_elements(coalesce(p_projection->'timeEntries', '[]'::jsonb)) loop
    insert into public.oo_time_entries(id, store_id, worker_id, shift_id, clock_in, clock_out, source)
    values (
      v_entry->>'id', v_store_id, v_entry->>'workerId', nullif(v_entry->>'shiftId', ''),
      (v_entry->>'clockIn')::timestamptz, nullif(v_entry->>'clockOut', '')::timestamptz,
      v_entry->>'source'
    );
  end loop;

  for v_incident in select value from jsonb_array_elements(coalesce(p_projection->'incidents', '[]'::jsonb)) loop
    insert into public.oo_incidents(id, store_id, type, status, created_at, resolved_at, worker_id, shift_id, inventory_item_id, reason, metadata)
    values (
      v_incident->>'id', v_store_id, v_incident->>'type', v_incident->>'status',
      (v_incident->>'createdAt')::timestamptz, nullif(v_incident->>'resolvedAt', '')::timestamptz,
      v_incident->>'workerId', v_incident->>'shiftId', v_incident->>'inventoryItemId',
      v_incident->>'reason', '{}'::jsonb
    );
  end loop;

  for v_supplier in select value from jsonb_array_elements(coalesce(p_projection->'suppliers', '[]'::jsonb)) loop
    insert into public.oo_suppliers(store_id, supplier_id, name, contact_label, default_lead_time_days, active)
    values (
      v_store_id, v_supplier->>'id', v_supplier->>'name', v_supplier->>'contactLabel',
      coalesce((v_supplier->>'defaultLeadTimeDays')::integer, 1), true
    );
  end loop;

  for v_inventory in select value from jsonb_array_elements(coalesce(p_projection->'inventory', '[]'::jsonb)) loop
    insert into public.oo_inventory_items(
      store_id, item_id, ingredient_id, name, category, base_unit, purchase_form, store_yield_rate,
      on_hand, par_level, reorder_point, lead_time_days, supplier_id, market_reference_key, perishable
    ) values (
      v_store_id, v_inventory->>'id', null, v_inventory->>'name', v_inventory->>'category', v_inventory->>'unit',
      coalesce(v_inventory->>'purchaseForm', 'unknown'), null,
      coalesce((v_inventory->>'onHand')::numeric, 0), coalesce((v_inventory->>'parLevel')::numeric, 0),
      coalesce((v_inventory->>'reorderPoint')::numeric, 0), coalesce((v_inventory->>'leadTimeDays')::integer, 1),
      nullif(v_inventory->>'supplierId', ''), nullif(v_inventory->>'marketReferenceKey', ''),
      coalesce((v_inventory->>'perishable')::boolean, false)
    );
  end loop;

  for v_purchase in select value from jsonb_array_elements(coalesce(p_projection->'purchases', '[]'::jsonb)) loop
    insert into public.oo_purchase_receipts(
      id, store_id, supplier_id, item_id, received_at, quantity, unit, total_cost, currency_code, purchase_form
    ) values (
      v_purchase->>'id', v_store_id, nullif(v_purchase->>'supplierId', ''), v_purchase->>'inventoryItemId',
      (v_purchase->>'receivedAt')::timestamptz, (v_purchase->>'quantity')::numeric, v_purchase->>'unit',
      (v_purchase->>'totalCost')::numeric, v_business->>'currency',
      coalesce((select purchase_form from public.oo_inventory_items where store_id = v_store_id and item_id = v_purchase->>'inventoryItemId'), 'unknown')
    );
  end loop;

  for v_order in select value from jsonb_array_elements(coalesce(p_projection->'purchaseOrders', '[]'::jsonb)) loop
    insert into public.oo_purchase_orders(id, store_id, supplier_id, item_id, created_at, expected_at, quantity, unit, estimated_unit_cost, status)
    values (
      v_order->>'id', v_store_id, nullif(v_order->>'supplierId', ''), v_order->>'inventoryItemId',
      (v_order->>'createdAt')::timestamptz, nullif(v_order->>'expectedAt', '')::timestamptz,
      (v_order->>'quantity')::numeric, v_order->>'unit', nullif(v_order->>'estimatedUnitCost', '')::numeric,
      v_order->>'status'
    );
  end loop;

  for v_waste in select value from jsonb_array_elements(coalesce(p_projection->'waste', '[]'::jsonb)) loop
    insert into public.oo_waste_records(id, store_id, item_id, recorded_at, quantity, unit, reason, worker_id, shift_id, corrective_action)
    values (
      v_waste->>'id', v_store_id, v_waste->>'inventoryItemId', (v_waste->>'recordedAt')::timestamptz,
      (v_waste->>'quantity')::numeric, v_waste->>'unit', v_waste->>'reason',
      v_waste->>'workerId', v_waste->>'shiftId', v_waste->>'correctiveAction'
    );
  end loop;

  for v_prep in select value from jsonb_array_elements(coalesce(p_projection->'prepItems', '[]'::jsonb)) loop
    insert into public.oo_prep_items(store_id, prep_id, name, category, output_quantity, output_unit, batch_yield_rate, active)
    values (
      v_store_id, v_prep->>'id', v_prep->>'name', coalesce(v_prep->>'category', 'prep'),
      (v_prep->>'outputQuantity')::numeric, v_prep->>'outputUnit', nullif(v_prep->>'batchYieldRate', '')::numeric,
      coalesce((v_prep->>'active')::boolean, true)
    );
    for v_line in select value from jsonb_array_elements(coalesce(v_prep->'recipe', '[]'::jsonb)) loop
      insert into public.oo_prep_bom(store_id, prep_id, item_id, quantity, unit, line_yield_rate, note)
      values (
        v_store_id, v_prep->>'id', v_line->>'inventoryItemId', (v_line->>'quantity')::numeric,
        v_line->>'unit', nullif(v_line->>'yieldRate', '')::numeric, null
      );
    end loop;
  end loop;

  for v_menu in select value from jsonb_array_elements(coalesce(p_projection->'menu', '[]'::jsonb)) loop
    insert into public.oo_menu_items(store_id, menu_item_id, name, category, selling_price, currency_code, active)
    values (
      v_store_id, v_menu->>'id', v_menu->>'name', v_menu->>'category',
      (v_menu->>'price')::numeric, v_business->>'currency', coalesce((v_menu->>'active')::boolean, true)
    );
    for v_line in select value from jsonb_array_elements(coalesce(v_menu->'recipe', '[]'::jsonb)) loop
      insert into public.oo_menu_bom(store_id, menu_item_id, component_type, component_id, quantity, unit, line_yield_rate, note)
      values (
        v_store_id, v_menu->>'id',
        case when v_line ? 'prepItemId' then 'prep' else 'ingredient' end,
        coalesce(v_line->>'prepItemId', v_line->>'inventoryItemId'),
        (v_line->>'quantity')::numeric, v_line->>'unit', nullif(v_line->>'yieldRate', '')::numeric, null
      );
    end loop;
  end loop;

  for v_sale in select value from jsonb_array_elements(coalesce(p_projection->'sales', '[]'::jsonb)) loop
    insert into public.oo_sales_snapshots(id, store_id, business_date, hour, gross_sales, net_sales, order_count, source)
    values (
      v_sale->>'id', v_store_id, (v_sale->>'date')::date, nullif(v_sale->>'hour', '')::smallint,
      (v_sale->>'grossSales')::numeric, (v_sale->>'netSales')::numeric, (v_sale->>'orderCount')::integer,
      v_sale->>'source'
    );
    for v_sale_item in select value from jsonb_array_elements(coalesce(v_sale->'itemSales', '[]'::jsonb)) loop
      insert into public.oo_sales_items(sales_snapshot_id, menu_item_id, quantity, net_sales)
      values (
        v_sale->>'id', v_sale_item->>'menuItemId', (v_sale_item->>'quantity')::numeric,
        (v_sale_item->>'netSales')::numeric
      );
    end loop;
  end loop;

  for v_task in select value from jsonb_array_elements(coalesce(p_projection->'tasks', '[]'::jsonb)) loop
    insert into public.oo_tasks(id, store_id, title, due_at, shift_id, worker_id, status)
    values (
      v_task->>'id', v_store_id, v_task->>'title', nullif(v_task->>'dueAt', '')::timestamptz,
      v_task->>'shiftId', v_task->>'workerId', v_task->>'status'
    );
  end loop;

  for v_log in select value from jsonb_array_elements(coalesce(p_projection->'log', '[]'::jsonb)) loop
    insert into public.oo_store_log(id, store_id, created_at, type, summary, related_ids, metadata)
    values (
      v_log->>'id', v_store_id, (v_log->>'createdAt')::timestamptz, v_log->>'type', v_log->>'summary',
      coalesce(v_log->'relatedIds', '[]'::jsonb), '{}'::jsonb
    );
  end loop;

  return jsonb_build_object('storeId', v_store_id, 'persistedAt', now());
end;
$$;

create or replace function public.oo_get_working_store_projection(p_store_id text)
returns jsonb
language sql
security definer
set search_path = public
as $$
with
s as (
  select st.*,
    oc.base_rent_monthly, oc.recurring_fees_monthly, oc.deposit, oc.lease_start, oc.lease_end,
    oc.next_escalation_date, oc.next_escalation_rate,
    op.packaging_consumables_rate, op.payment_processing_rate, op.delivery_marketplace_rate,
    op.utilities_monthly, op.software_security_rentals_monthly, op.marketing_monthly, op.other_fixed_monthly
  from public.oo_stores st
  left join public.oo_occupancy_costs oc on oc.store_id = st.id
  left join public.oo_operating_costs op on op.store_id = st.id
  where st.id = p_store_id
),
workers as (
  select coalesce(jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object(
      'id', w.worker_id,
      'name', w.name,
      'displayName', w.display_name,
      'contactLabel', w.contact_label,
      'role', w.role,
      'hourlyRate', w.hourly_rate,
      'employmentType', w.employment_type,
      'skills', w.skills,
      'preferredWeeklyHours', w.preferred_weekly_hours,
      'maxWeeklyHours', w.max_weekly_hours,
      'regularAvailability', coalesce((select jsonb_agg(jsonb_build_object(
        'weekday', r.weekday, 'start', to_char(r.start_time, 'HH24:MI'), 'end', to_char(r.end_time, 'HH24:MI'), 'available', r.available
      ) order by r.weekday, r.start_time) from public.oo_worker_availability_rules r where r.store_id = w.store_id and r.worker_id = w.worker_id), '[]'::jsonb),
      'availabilityExceptions', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
        'id', e.id, 'start', e.starts_at, 'end', e.ends_at, 'available', e.available, 'reason', e.reason, 'source', e.source
      )) order by e.starts_at) from public.oo_worker_availability_exceptions e where e.store_id = w.store_id and e.worker_id = w.worker_id), '[]'::jsonb)
    )) order by w.worker_id
  ), '[]'::jsonb) value
  from public.oo_workers w where w.store_id = p_store_id
),
shifts as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', shift_id, 'workerId', worker_id, 'start', starts_at, 'end', ends_at,
    'role', role, 'requiredSkills', required_skills, 'status', status
  )) order by starts_at, shift_id), '[]'::jsonb) value
  from public.oo_shifts where store_id = p_store_id
),
time_entries as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', id, 'workerId', worker_id, 'shiftId', shift_id, 'clockIn', clock_in, 'clockOut', clock_out, 'source', source
  )) order by clock_in), '[]'::jsonb) value
  from public.oo_time_entries where store_id = p_store_id
),
incidents as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', id, 'type', type, 'status', status, 'createdAt', created_at, 'resolvedAt', resolved_at,
    'workerId', worker_id, 'shiftId', shift_id, 'inventoryItemId', inventory_item_id, 'reason', reason
  )) order by created_at), '[]'::jsonb) value
  from public.oo_incidents where store_id = p_store_id
),
current_incident as (
  select coalesce((select jsonb_strip_nulls(jsonb_build_object(
    'type', i.type, 'workerId', i.worker_id, 'shiftId', i.shift_id, 'reason', i.reason
  )) from public.oo_incidents i
    where i.store_id = p_store_id and i.status = 'open' and i.type = 'worker_unavailable'
    order by i.created_at desc limit 1), 'null'::jsonb) value
),
suppliers as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', supplier_id, 'name', name, 'contactLabel', contact_label, 'defaultLeadTimeDays', default_lead_time_days
  )) order by supplier_id), '[]'::jsonb) value
  from public.oo_suppliers where store_id = p_store_id and active
),
inventory as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', i.item_id, 'name', i.name, 'category', i.category, 'unit', i.base_unit,
    'onHand', i.on_hand, 'parLevel', i.par_level, 'reorderPoint', i.reorder_point,
    'leadTimeDays', i.lead_time_days, 'supplierId', i.supplier_id,
    'lastPurchaseUnitCost', p.actual_unit_cost, 'marketReferenceKey', i.market_reference_key,
    'perishable', i.perishable, 'purchaseForm', i.purchase_form
  )) order by i.item_id), '[]'::jsonb) value
  from public.oo_inventory_items i
  left join public.oo_latest_store_purchase_costs p on p.store_id = i.store_id and p.item_id = i.item_id
  where i.store_id = p_store_id
),
purchases as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'supplierId', supplier_id, 'inventoryItemId', item_id, 'receivedAt', received_at,
    'quantity', quantity, 'unit', unit, 'totalCost', total_cost
  ) order by received_at), '[]'::jsonb) value
  from public.oo_purchase_receipts where store_id = p_store_id
),
purchase_orders as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', id, 'supplierId', supplier_id, 'inventoryItemId', item_id, 'createdAt', created_at,
    'expectedAt', expected_at, 'quantity', quantity, 'unit', unit,
    'estimatedUnitCost', estimated_unit_cost, 'status', status
  )) order by created_at), '[]'::jsonb) value
  from public.oo_purchase_orders where store_id = p_store_id
),
waste as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', id, 'inventoryItemId', item_id, 'recordedAt', recorded_at, 'quantity', quantity,
    'unit', unit, 'reason', reason, 'workerId', worker_id, 'shiftId', shift_id
  )) order by recorded_at), '[]'::jsonb) value
  from public.oo_waste_records where store_id = p_store_id
),
prep_items as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.prep_id, 'name', p.name, 'category', p.category,
    'outputQuantity', p.output_quantity, 'outputUnit', p.output_unit,
    'batchYieldRate', p.batch_yield_rate, 'active', p.active,
    'recipe', coalesce((select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'inventoryItemId', b.item_id, 'quantity', b.quantity, 'unit', b.unit, 'yieldRate', b.line_yield_rate
    )) order by b.id) from public.oo_prep_bom b where b.store_id = p.store_id and b.prep_id = p.prep_id), '[]'::jsonb)
  ) order by p.prep_id), '[]'::jsonb) value
  from public.oo_prep_items p where p.store_id = p_store_id and p.active
),
menu as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', m.menu_item_id, 'name', m.name, 'category', m.category, 'price', m.selling_price, 'active', m.active,
    'recipe', coalesce((select jsonb_agg(
      case when b.component_type = 'prep'
        then jsonb_build_object('prepItemId', b.component_id, 'quantity', b.quantity, 'unit', b.unit)
        else jsonb_strip_nulls(jsonb_build_object('inventoryItemId', b.component_id, 'quantity', b.quantity, 'unit', b.unit, 'yieldRate', b.line_yield_rate))
      end order by b.id
    ) from public.oo_menu_bom b where b.store_id = m.store_id and b.menu_item_id = m.menu_item_id), '[]'::jsonb)
  ) order by m.menu_item_id), '[]'::jsonb) value
  from public.oo_menu_items m where m.store_id = p_store_id and m.active
),
sales as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', ss.id, 'date', ss.business_date, 'hour', ss.hour, 'grossSales', ss.gross_sales,
    'netSales', ss.net_sales, 'orderCount', ss.order_count, 'source', ss.source,
    'itemSales', coalesce((select jsonb_agg(jsonb_build_object(
      'menuItemId', si.menu_item_id, 'quantity', si.quantity, 'netSales', si.net_sales
    ) order by si.menu_item_id) from public.oo_sales_items si where si.sales_snapshot_id = ss.id), '[]'::jsonb)
  )) order by ss.business_date, ss.hour nulls first), '[]'::jsonb) value
  from public.oo_sales_snapshots ss where ss.store_id = p_store_id
),
tasks as (
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', id, 'title', title, 'dueAt', due_at, 'shiftId', shift_id, 'workerId', worker_id, 'status', status
  )) order by due_at nulls last, id), '[]'::jsonb) value
  from public.oo_tasks where store_id = p_store_id
),
logs as (
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'createdAt', created_at, 'type', type, 'summary', summary, 'relatedIds', related_ids
  ) order by created_at), '[]'::jsonb) value
  from public.oo_store_log where store_id = p_store_id
)
select case when not exists(select 1 from s) then null else jsonb_build_object(
  'storeId', p_store_id,
  'persistedAt', now(),
  'business', (select jsonb_strip_nulls(jsonb_build_object(
    'name', name,
    'industry', industry,
    'market', market_id,
    'currency', currency_code,
    'employeeCount', (select count(*) from public.oo_workers w where w.store_id = p_store_id and w.active),
    'targetLaborRatio', targets->'targetLaborRatio',
    'targetFoodCostRatio', targets->'targetFoodCostRatio',
    'weeklyHourWarningThreshold', targets->'weeklyHourWarningThreshold',
    'expectedSalesByDay', coalesce(targets->'expectedSalesByDay', '{}'::jsonb),
    'peakWindows', coalesce(targets->'peakWindows', '[]'::jsonb),
    'timezone', timezone,
    'openingHours', opening_hours,
    'occupancy', case when base_rent_monthly is null then null else jsonb_strip_nulls(jsonb_build_object(
      'baseRentMonthly', base_rent_monthly, 'recurringFeesMonthly', recurring_fees_monthly,
      'deposit', deposit, 'leaseStart', lease_start, 'leaseEnd', lease_end,
      'nextEscalationDate', next_escalation_date, 'nextEscalationRate', next_escalation_rate
    )) end,
    'operatingCosts', jsonb_build_object(
      'variableRates', jsonb_build_object(
        'packagingAndConsumables', coalesce(packaging_consumables_rate, 0),
        'paymentProcessing', coalesce(payment_processing_rate, 0),
        'deliveryAndMarketplace', coalesce(delivery_marketplace_rate, 0)
      ),
      'fixedMonthly', jsonb_build_object(
        'utilities', coalesce(utilities_monthly, 0),
        'softwareSecurityRentals', coalesce(software_security_rentals_monthly, 0),
        'marketing', coalesce(marketing_monthly, 0),
        'other', coalesce(other_fixed_monthly, 0)
      )
    ),
    'policies', policies
  )) from s),
  'workers', (select value from workers),
  'shifts', (select value from shifts),
  'timeEntries', (select value from time_entries),
  'incidents', (select value from incidents),
  'sales', (select value from sales),
  'menu', (select value from menu),
  'prepItems', (select value from prep_items),
  'inventory', (select value from inventory),
  'suppliers', (select value from suppliers),
  'purchases', (select value from purchases),
  'purchaseOrders', (select value from purchase_orders),
  'waste', (select value from waste),
  'tasks', (select value from tasks),
  'log', (select value from logs),
  'currentIncident', (select value from current_incident)
) end;
$$;

revoke all on function public.oo_replace_working_store_projection(jsonb) from public;
revoke all on function public.oo_get_working_store_projection(text) from public;
