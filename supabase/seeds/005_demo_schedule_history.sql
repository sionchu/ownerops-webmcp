-- Three-month demo schedule history for the five DB-backed coffee stores.
-- Source remains DEMO. July/August archived weeks include complete demo time entries;
-- September is forecast/planned schedule data. Current working StoreState is not modified.

with target_weeks as (
  select
    week_start::date,
    case when week_start::date < date '2026-08-24' then 'actual' else 'forecast' end as sales_mode,
    (0.90 + ((((week_start::date - date '2026-06-29') / 7)::int % 6) * 0.025))::numeric as sales_scale
  from generate_series(date '2026-06-29', date '2026-09-28', interval '7 days') week_start
),
base_shifts as (
  select
    s.store_id, s.shift_id, s.worker_id, s.starts_at, s.ends_at, s.role, s.status,
    row_number() over (partition by s.store_id order by s.starts_at, s.shift_id) as seq
  from public.oo_shifts s
  where s.store_id in (
    'demo-kr-seoul-coffee', 'demo-us-nyc-coffee', 'demo-jp-tokyo-coffee',
    'demo-es-madrid-coffee', 'demo-cn-shanghai-coffee'
  )
    and s.starts_at::date between date '2026-08-24' and date '2026-08-30'
),
base_sales as (
  select store_id, business_date, gross_sales, net_sales, order_count
  from public.oo_sales_snapshots
  where store_id in (
    'demo-kr-seoul-coffee', 'demo-us-nyc-coffee', 'demo-jp-tokyo-coffee',
    'demo-es-madrid-coffee', 'demo-cn-shanghai-coffee'
  )
    and business_date between date '2026-08-24' and date '2026-08-30'
),
stores as (
  select id
  from public.oo_stores
  where id in (
    'demo-kr-seoul-coffee', 'demo-us-nyc-coffee', 'demo-jp-tokyo-coffee',
    'demo-es-madrid-coffee', 'demo-cn-shanghai-coffee'
  )
)
insert into public.oo_schedule_history_weeks(
  store_id, week_start, shifts, sales, time_entries, source, sales_mode, updated_at
)
select
  st.id,
  tw.week_start,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', 'hist-' || to_char(tw.week_start, 'YYYYMMDD') || '-' || bs.shift_id,
      'workerId', bs.worker_id,
      'start', to_char((bs.starts_at at time zone 'UTC') + ((tw.week_start - date '2026-08-24') * interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS'),
      'end', to_char((bs.ends_at at time zone 'UTC') + ((tw.week_start - date '2026-08-24') * interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS'),
      'role', bs.role,
      'status', bs.status
    ) order by bs.starts_at, bs.shift_id)
    from base_shifts bs where bs.store_id = st.id
  ), '[]'::jsonb),
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', 'hist-sales-' || to_char(tw.week_start, 'YYYYMMDD') || '-' || to_char(bs.business_date, 'ID'),
      'date', to_char(tw.week_start + (bs.business_date - date '2026-08-24'), 'YYYY-MM-DD'),
      'grossSales', round(bs.gross_sales * tw.sales_scale, 2),
      'netSales', round(bs.net_sales * tw.sales_scale, 2),
      'orderCount', greatest(1, round(bs.order_count * tw.sales_scale)::int),
      'itemSales', '[]'::jsonb,
      'source', 'demo'
    ) order by bs.business_date)
    from base_sales bs where bs.store_id = st.id
  ), '[]'::jsonb),
  case when tw.week_start < date '2026-08-24' then coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', 'hist-time-' || to_char(tw.week_start, 'YYYYMMDD') || '-' || bs.shift_id,
      'workerId', bs.worker_id,
      'shiftId', 'hist-' || to_char(tw.week_start, 'YYYYMMDD') || '-' || bs.shift_id,
      'clockIn', to_char(
        (bs.starts_at at time zone 'UTC') + ((tw.week_start - date '2026-08-24') * interval '1 day')
          + (((bs.seq % 3)::int - 1) * interval '4 minutes'),
        'YYYY-MM-DD"T"HH24:MI:SS'
      ),
      'clockOut', to_char(
        (bs.ends_at at time zone 'UTC') + ((tw.week_start - date '2026-08-24') * interval '1 day')
          + (((bs.seq % 5)::int - 2) * interval '3 minutes'),
        'YYYY-MM-DD"T"HH24:MI:SS'
      ),
      'source', 'demo'
    ) order by bs.starts_at, bs.shift_id)
    from base_shifts bs where bs.store_id = st.id
  ), '[]'::jsonb) else '[]'::jsonb end,
  'demo',
  tw.sales_mode,
  now()
from stores st
cross join target_weeks tw
on conflict (store_id, week_start) do update set
  shifts = excluded.shifts,
  sales = excluded.sales,
  time_entries = excluded.time_entries,
  source = excluded.source,
  sales_mode = excluded.sales_mode,
  updated_at = now();
