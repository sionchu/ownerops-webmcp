import type { ScheduleHistoryWeek } from "@/domain/schedule-history";
import { isSupabaseConfigured, supabaseSelect } from "./supabase-rest";

type ScheduleHistoryRow = {
  store_id: string;
  week_start: string;
  shifts: ScheduleHistoryWeek["shifts"];
  sales: ScheduleHistoryWeek["sales"];
  time_entries: ScheduleHistoryWeek["timeEntries"];
  source: ScheduleHistoryWeek["source"];
  sales_mode: ScheduleHistoryWeek["salesMode"];
  updated_at?: string;
};

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function loadScheduleHistory(storeId: string, from: string, to: string): Promise<ScheduleHistoryWeek[]> {
  if (!isSupabaseConfigured() || !isIsoDate(from) || !isIsoDate(to) || from >= to) return [];
  const query = [
    "select=store_id,week_start,shifts,sales,time_entries,source,sales_mode,updated_at",
    `store_id=eq.${encodeURIComponent(storeId)}`,
    `week_start=gte.${encodeURIComponent(from)}`,
    `week_start=lt.${encodeURIComponent(to)}`,
    "order=week_start.asc",
  ].join("&");
  const rows = await supabaseSelect<ScheduleHistoryRow>("oo_schedule_history_weeks", query);
  return rows.map((row) => ({
    storeId: row.store_id,
    weekStart: row.week_start,
    shifts: Array.isArray(row.shifts) ? row.shifts : [],
    sales: Array.isArray(row.sales) ? row.sales : [],
    timeEntries: Array.isArray(row.time_entries) ? row.time_entries : [],
    source: row.source,
    salesMode: row.sales_mode,
    updatedAt: row.updated_at,
  }));
}
