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
