import { describe, expect, it } from "vitest";
import { dispatchApplicationAction } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import { parseSnapshot, serializeSnapshot, snapshotStateEquals } from "@/snapshot/snapshot";

function legacySnapshotText() {
  const state = createDemoState("coffee", "kr-seoul");
  const legacy = {
    schemaVersion: 1,
    business: state.business,
    workers: state.workers,
    shifts: state.shifts,
    demand: state.demand,
    incident: state.incident,
  };
  return `OWNEROPS_SNAPSHOT v1\n${JSON.stringify(legacy)}\nEND_OWNEROPS_SNAPSHOT`;
}

describe("portable OwnerOps StoreState snapshot", () => {
  it("serializes v2 and round-trips store-operating truth", () => {
    let state = createDemoState("pizza", "us-nyc");
    state = dispatchApplicationAction(state, { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Demo absence" });
    state = dispatchApplicationAction(state, { type: "record_stock_count", inventoryItemId: "mozzarella", onHand: 4.5 });
    const serialized = serializeSnapshot(state);
    expect(serialized.startsWith("OWNEROPS_SNAPSHOT v2\n")).toBe(true);

    const restored = parseSnapshot(serialized);
    expect(snapshotStateEquals(state, restored)).toBe(true);
    expect(restored.business.industry).toBe("pizza");
    expect(restored.business.market).toBe("us-nyc");
    expect(restored.inventory?.find((item) => item.id === "mozzarella")?.onHand).toBe(4.5);
    expect(restored.sales?.length).toBeGreaterThan(0);
    expect(restored.references?.length).toBeGreaterThan(0);
    expect(restored.incidents?.some((incident) => incident.type === "worker_unavailable")).toBe(true);
    expect(restored.preview).toBeNull();
    expect(restored.storePlan).toBeNull();
  });

  it("migrates a legacy v1 staffing snapshot into seeded StoreState domains", () => {
    const value = JSON.parse(legacySnapshotText().split("\n").slice(1, -1).join("\n"));
    delete value.business.industry;
    delete value.business.market;
    delete value.business.currency;
    const restored = parseSnapshot(`OWNEROPS_SNAPSHOT v1\n${JSON.stringify(value)}\nEND_OWNEROPS_SNAPSHOT`);
    expect(restored.business.industry).toBe("coffee");
    expect(restored.business.market).toBe("kr-seoul");
    expect(restored.business.currency).toBe("KRW");
    expect(restored.inventory?.some((item) => item.id === "espresso-beans")).toBe(true);
    expect(restored.menu?.some((item) => item.id === "latte")).toBe(true);
    expect(restored.references?.some((reference) => reference.provider === "KAMIS")).toBe(true);
  });

  it("does not serialize transient StorePlan or staffing preview", () => {
    const state = createDemoState("coffee");
    const serialized = serializeSnapshot(state);
    const parsed = JSON.parse(serialized.split("\n").slice(1, -1).join("\n"));
    expect(parsed.storePlan).toBeUndefined();
    expect(parsed.preview).toBeUndefined();
    expect(parsed.activity).toBeUndefined();
  });

  it("reports malformed input without mutating the current state", () => {
    const state = createDemoState();
    const before = JSON.stringify(state);
    expect(() => parseSnapshot("OWNEROPS_SNAPSHOT v2\n{bad json}\nEND_OWNEROPS_SNAPSHOT")).toThrow(/malformed/);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("rejects unsupported snapshot/application versions and unknown worker references", () => {
    expect(() => parseSnapshot("OWNEROPS_SNAPSHOT v3\n{}\nEND_OWNEROPS_SNAPSHOT")).toThrow(/begin/);

    const state = createDemoState();
    const value = JSON.parse(serializeSnapshot(state).split("\n").slice(1, -1).join("\n"));
    value.snapshotVersion = 99;
    expect(() => parseSnapshot(`OWNEROPS_SNAPSHOT v2\n${JSON.stringify(value)}\nEND_OWNEROPS_SNAPSHOT`)).toThrow(/snapshotVersion 2/);

    const unknownWorker = JSON.parse(serializeSnapshot(state).split("\n").slice(1, -1).join("\n"));
    unknownWorker.shifts[0].workerId = "missing-worker";
    expect(() => parseSnapshot(`OWNEROPS_SNAPSHOT v2\n${JSON.stringify(unknownWorker)}\nEND_OWNEROPS_SNAPSHOT`)).toThrow(/unknown worker/);
  });

  it("rejects unsupported industry or market metadata without returning partial state", () => {
    const state = createDemoState();
    const industryValue = JSON.parse(serializeSnapshot(state).split("\n").slice(1, -1).join("\n"));
    industryValue.business.industry = "hospital";
    expect(() => parseSnapshot(`OWNEROPS_SNAPSHOT v2\n${JSON.stringify(industryValue)}\nEND_OWNEROPS_SNAPSHOT`)).toThrow(/not supported/);

    const marketValue = JSON.parse(serializeSnapshot(state).split("\n").slice(1, -1).join("\n"));
    marketValue.business.market = "mars";
    expect(() => parseSnapshot(`OWNEROPS_SNAPSHOT v2\n${JSON.stringify(marketValue)}\nEND_OWNEROPS_SNAPSHOT`)).toThrow(/not supported/);
  });
});
