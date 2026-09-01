-- Read-only schedule history snapshots for month -> week -> day browsing.
-- This table is deliberately separate from the working StoreState projection:
-- historical/future demo weeks must never inflate current-week labor/P&L metrics.

create table if not exists public.oo_schedule_history_weeks (
  store_id text not null references public.oo_stores(id) on delete cascade,
  week_start date not null,
  shifts jsonb not null default '[]'::jsonb,
  sales jsonb not null default '[]'::jsonb,
  time_entries jsonb not null default '[]'::jsonb,
  source text not null default 'demo' check (source in ('demo', 'import', 'pos')),
  sales_mode text not null default 'actual' check (sales_mode in ('actual', 'forecast')),
  updated_at timestamptz not null default now(),
  primary key (store_id, week_start),
  check (jsonb_typeof(shifts) = 'array'),
  check (jsonb_typeof(sales) = 'array'),
  check (jsonb_typeof(time_entries) = 'array')
);

create index if not exists oo_schedule_history_weeks_store_range_idx
  on public.oo_schedule_history_weeks(store_id, week_start);

alter table public.oo_schedule_history_weeks enable row level security;
revoke all on public.oo_schedule_history_weeks from anon, authenticated;

comment on table public.oo_schedule_history_weeks is
  'Read-only archived/forecast schedule weeks. Not part of the current working StoreState or consequential WebMCP mutation path.';
