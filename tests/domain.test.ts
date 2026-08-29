import { describe, expect, it } from "vitest";
import { dispatchApplicationAction, getResponseOptions } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import { calculateImpact, collectWarnings, estimatedPayroll, weeklyHours } from "@/domain/impact";

describe("OwnerOps deterministic domain", () => {
  it("uses the diner profile by default and preserves fixture identity across profiles", () => {
    const diner = createDemoState();
    const pizza = createDemoState("pizza");
    expect(diner.business.industry).toBe("diner");
    expect(diner.business.name).toBe("Good Shift Diner");
    expect(pizza.business.industry).toBe("pizza");
    expect(pizza.business.name).toBe("Slice House");
    expect(pizza.workers.map((worker) => worker.id)).toEqual(diner.workers.map((worker) => worker.id));
    expect(pizza.shifts.map((shift) => shift.id)).toEqual(diner.shifts.map((shift) => shift.id));
    expect(estimatedPayroll(pizza.workers, pizza.shifts)).toBe(estimatedPayroll(diner.workers, diner.shifts));
  });

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

  it("compares replacement wage against the originally assigned worker", () => {
    const original = createDemoState();
    const minsoo = original.workers.find((worker) => worker.id === "minsoo")!;
    const hana = original.workers.find((worker) => worker.id === "hana")!;
    const state = dispatchApplicationAction(original, { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18" });
    const hanaOption = getResponseOptions(state).find((option) => option.changes[0]?.workerId === "hana")!;
    expect(hanaOption.impact.payrollDelta).toBe((hana.hourlyRate - minsoo.hourlyRate) * 4);
    expect(hanaOption.impact.payrollDelta).toBe(-2_000);
  });

  it("ranks exactly three viable recovery scenarios", () => {
    const state = dispatchApplicationAction(createDemoState(), { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18" });
    const options = getResponseOptions(state);
    expect(options).toHaveLength(3);
    expect(options.every((option) => option.impact.uncoveredPeakMinutes === 0)).toBe(true);
    expect(options[0].impact.payrollDelta).toBeLessThanOrEqual(options[2].impact.payrollDelta);
  });

  it("rebuilds the full week with many changes and exposes qualified capacity", () => {
    const state = createDemoState("sushi", "jp-tokyo");
    const options = getResponseOptions(state, { objective: "rebuild_week", maxWeeklyHours: 40, prioritize: "cost", allowCapacityGap: true });
    expect(options).toHaveLength(3);
    expect(options[0].kind).toBe("week_rebuild");
    expect(options[0].changes.length).toBeGreaterThan(3);
    expect(options[0].impact.payrollDelta).toBeLessThan(0);
    expect(options[0].impact.uncoveredPeakMinutes).toBe(0);
    expect(options[0].capacityGap).toMatchObject({ role: "manager", hoursPerWeek: 8 });
  });

  it("preserves live work when only the industry is corrected but resets on market change", () => {
    let state = dispatchApplicationAction(createDemoState("pizza", "jp-tokyo"), { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18" });
    const scenario = getResponseOptions(state)[0];
    state = dispatchApplicationAction(state, { type: "preview_scenario", scenarioId: scenario.id });
    const previewId = state.preview?.id;
    state = dispatchApplicationAction(state, { type: "create_schedule_draft", preset: "demo", industry: "sushi" });
    expect(state.business.industry).toBe("sushi");
    expect(state.business.market).toBe("jp-tokyo");
    expect(state.incident?.workerId).toBe("minsoo");
    expect(state.preview?.id).toBe(previewId);
    state = dispatchApplicationAction(state, { type: "create_schedule_draft", preset: "demo", market: "us-nyc" });
    expect(state.business.market).toBe("us-nyc");
    expect(state.incident).toBeNull();
    expect(state.preview).toBeNull();
    expect(state.workers.find((worker) => worker.id === "minsoo")?.name).toBe("Mason");
  });

  it("keeps preview separate until matching id and version are applied", () => {
    let state = dispatchApplicationAction(createDemoState(), { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18" });
    const scenario = getResponseOptions(state)[0];
    state = dispatchApplicationAction(state, { type: "preview_scenario", scenarioId: scenario.id });
    expect(state.shifts.find((shift) => shift.id === "fri-minsoo-18")?.status).toBe("uncovered");
    expect(() => dispatchApplicationAction(state, { type: "apply_preview", previewId: state.preview!.id, version: 99 })).toThrow(/stale/i);
    expect(() => dispatchApplicationAction(state, { type: "apply_preview", previewId: state.preview!.id, version: state.preview!.version })).toThrow(/review required/i);
    state = dispatchApplicationAction(state, { type: "set_activity", activity: { state: "reviewed", message: "Agent reviewed live plan." } });
    state = dispatchApplicationAction(state, { type: "apply_preview", previewId: state.preview!.id, version: state.preview!.version });
    expect(state.preview).toBeNull();
    expect(state.incident).toBeNull();
    expect(state.shifts.find((shift) => shift.id === "fri-minsoo-18")?.workerId).toBe(scenario.changes[0].workerId);
  });
});
