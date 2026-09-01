do $$
declare
  v_projection jsonb := jsonb_build_object(
    'storeId', 'demo-kr-seoul-coffee',
    'business', jsonb_build_object(
      'name', 'CI Corner Coffee',
      'industry', 'coffee',
      'market', 'kr-seoul',
      'currency', 'KRW',
      'employeeCount', 1,
      'targetLaborRatio', 0.22,
      'targetFoodCostRatio', 0.30,
      'weeklyHourWarningThreshold', 40,
      'expectedSalesByDay', jsonb_build_object('2026-08-28', 1000000),
      'peakWindows', jsonb_build_array(),
      'timezone', 'Asia/Seoul',
      'openingHours', jsonb_build_object(),
      'occupancy', jsonb_build_object(
        'baseRentMonthly', 3000000,
        'recurringFeesMonthly', 400000
      ),
      'operatingCosts', jsonb_build_object(
        'variableRates', jsonb_build_object(
          'packagingAndConsumables', 0.03,
          'paymentProcessing', 0.015,
          'deliveryAndMarketplace', 0.05
        ),
        'fixedMonthly', jsonb_build_object(
          'utilities', 500000,
          'softwareSecurityRentals', 100000,
          'marketing', 200000,
          'other', 100000
        )
      ),
      'policies', jsonb_build_object(
        'calloutPayPolicy', 'unpaid_hours',
        'externalContactMode', 'draft_only',
        'complianceMode', 'review_flags_only'
      )
    ),
    'workers', jsonb_build_array(jsonb_build_object(
      'id', 'minsoo',
      'name', '민수',
      'role', 'barista',
      'hourlyRate', 13000,
      'employmentType', 'hourly_part_time',
      'skills', jsonb_build_array('barista'),
      'preferredWeeklyHours', 24,
      'maxWeeklyHours', 32,
      'regularAvailability', jsonb_build_array(jsonb_build_object(
        'weekday', 5,
        'start', '17:00',
        'end', '23:00',
        'available', true
      )),
      'availabilityExceptions', jsonb_build_array()
    )),
    'shifts', jsonb_build_array(jsonb_build_object(
      'id', 'fri-minsoo-18',
      'workerId', 'minsoo',
      'start', '2026-08-28T18:00:00+09:00',
      'end', '2026-08-28T22:00:00+09:00',
      'role', 'barista',
      'status', 'scheduled'
    )),
    'timeEntries', jsonb_build_array(),
    'incidents', jsonb_build_array(),
    'sales', jsonb_build_array(jsonb_build_object(
      'id', 'sales-2026-08-28',
      'date', '2026-08-28',
      'grossSales', 1100000,
      'netSales', 1000000,
      'orderCount', 100,
      'source', 'demo',
      'itemSales', jsonb_build_array(jsonb_build_object(
        'menuItemId', 'latte',
        'quantity', 20,
        'netSales', 110000
      ))
    )),
    'suppliers', jsonb_build_array(jsonb_build_object(
      'id', 'supplier-food',
      'name', 'Fresh Supply',
      'defaultLeadTimeDays', 1
    )),
    'inventory', jsonb_build_array(jsonb_build_object(
      'id', 'whole-milk',
      'name', 'Whole milk',
      'category', 'dairy',
      'unit', 'l',
      'purchaseForm', 'packaged',
      'onHand', 10,
      'parLevel', 30,
      'reorderPoint', 12,
      'leadTimeDays', 1,
      'supplierId', 'supplier-food',
      'marketReferenceKey', 'milk',
      'perishable', true
    )),
    'purchases', jsonb_build_array(jsonb_build_object(
      'id', 'receipt-milk',
      'supplierId', 'supplier-food',
      'inventoryItemId', 'whole-milk',
      'receivedAt', '2026-08-28T07:00:00+09:00',
      'quantity', 20,
      'unit', 'l',
      'totalCost', 50000
    )),
    'purchaseOrders', jsonb_build_array(),
    'waste', jsonb_build_array(),
    'prepItems', jsonb_build_array(),
    'menu', jsonb_build_array(jsonb_build_object(
      'id', 'latte',
      'name', 'Caffè latte',
      'category', 'coffee',
      'price', 5500,
      'active', true,
      'recipe', jsonb_build_array(jsonb_build_object(
        'inventoryItemId', 'whole-milk',
        'quantity', 0.22,
        'unit', 'l'
      ))
    )),
    'tasks', jsonb_build_array(),
    'log', jsonb_build_array(),
    'currentIncident', null
  );
  v_loaded jsonb;
begin
  perform public.oo_replace_working_store_projection(v_projection);
  v_loaded := public.oo_get_working_store_projection('demo-kr-seoul-coffee');

  if v_loaded is null then
    raise exception 'working projection did not round-trip';
  end if;
  if v_loaded->'business'->>'name' <> 'CI Corner Coffee' then
    raise exception 'business name did not round-trip: %', v_loaded->'business'->>'name';
  end if;
  if jsonb_array_length(v_loaded->'workers') <> 1 then
    raise exception 'worker count mismatch';
  end if;
  if v_loaded->'workers'->0->>'id' <> 'minsoo' then
    raise exception 'worker id mismatch';
  end if;
  if jsonb_array_length(v_loaded->'shifts') <> 1 then
    raise exception 'shift count mismatch';
  end if;
  if v_loaded->'inventory'->0->>'id' <> 'whole-milk' then
    raise exception 'inventory mismatch';
  end if;
  if (v_loaded->'inventory'->0->>'lastPurchaseUnitCost')::numeric <> 2500 then
    raise exception 'actual purchase unit cost mismatch: %', v_loaded->'inventory'->0->>'lastPurchaseUnitCost';
  end if;
  if v_loaded->'menu'->0->'recipe'->0->>'inventoryItemId' <> 'whole-milk' then
    raise exception 'menu BOM mismatch';
  end if;
  if v_loaded->'sales'->0->'itemSales'->0->>'menuItemId' <> 'latte' then
    raise exception 'sales item mismatch';
  end if;
end;
$$;
