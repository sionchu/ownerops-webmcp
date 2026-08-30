import type { AppState } from "./model";

export type ScheduleHistorySource = "demo" | "import" | "pos";
export type ScheduleHistorySalesMode = "actual" | "forecast";

export type ScheduleHistoryWeek = {
  storeId: string;
  weekStart: string;
  shifts: AppState["shifts"];
  sales: NonNullable<AppState["sales"]>;
  timeEntries: NonNullable<AppState["timeEntries"]>;
  source: ScheduleHistorySource;
  salesMode: ScheduleHistorySalesMode;
  updatedAt?: string;
};

/**
 * Project one archived/forecast week into the schedule selectors only.
 * This is intentionally read-only and never becomes the canonical working StoreState.
 */
export function scheduleHistoryState(base: AppState, week: ScheduleHistoryWeek): AppState {
  return {
    ...base,
    shifts: structuredClone(week.shifts),
    sales: structuredClone(week.sales),
    timeEntries: structuredClone(week.timeEntries),
    incident: null,
    preview: null,
    storePlan: null,
    business: {
      ...base.business,
      peakWindows: [],
    },
  };
}
