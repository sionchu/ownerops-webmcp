import { describe, expect, it } from "vitest";
import { dispatchApplicationAction } from "@/domain/actions";
import { createDemoState } from "@/domain/fixtures";
import type { AppState } from "@/domain/model";
import { getLocalizedIndustryProfile, normalizeUiLocale, type UiLocale } from "@/i18n";
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

  it("lets state-changing WebMCP tools carry UI locale separately from AppState", () => {
    let state: AppState = createDemoState();
    let locale: UiLocale = "en";
    const executors = createToolExecutors({
      getState: () => state,
      runAction: (action) => (state = dispatchApplicationAction(state, action)),
      setLocale: (next) => { locale = next; },
    });

    executors.createScheduleDraft({ preset: "demo", industry: "pizza", uiLocale: "ko" });
    expect(locale).toBe("ko");
    expect(state.business.industry).toBe("pizza");
    expect((state as AppState & { locale?: string }).locale).toBeUndefined();

    expect(() => executors.previewStaffingChange({ changes: [], uiLocale: "fr" })).toThrow(/unsupported ui locale/i);
  });
});
