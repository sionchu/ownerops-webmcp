import { describe, expect, it } from "vitest";
import { dispatchApplicationAction, getResponseOptions } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import { calculateImpact, collectWarnings, estimatedPayroll, weeklyHours } from "@/domain/impact";

describe("OwnerOps deterministic domain", () => {
  it("calculates weekly hours from scheduled shifts", () => {
    const state = createDemoState();
    expect(weeklyHours(state.workers, state.shifts)).toMatchObject({ minsoo: 24, jiyoung: 28, younghee: 48, chulsoo: 26, hana: 28 });
  });

  it("estimates payroll and labor ratio from one calculation path", () => {
    const state = createDemoState();
    const payroll = estimatedPayroll(state.workers, state.shifts);
    const impact = calculateImpact(state);
    expect(payroll).toBe(2_030_000);
    expect(impact.projectedLaborCost).toBe(payroll);
    expect(impact.laborRatio).toBeCloseTo(payroll / 12_850_000, 8);
  });

  it("flags a role mismatch", () => {
    const state = createDemoState();
    const shifts = state.shifts.map((shift) => shift.id === "mon-younghee" ? { ...shift, workerId: "minsoo" } : shift);
    expect(collectWarnings(state, shifts).warnings.some((warning) => warning.code === "role_mismatch" && warning.shiftId === "mon-younghee")).toBe(true);
  });

  it("rejects an unavailable candidate from response options", () => {
    let state = dispatchApplicationAction(createDemoState(), { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18" });
    state = { ...state, workers: state.workers.map((worker) => worker.id === "jiyoung" ? { ...worker, availability: [{ start: "2026-08-28T18:00:00", end: "2026-08-28T22:00:00", available: false }] } : worker) };
    expect(getResponseOptions(state).map((option) => option.id).some((id) => id.endsWith("jiyoung"))).toBe(false);
  });

  it("reports peak coverage shortfall for the canonical absence", () => {
    const state = dispatchApplicationAction(createDemoState(), { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18" });
    const impact = calculateImpact(state);
    expect(impact.uncoveredPeakMinutes).toBe(120);
    expect(impact.warnings.some((warning) => warning.code === "peak_coverage")).toBe(true);
  });

  it("ranks exactly three viable recovery scenarios", () => {
    const state = dispatchApplicationAction(createDemoState(), { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18" });
    const options = getResponseOptions(state);
    expect(options).toHaveLength(3);
    expect(options.every((option) => option.impact.uncoveredPeakMinutes === 0)).toBe(true);
    expect(options[0].impact.payrollDelta).toBeLessThanOrEqual(options[2].impact.payrollDelta);
  });

  it("keeps preview separate until matching id and version are applied", () => {
    let state = dispatchApplicationAction(createDemoState(), { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18" });
    const scenario = getResponseOptions(state)[0];
    state = dispatchApplicationAction(state, { type: "preview_scenario", scenarioId: scenario.id });
    expect(state.shifts.find((shift) => shift.id === "fri-minsoo-18")?.status).toBe("uncovered");
    expect(() => dispatchApplicationAction(state, { type: "apply_preview", previewId: state.preview!.id, version: 99 })).toThrow(/stale/i);
    state = dispatchApplicationAction(state, { type: "apply_preview", previewId: state.preview!.id, version: state.preview!.version });
    expect(state.preview).toBeNull();
    expect(state.incident).toBeNull();
    expect(state.shifts.find((shift) => shift.id === "fri-minsoo-18")?.workerId).toBe(scenario.changes[0].workerId);
  });
});
