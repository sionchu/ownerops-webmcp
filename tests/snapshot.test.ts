import { describe, expect, it } from "vitest";
import { dispatchApplicationAction } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import { parseSnapshot, serializeSnapshot, snapshotStateEquals } from "@/snapshot/snapshot";

describe("portable schedule snapshot", () => {
  it("round-trips snapshot-governed state", () => {
    const state = dispatchApplicationAction(createDemoState("pizza", "us-nyc"), { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Demo absence" });
    const restored = parseSnapshot(serializeSnapshot(state));
    expect(snapshotStateEquals(state, restored)).toBe(true);
    expect(restored.business.industry).toBe("pizza");
    expect(restored.business.market).toBe("us-nyc");
    expect(restored.business.currency).toBe("USD");
    expect(restored.preview).toBeNull();
  });

  it("migrates a legacy v1 snapshot without industry or market metadata", () => {
    const value = JSON.parse(serializeSnapshot(createDemoState()).split("\n").slice(1, -1).join("\n"));
    delete value.business.industry;
    delete value.business.market;
    delete value.business.currency;
    const restored = parseSnapshot(`OWNEROPS_SNAPSHOT v1\n${JSON.stringify(value)}\nEND_OWNEROPS_SNAPSHOT`);
    expect(restored.business.industry).toBe("coffee");
    expect(restored.business.market).toBe("kr-seoul");
    expect(restored.business.currency).toBe("KRW");
  });

  it("reports malformed input without mutating the current state", () => {
    const state = createDemoState();
    const before = JSON.stringify(state);
    expect(() => parseSnapshot("OWNEROPS_SNAPSHOT v1\n{bad json}\nEND_OWNEROPS_SNAPSHOT")).toThrow(/malformed/);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("rejects unsupported versions and unknown worker references", () => {
    expect(() => parseSnapshot("OWNEROPS_SNAPSHOT v2\n{}\nEND_OWNEROPS_SNAPSHOT")).toThrow(/begin/);
    const value = JSON.parse(serializeSnapshot(createDemoState()).split("\n").slice(1, -1).join("\n"));
    value.shifts[0].workerId = "missing-worker";
    expect(() => parseSnapshot(`OWNEROPS_SNAPSHOT v1\n${JSON.stringify(value)}\nEND_OWNEROPS_SNAPSHOT`)).toThrow(/unknown worker/);
  });

  it("rejects unsupported industry or market metadata without returning partial state", () => {
    const industryValue = JSON.parse(serializeSnapshot(createDemoState()).split("\n").slice(1, -1).join("\n"));
    industryValue.business.industry = "hospital";
    expect(() => parseSnapshot(`OWNEROPS_SNAPSHOT v1\n${JSON.stringify(industryValue)}\nEND_OWNEROPS_SNAPSHOT`)).toThrow(/not supported/);

    const marketValue = JSON.parse(serializeSnapshot(createDemoState()).split("\n").slice(1, -1).join("\n"));
    marketValue.business.market = "mars";
    expect(() => parseSnapshot(`OWNEROPS_SNAPSHOT v1\n${JSON.stringify(marketValue)}\nEND_OWNEROPS_SNAPSHOT`)).toThrow(/not supported/);
  });
});
