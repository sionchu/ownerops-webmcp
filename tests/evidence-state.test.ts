import { describe, expect, it } from "vitest";
import type { ReferenceFreshness, ReferenceObservation } from "@/domain/model";
import { referenceEvidenceState } from "@/i18n/evidence";

function reference(freshness: ReferenceFreshness, provider = "provider"): ReferenceObservation {
  return {
    id: `${provider}-${freshness}`,
    kind: "commodity_price",
    provider,
    referenceKey: "milk",
    geography: "test",
    observedAt: "2026-08-30T12:00:00Z",
    fetchedAt: "2026-08-30T12:05:00Z",
    value: 1,
    unit: "l",
    freshness,
  };
}

describe("reference evidence labels", () => {
  it("does not call benchmark or cached evidence live", () => {
    expect(referenceEvidenceState(reference("seed", "fnb-master-2026"))).toBe("benchmark");
    expect(referenceEvidenceState(reference("cached"))).toBe("cached");
    expect(referenceEvidenceState(reference("recent"))).toBe("recent");
    expect(referenceEvidenceState(reference("live"))).toBe("live");
    expect(referenceEvidenceState(reference("stale"))).toBe("stale");
    expect(referenceEvidenceState(null)).toBe("missing");
  });
});
