import { describe, expect, it } from "vitest";
import { dispatchApplicationAction } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
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

  it("evaluate_current_plan reads a human-edited live state", () => {
    const web = bridge();
    web.runAction({ type: "reassign_shift", shiftId: "mon-minsoo-open", workerId: "hana", targetDay: "2026-08-25" });
    const result = createToolExecutors(web).evaluateCurrentPlan();
    expect(result.impact.workerWeeklyHours.hana).toBe(34);
    expect(result.impact.workerWeeklyHours.minsoo).toBe(18);
  });

  it("evaluates the human-edited preview and preserves preview/apply semantics", () => {
    const web = bridge();
    const executors = createToolExecutors(web);
    executors.markWorkerUnavailable({ workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Last-minute absence" });
    const options = executors.getResponseOptions();
    expect(options.count).toBe(3);
    const proposed = executors.previewStaffingChange({ scenarioId: options.options[0].id });
    expect(proposed.preview?.changes[0]?.workerId).toBe("jiyoung");
    const proposedState = executors.getBusinessState();
    expect(proposedState.workers.find((worker) => worker.id === "jiyoung")?.weeklyHours).toBe(32);
    expect(proposedState.metrics.projectedLaborCost).toBe(2_026_000);
    expect(proposedState.shifts.find((shift) => shift.id === "fri-minsoo-18")?.workerId).toBe("jiyoung");

    web.runAction({ type: "reassign_shift", shiftId: "fri-minsoo-18", workerId: "hana" });
    expect(web.getState().activity.state).toBe("reviewNeeded");
    expect(web.getState().shifts.find((shift) => shift.id === "fri-minsoo-18")?.workerId).toBeNull();

    const editedState = executors.getBusinessState();
    expect(editedState.workers.find((worker) => worker.id === "hana")?.weeklyHours).toBe(32);
    expect(editedState.metrics.projectedLaborCost).toBe(2_028_000);
    expect(editedState.shifts.find((shift) => shift.id === "fri-minsoo-18")?.workerId).toBe("hana");

    const reviewed = executors.evaluateCurrentPlan();
    expect(reviewed.impact.workerWeeklyHours.hana).toBe(32);
    expect(reviewed.impact.payrollDelta).toBe(50_000);
    expect(web.getState().activity.state).toBe("reviewed");

    const preview = web.getState().preview;
    expect(preview).not.toBeNull();
    const applied = executors.applyStaffingChange({ previewId: preview!.id, version: preview!.version });
    expect(applied.preview).toBeNull();
    expect(web.getState().shifts.find((shift) => shift.id === "fri-minsoo-18")?.workerId).toBe("hana");
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
    expect(registrations.find(({ tool }) => tool.name === "evaluate_current_plan")?.tool.annotations?.readOnlyHint).toBe(true);
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
    expect(JSON.stringify(web.getState())).toBe(before);
  });
});
