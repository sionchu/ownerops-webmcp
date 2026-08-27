import { describe, expect, it } from "vitest";
import { dispatchApplicationAction } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import { parseSnapshot, serializeSnapshot, snapshotStateEquals } from "@/snapshot/snapshot";

describe("portable schedule snapshot", () => {
  it("round-trips snapshot-governed state", () => {
    const state = dispatchApplicationAction(createDemoState(), { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Demo absence" });
    const restored = parseSnapshot(serializeSnapshot(state));
    expect(snapshotStateEquals(state, restored)).toBe(true);
    expect(restored.preview).toBeNull();
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
});
