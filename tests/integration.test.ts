import { describe, expect, it } from "vitest";
import { dispatchApplicationAction } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import { applyChanges, calculateImpact } from "@/domain/impact";
import type { AppState } from "@/domain/model";
import type { UiLocale } from "@/i18n";
import { createToolExecutors } from "@/webmcp/register-tools";
import { registerOwnerOpsTools } from "@/webmcp/register-tools";

function bridge(initial = createDemoState()) {
  let state: AppState = initial;
  let locale: UiLocale = "en";
  return {
    getState: () => state,
    getLocale: () => locale,
    setLocale: (next: UiLocale) => { locale = next; },
    runAction: (action: Parameters<typeof dispatchApplicationAction>[1]) => (state = dispatchApplicationAction(state, action)),
  };
}

describe("shared UI and WebMCP application path", () => {
  it("equivalent UI and tool actions produce equivalent canonical state", () => {
    const ui = dispatchApplicationAction(createDemoState(), { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Last-minute absence" });
    const web = bridge();
    createToolExecutors(web).markWorkerUnavailable({ workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Last-minute absence", uiLocale: "en" });
    expect(web.getState()).toEqual(ui);
  });

  it("creates a profile-aware demo draft without changing stable fixture ids", () => {
    const web = bridge();
    const before = web.getState();
    const result = createToolExecutors(web).createScheduleDraft({ preset: "demo", industry: "pizza", uiLocale: "en" });
    expect(result.business.industry).toBe("pizza");
    expect(result.business.industryLabel).toBe("Neighborhood pizza shop");
    expect(result.business.name).toBe("Slice House");
    expect(result.workers.find((worker) => worker.id === "jiyoung")?.roleLabel).toBe("Counter crew");
    expect(result.shifts.find((shift) => shift.id === "fri-minsoo-18")?.roleLabel).toBe("Counter crew");
    expect(web.getState().workers.map((worker) => worker.id)).toEqual(before.workers.map((worker) => worker.id));
    expect(web.getState().shifts.map((shift) => shift.id)).toEqual(before.shifts.map((shift) => shift.id));
  });

  it("keeps UI language independent from labor market", () => {
    const web = bridge();
    const executors = createToolExecutors(web);
    const spanishNyc = executors.createScheduleDraft({ preset: "demo", industry: "pizza", market: "us-nyc", uiLocale: "es" });
    expect(spanishNyc.uiLocale).toBe("es");
    expect(spanishNyc.business.market).toBe("us-nyc");
    expect(spanishNyc.business.marketLabel).toBe("Nueva York");
    expect(spanishNyc.business.currency).toBe("USD");
    expect(spanishNyc.business.wageReference.hourly).toBe(17);
    expect(spanishNyc.workers.find((worker) => worker.id === "minsoo")?.name).toBe("Mason");
    expect(spanishNyc.workers.find((worker) => worker.id === "minsoo")?.demoContact).toContain("555");

    const japaneseUiSameMarket = executors.createScheduleDraft({ preset: "demo", industry: "salon", uiLocale: "ja" });
    expect(japaneseUiSameMarket.uiLocale).toBe("ja");
    expect(japaneseUiSameMarket.business.market).toBe("us-nyc");
    expect(japaneseUiSameMarket.business.marketLabel).toBe("ニューヨーク");
    expect(japaneseUiSameMarket.business.currency).toBe("USD");
    expect(japaneseUiSameMarket.workers.find((worker) => worker.id === "minsoo")?.name).toBe("Mason");

    const englishTokyo = executors.createScheduleDraft({ preset: "demo", market: "jp-tokyo", uiLocale: "en" });
    expect(englishTokyo.business.market).toBe("jp-tokyo");
    expect(englishTokyo.business.currency).toBe("JPY");
    expect(englishTokyo.workers.find((worker) => worker.id === "minsoo")?.name).toBe("蓮");
  });

  it("requires uiLocale at runtime instead of silently accepting a cached old schema", () => {
    const web = bridge();
    expect(() => createToolExecutors(web).createScheduleDraft({ preset: "demo", industry: "salon" })).toThrow(/uiLocale is required/i);
    expect(web.getState().business.industry).toBe("diner");
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
    const draft = executors.createScheduleDraft({ preset: "demo", industry: "pizza", uiLocale: "en" });
    expect(draft.business.industry).toBe("pizza");
    expect(draft.business.name).toBe("Slice House");
    expect(web.getState().workers.some((worker) => worker.id === "minsoo")).toBe(true);
    expect(web.getState().workers.some((worker) => worker.id === "hana")).toBe(true);
    expect(web.getState().shifts.some((shift) => shift.id === "fri-minsoo-18")).toBe(true);

    executors.markWorkerUnavailable({ workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Last-minute absence", uiLocale: "en" });
    expect(web.getState().incident).toMatchObject({ workerId: "minsoo", shiftId: "fri-minsoo-18" });
    expect(web.getState().shifts.find((shift) => shift.id === "fri-minsoo-18")).toMatchObject({ workerId: null, status: "uncovered" });
    expect(web.getState().preview).toBeNull();

    const options = executors.getResponseOptions();
    expect(options.count).toBe(3);
    const bestOption = options.options[0];
    const proposed = executors.previewStaffingChange({ scenarioId: bestOption.id, uiLocale: "en" });
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
    expect(() => executors.applyStaffingChange({ previewId: previewBeforeReview.id, version: previewBeforeReview.version, uiLocale: "en" })).toThrow(/review required/i);
    expect(JSON.stringify(web.getState())).toBe(beforeRejectedApply);

    const expectedImpact = calculateImpact(web.getState(), applyChanges(web.getState().shifts, previewBeforeReview.changes));
    const reviewed = executors.evaluateCurrentPlan();
    expect(reviewed.impact).toEqual(expectedImpact);
    expect(web.getState().activity.state).toBe("reviewed");
    expect(web.getState().preview?.changes[0]?.workerId).toBe("hana");
    expect(web.getState().shifts.find((shift) => shift.id === "fri-minsoo-18")?.workerId).toBeNull();

    const preview = web.getState().preview;
    expect(preview).not.toBeNull();
    const applied = executors.applyStaffingChange({ previewId: preview!.id, version: preview!.version, uiLocale: "en" });
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
    const draftSchema = registrations.find(({ tool }) => tool.name === "create_schedule_draft")?.tool.inputSchema as { properties?: { industry?: { enum?: unknown[] }; market?: { enum?: unknown[] }; uiLocale?: { enum?: unknown[] } }; required?: unknown[] };
    expect(draftSchema.properties?.industry?.enum).toEqual(["diner", "pizza", "coffee", "salon", "sushi", "curry"]);
    expect(draftSchema.properties?.market?.enum).toEqual(["kr-seoul", "us-nyc", "jp-tokyo", "es-madrid", "cn-shanghai"]);
    expect(draftSchema.properties?.uiLocale?.enum).toEqual(["en", "ko", "ja", "es", "zh-CN"]);
    expect(draftSchema.required).toEqual(["preset", "uiLocale"]);
    for (const tool of registrations.filter(({ tool }) => tool.annotations?.readOnlyHint === false).map(({ tool }) => tool)) {
      const schema = tool.inputSchema as { required?: unknown[] };
      expect(schema.required).toContain("uiLocale");
    }
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
    expect(() => executors.markWorkerUnavailable({ workerId: "missing-worker", shiftId: "fri-minsoo-18", uiLocale: "en" })).toThrow(/match/);
    expect(() => executors.markWorkerUnavailable({ workerId: "minsoo", shiftId: "missing-shift", uiLocale: "en" })).toThrow(/match/);
    expect(() => executors.previewStaffingChange({ changes: [{ shiftId: "missing-shift", workerId: "minsoo" }], uiLocale: "en" })).toThrow(/not found/);
    expect(() => executors.previewStaffingChange({ changes: [{ shiftId: "fri-minsoo-18", workerId: "missing-worker" }], uiLocale: "en" })).toThrow(/not found/);
    expect(() => executors.createScheduleDraft({ preset: "demo", industry: "hospital", uiLocale: "en" })).toThrow(/unsupported industry/i);
    expect(() => executors.createScheduleDraft({ preset: "demo", market: "mars", uiLocale: "en" })).toThrow(/unsupported market/i);
    expect(JSON.stringify(web.getState())).toBe(before);
  });
});
