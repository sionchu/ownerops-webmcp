import { describe, expect, it } from "vitest";
import { dispatchApplicationAction, getResponseOptions } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import { collectWarnings } from "@/domain/impact";
import { businessTimestamp } from "@/domain/local-time";
import { scheduleCostSummary } from "@/domain/schedule-cost";
import { storeCostMetrics } from "@/domain/store-ops";

function withTransportOffsets(state: ReturnType<typeof createDemoState>) {
  return {
    ...state,
    shifts: state.shifts.map((shift) => ({ ...shift, start: `${shift.start}+00:00`, end: `${shift.end}+00:00` })),
    timeEntries: (state.timeEntries ?? []).map((entry) => ({ ...entry, clockIn: `${entry.clockIn}+00:00`, clockOut: entry.clockOut ? `${entry.clockOut}+00:00` : undefined })),
  };
}

describe("business-local time", () => {
  it("ignores DB transport offsets for the store wall clock", () => {
    const expected = businessTimestamp("2026-08-28T18:00:00");
    expect(businessTimestamp("2026-08-28T18:00:00+00:00")).toBe(expected);
    expect(businessTimestamp("2026-08-28T18:00:00+09:00")).toBe(expected);
    expect(businessTimestamp("2026-08-28T18:00:00-04:00")).toBe(expected);
  });

  it("reports 120 minutes for the Friday call-out and zero after replacement", () => {
    const state = withTransportOffsets(createDemoState("coffee", "kr-seoul"));
    expect(collectWarnings(state).uncoveredPeakMinutes).toBe(0);
    const callout = dispatchApplicationAction(state, { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "test" });
    expect(collectWarnings(callout).uncoveredPeakMinutes).toBe(120);
    expect(getResponseOptions(callout)[0].impact.uncoveredPeakMinutes).toBe(0);
  });

  it("reconciles NYC weekly schedule wage with the operating P&L", () => {
    const state = withTransportOffsets(createDemoState("coffee", "us-nyc"));
    const summary = scheduleCostSummary(state, { start: "2026-08-24T00:00:00", end: "2026-08-31T00:00:00" });
    expect(summary.scheduledHours).toBe(154);
    expect(summary.scheduledWage).toBeCloseTo(3344.5);
    expect(storeCostMetrics(state).laborCost).toBeCloseTo(summary.scheduledWage);
  });
});
