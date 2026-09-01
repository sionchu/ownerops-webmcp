import { describe, expect, it } from "vitest";
import { createDemoState } from "@/domain/fixtures";
import { scheduleHistoryState, type ScheduleHistoryWeek } from "@/domain/schedule-history";
import { scheduleCostSummary } from "@/domain/schedule-cost";
import { storeCostMetrics } from "@/domain/store-ops";

describe("schedule history read model", () => {
  it("projects an archived week without contaminating the working StoreState", () => {
    const base = createDemoState("coffee", "kr-seoul");
    const currentMetrics = storeCostMetrics(base);
    const shifts = base.shifts.map((shift) => ({ ...shift, id: `hist-${shift.id}`, start: shift.start.replace("2026-08-", "2026-07-"), end: shift.end.replace("2026-08-", "2026-07-") }));
    const sales = (base.sales ?? []).map((sale) => ({ ...sale, id: `hist-${sale.id}`, date: sale.date.replace("2026-08-", "2026-07-"), itemSales: [] }));
    const timeEntries = shifts.map((shift) => ({ id: `time-${shift.id}`, workerId: shift.workerId!, shiftId: shift.id, clockIn: shift.start, clockOut: shift.end, source: "demo" as const }));
    const week: ScheduleHistoryWeek = { storeId: "demo-kr-seoul-coffee", weekStart: "2026-07-20", shifts, sales, timeEntries, source: "demo", salesMode: "actual" };
    const projected = scheduleHistoryState(base, week);
    expect(base.shifts[0].id).not.toMatch(/^hist-/);
    expect(projected.shifts[0].id).toMatch(/^hist-/);
    expect(projected.preview).toBeNull();
    expect(projected.storePlan).toBeNull();
    const summary = scheduleCostSummary(projected, { start: "2026-07-20T00:00:00", end: "2026-07-27T00:00:00" });
    expect(summary.scheduledHours).toBeGreaterThan(0);
    expect(summary.actualWage).toBeGreaterThan(0);
    expect(summary.actualSalesBasis).toBeGreaterThan(0);
    expect(storeCostMetrics(base)).toEqual(currentMetrics);
  });

  it("keeps forecast history explicitly separate from the editable current week", () => {
    const base = createDemoState("coffee", "kr-seoul");
    const originalShiftIds = base.shifts.map((shift) => shift.id);
    const future: ScheduleHistoryWeek = {
      storeId: "demo-kr-seoul-coffee",
      weekStart: "2026-09-07",
      shifts: base.shifts.map((shift) => ({
        ...shift,
        id: `forecast-${shift.id}`,
        start: shift.start.replace("2026-08-", "2026-09-"),
        end: shift.end.replace("2026-08-", "2026-09-"),
      })),
      sales: (base.sales ?? []).map((sale) => ({
        ...sale,
        id: `forecast-${sale.id}`,
        date: sale.date.replace("2026-08-", "2026-09-"),
      })),
      timeEntries: [],
      source: "demo",
      salesMode: "forecast",
    };

    const projected = scheduleHistoryState(base, future);
    expect(future.salesMode).toBe("forecast");
    expect(projected.shifts.every((shift) => shift.id.startsWith("forecast-"))).toBe(true);
    expect(projected.timeEntries).toHaveLength(0);
    expect(base.shifts.map((shift) => shift.id)).toEqual(originalShiftIds);
    expect(base.preview).toBeNull();
    expect(base.storePlan).toBeNull();
  });
});
