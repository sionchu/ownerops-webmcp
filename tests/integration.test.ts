import { describe, expect, it } from "vitest";
import { dispatchApplicationAction } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import { applyChanges, calculateImpact } from "@/domain/impact";
import type { AppState } from "@/domain/model";
import { createToolExecutors } from "@/webmcp/register-tools";
import { registerOwnerOpsTools } from "@/webmcp/register-tools";

function bridge(initial = createDemoState()) {
  let state: AppState = initial;
  return {
    getState: () => state,
    runAction: (action: Parameters<typeof dispatchApplicationAction>[1]) => (state = dispatchApplicationAction(state, action)),
  };
}

describe("shared UI and WebMCP application path", () => {
  it("equivalent UI and tool actions produce equivalent canonical state", () => {
    const ui = dispatchApplicationAction(createDemoState(), { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Last-minute absence" });
    const web = bridge();
    createToolExecutors(web).markWorkerUnavailable({ workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Last-minute absence" });
    expect(web.getState()).toEqual(ui);
  });

  it("creates a profile-aware demo draft without changing stable fixture ids", () => {
    const web = bridge();
    const before = web.getState();
    const result = createToolExecutors(web).createScheduleDraft({ preset: "demo", industry: "pizza" });
    expect(result.business.industry).toBe("pizza");
    expect(result.business.industryLabel).toBe("Neighborhood pizza shop");
    expect(result.business.name).toBe("Slice House");
    expect(result.workers.find((worker) => worker.id === "jiyoung")?.roleLabel).toBe("Counter crew");
    expect(result.shifts.find((shift) => shift.id === "fri-minsoo-18")?.roleLabel).toBe("Counter crew");
    expect(web.getState().workers.map((worker) => worker.id)).toEqual(before.workers.map((worker) => worker.id));
    expect(web.getState().shifts.map((shift) => shift.id)).toEqual(before.shifts.map((shift) => shift.id));
  });

  it("evaluate_current_plan reads a human-edited live state", () => {
    const web = bridge();
    web.runAction({ type: "reassign_shift", shiftId: "mon-minsoo-open", workerId: "hana", targetDay: "2026-08-25" });
    const result = createToolExecutors(web).evaluateCurrentPlan();
    expect(result.impact.workerWeeklyHours.hana).toBe(34);
    expect(result.impact.workerWeeklyHours.minsoo).toBe(18);
  });

  it("validates the complete pizza-to-Hana reviewed staffing flow", () => {
    const web = bridge();
    const executors = createToolExecutors(web);
    const draft = executors.createScheduleDraft({ preset: "demo", industry: "pizza" });
    expect(draft.business.industry).toBe("pizza");
    expect(draft.business.name).toBe("Slice House");
    expect(web.getState().workers.some((worker) => worker.id === "minsoo")).toBe(true);
    expect(web.getState().workers.some((worker) => worker.id === "hana")).toBe(true);
    expect(web.getState().shifts.some((shift) => shift.id === "fri-minsoo-18")).toBe(true);

    executors.markWorkerUnavailable({ workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Last-minute absence" });
    expect(web.getState().incident).toMatchObject({ workerId: "minsoo", shiftId: "fri-minsoo-18" });
    expect(web.getState().shifts.find((shift) => shift.id === "fri-minsoo-18")).toMatchObject({ workerId: null, status: "uncovered" });
    expect(web.getState().preview).toBeNull();

    const options = executors.getResponseOptions();
    expect(options.count).toBe(3);
    const bestOption = options.options[0];
    const proposed = executors.previewStaffingChange({ scenarioId: bestOption.id });
    expect(proposed.preview).toMatchObject({ scenarioId: bestOption.id, version: 1 });
    expect(web.getState().shifts.find((shift) => shift.id === "fri-minsoo-18")).toMatchObject({ workerId: null, status: "uncovered" });
    const proposedState = executors.getBusinessState();
    expect(proposedState.shifts.find((shift) => shift.id === "fri-minsoo-18")?.workerId).toBe(bestOption.changes[0].workerId);

    web.runAction({ type: "reassign_shift", shiftId: "fri-minsoo-18", workerId: "hana" });
    expect(web.getState().preview?.version).toBe(2);
    expect(web.getState().preview?.changes[0]?.workerId).toBe("hana");
    expect(web.getState().activity.state).toBe("reviewNeeded");
    expect(web.getState().shifts.find((shift) => shift.id === "fri-minsoo-18")).toMatchObject({ workerId: null, status: "uncovered" });

    const editedState = executors.getBusinessState();
    expect(editedState.shifts.find((shift) => shift.id === "fri-minsoo-18")?.workerId).toBe("hana");
    const previewBeforeReview = web.getState().preview!;
    const beforeRejectedApply = JSON.stringify(web.getState());
    expect(() => executors.applyStaffingChange({ previewId: previewBeforeReview.id, version: previewBeforeReview.version })).toThrow(/review required/i);
    expect(JSON.stringify(web.getState())).toBe(beforeRejectedApply);

    const expectedImpact = calculateImpact(web.getState(), applyChanges(web.getState().shifts, previewBeforeReview.changes), web.getState().shifts);
    const reviewed = executors.evaluateCurrentPlan();
    expect(reviewed.impact).toEqual(expectedImpact);
    expect(web.getState().activity.state).toBe("reviewed");
    expect(web.getState().preview?.changes[0]?.workerId).toBe("hana");
    expect(web.getState().shifts.find((shift) => shift.id === "fri-minsoo-18")?.workerId).toBeNull();

    const preview = web.getState().preview;
    expect(preview).not.toBeNull();
    const applied = executors.applyStaffingChange({ previewId: preview!.id, version: preview!.version });
    expect(applied.preview).toBeNull();
    expect(web.getState().shifts.find((shift) => shift.id === "fri-minsoo-18")).toMatchObject({ workerId: "hana", status: "scheduled" });
    expect(web.getState().incident).toBeNull();
    expect(web.getState().activity.state).toBe("applied");
  });

  it("registers the exact eight-tool WebMCP contract with JSON Schemas", async () => {
    const web = bridge();
    const registrations: Array<{ tool: { name: string; inputSchema?: unknown; annotations?: { readOnlyHint?: boolean } }; signal?: AbortSignal }> = [];
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { modelContext: { registerTool: async (tool: { name: string; inputSchema?: unknown; annotations?: { readOnlyHint?: boolean } }, options?: { signal?: AbortSignal }) => { registrations.push({ tool, signal: options?.signal }); } } },
    });
    const registration = registerOwnerOpsTools(web);
    await Promise.resolve();
    expect(registrations.map(({ tool }) => tool.name)).toEqual([
      "get_business_state",
      "create_schedule_draft",
      "mark_worker_unavailable",
      "get_response_options",
      "preview_staffing_change",
      "evaluate_current_plan",
      "apply_staffing_change",
      "import_schedule_snapshot",
    ]);
    expect(registrations.every(({ tool }) => typeof tool.inputSchema === "object")).toBe(true);
    const draftSchema = registrations.find(({ tool }) => tool.name === "create_schedule_draft")?.tool.inputSchema as { properties?: { industry?: { enum?: unknown[] } }; required?: unknown[] };
    expect(draftSchema.properties?.industry?.enum).toEqual(["diner", "pizza", "coffee", "salon", "sushi", "curry"]);
    expect(draftSchema.required).toEqual(["preset"]);
    expect(registrations).toHaveLength(8);
    expect(registrations.filter(({ tool }) => tool.annotations?.readOnlyHint === true)).toHaveLength(3);
    expect(registrations.filter(({ tool }) => tool.annotations?.readOnlyHint === false)).toHaveLength(5);
    registration.dispose();
    expect(registrations.every(({ signal }) => signal?.aborted)).toBe(true);
    delete (globalThis as { document?: unknown }).document;
  });

  it("rejects invalid worker or shift ids without mutating state", () => {
    const web = bridge();
    const before = JSON.stringify(web.getState());
    const executors = createToolExecutors(web);
    expect(() => executors.markWorkerUnavailable({ workerId: "missing-worker", shiftId: "fri-minsoo-18" })).toThrow(/match/);
    expect(() => executors.markWorkerUnavailable({ workerId: "minsoo", shiftId: "missing-shift" })).toThrow(/match/);
    expect(() => executors.previewStaffingChange({ changes: [{ shiftId: "missing-shift", workerId: "minsoo" }] })).toThrow(/not found/);
    expect(() => executors.previewStaffingChange({ changes: [{ shiftId: "fri-minsoo-18", workerId: "missing-worker" }] })).toThrow(/not found/);
    expect(() => executors.createScheduleDraft({ preset: "demo", industry: "hospital" })).toThrow(/unsupported industry/i);
    expect(JSON.stringify(web.getState())).toBe(before);
  });
});
