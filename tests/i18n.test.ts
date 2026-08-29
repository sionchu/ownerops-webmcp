import { describe, expect, it } from "vitest";
import { dispatchApplicationAction } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import type { AppState } from "@/domain/model";
import { getLocalizedIndustryProfile, normalizeUiLocale, type UiLocale } from "@/i18n";
import { liveOperatingSummary } from "@/i18n/dynamic";
import { getIndustryProfile } from "@/industry/profiles";
import { createToolExecutors } from "@/webmcp/register-tools";

describe("thin UI locale layer", () => {
  it("normalizes supported browser locale tags", () => {
    expect(normalizeUiLocale("ko-KR")).toBe("ko");
    expect(normalizeUiLocale("ja-JP")).toBe("ja");
    expect(normalizeUiLocale("es-MX")).toBe("es");
    expect(normalizeUiLocale("zh-Hans-CN")).toBe("zh-CN");
    expect(normalizeUiLocale("fr-FR")).toBeNull();
  });

  it("localizes presentation copy without mutating the canonical industry profile", () => {
    const base = getIndustryProfile("pizza");
    const localized = getLocalizedIndustryProfile(base, "ko");
    expect(localized.businessName).toBe("Slice House");
    expect(localized.label).toBe("동네 피자 가게");
    expect(localized.copy.headline).toContain("금요일");
    expect(localized.roleLabels.barista).toBe("카운터 크루");
    expect(base.label).toBe("Neighborhood pizza shop");
  });

  it("summarizes the live operating state instead of repeating industry marketing copy", () => {
    const stable = liveOperatingSummary("ja", {
      activityState: "idle",
      hasIncident: false,
      hasPreview: false,
      optionCount: 0,
      uncoveredPeakMinutes: 0,
      warningCount: 1,
      laborRatio: 0.158,
      incidentWindow: "金 18:00–22:00",
    });
    expect(stable.headline).toContain("カバレッジ");
    expect(stable.headline).not.toContain("予約ピーク");
    expect(stable.detail).toContain("人件費率");
    expect(stable.tone).toBe("stable");

    const incident = liveOperatingSummary("es", {
      activityState: "warning",
      hasIncident: true,
      hasPreview: false,
      optionCount: 3,
      uncoveredPeakMinutes: 120,
      warningCount: 2,
      laborRatio: 0.171,
      incidentWindow: "vie 18:00–22:00",
    });
    expect(incident.headline).toContain("vie 18:00–22:00");
    expect(incident.detail).toContain("120 min");
    expect(incident.tone).toBe("warning");

    const reviewed = liveOperatingSummary("ko", {
      activityState: "reviewed",
      hasIncident: true,
      hasPreview: true,
      optionCount: 3,
      uncoveredPeakMinutes: 0,
      warningCount: 1,
      laborRatio: 0.164,
      incidentWindow: "금 18:00–22:00",
    });
    expect(reviewed.headline).toContain("적용");
    expect(reviewed.detail).toContain("승인 전까지");
    expect(reviewed.tone).toBe("review");
  });

  it("lets state-changing WebMCP tools carry UI locale separately from AppState", () => {
    let state: AppState = createDemoState();
    let locale: UiLocale = "en";
    const executors = createToolExecutors({
      getState: () => state,
      getLocale: () => locale,
      runAction: (action) => (state = dispatchApplicationAction(state, action)),
      setLocale: (next) => { locale = next; },
    });

    executors.createScheduleDraft({ preset: "demo", industry: "pizza", uiLocale: "ko" });
    expect(locale).toBe("ko");
    expect(state.business.industry).toBe("pizza");
    expect((state as AppState & { locale?: string }).locale).toBeUndefined();

    expect(() => executors.previewStaffingChange({ changes: [], uiLocale: "fr" })).toThrow(/unsupported ui locale/i);
  });

  it("changes only the UI language when industry and market are omitted", () => {
    let state: AppState = createDemoState("pizza", "us-nyc");
    state = dispatchApplicationAction(state, { type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18" });
    let locale: UiLocale = "en";
    const executors = createToolExecutors({
      getState: () => state,
      getLocale: () => locale,
      runAction: (action) => (state = dispatchApplicationAction(state, action)),
      setLocale: (next) => { locale = next; },
    });
    const before = JSON.stringify(state);

    const result = executors.createScheduleDraft({ preset: "demo", uiLocale: "es" });

    expect(locale).toBe("es");
    expect(JSON.stringify(state)).toBe(before);
    expect(result.business.market).toBe("us-nyc");
    expect(result.business.industry).toBe("pizza");
    expect(result.incident).not.toBeNull();
  });
});
