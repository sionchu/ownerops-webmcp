import { describe, expect, it } from "vitest";
import { dispatchApplicationAction } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import { createStorePlan } from "@/domain/store-plan";
import { mergePersistenceProjection, projectStateForPersistence, storeIdForState } from "@/persistence/store-projection";

describe("Store persistence projection", () => {
  it("persists store-owned facts but excludes preview, StorePlan and external references", () => {
    let state = createDemoState("coffee", "kr-seoul");
    state = dispatchApplicationAction(state, { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Call-out" });
    const milk = state.inventory!.find((item) => item.id === "whole-milk")!;
    const plan = createStorePlan(state, "Milk reorder", [{
      type: "purchase",
      inventoryItemId: milk.id,
      quantity: 12,
      unit: milk.unit,
      estimatedUnitCost: milk.lastPurchaseUnitCost,
    }], "persist-test-plan");
    state = dispatchApplicationAction(state, { type: "set_store_plan", plan });

    const projection = projectStateForPersistence(state);

    expect(projection.storeId).toBe(storeIdForState(state));
    expect(projection.currentIncident?.workerId).toBe("minsoo");
    expect(projection.incidents.some((incident) => incident.type === "worker_unavailable")).toBe(true);
    expect(projection.inventory.some((item) => item.id === "whole-milk")).toBe(true);
    expect(projection).not.toHaveProperty("preview");
    expect(projection).not.toHaveProperty("storePlan");
    expect(projection).not.toHaveProperty("references");
  });

  it("merges persisted store facts while retaining the live reference cache", () => {
    const persistedBase = createDemoState("coffee", "kr-seoul");
    const projection = projectStateForPersistence({
      ...persistedBase,
      business: { ...persistedBase.business, name: "Persisted Corner Coffee" },
      inventory: persistedBase.inventory!.map((item) => item.id === "whole-milk" ? { ...item, onHand: 19.5 } : item),
    });

    const liveBase = createDemoState("coffee", "kr-seoul");
    const cachedReference = {
      ...liveBase.references!.find((reference) => reference.kind === "commodity_price")!,
      id: "db-live-reference",
      provider: "kamis",
      freshness: "recent" as const,
      value: 1234,
    };
    const liveWithCache = { ...liveBase, references: [cachedReference] };

    const merged = mergePersistenceProjection(liveWithCache, projection);

    expect(merged.business.name).toBe("Persisted Corner Coffee");
    expect(merged.inventory?.find((item) => item.id === "whole-milk")?.onHand).toBe(19.5);
    expect(merged.references).toEqual([cachedReference]);
    expect(merged.preview).toBeNull();
    expect(merged.storePlan).toBeNull();
  });

  it("ignores a persisted projection from another market or industry", () => {
    const seoul = createDemoState("coffee", "kr-seoul");
    const tokyoProjection = projectStateForPersistence(createDemoState("coffee", "jp-tokyo"));
    expect(mergePersistenceProjection(seoul, tokyoProjection)).toBe(seoul);

    const pizzaProjection = projectStateForPersistence(createDemoState("pizza", "kr-seoul"));
    expect(mergePersistenceProjection(seoul, pizzaProjection)).toBe(seoul);
  });
});
