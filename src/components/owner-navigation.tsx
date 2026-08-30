"use client";

import type { MarketId } from "@/domain/model";
import { getStoreSurfaceCopy } from "@/i18n/store-surface";
import { getMarketLocation, MARKET_PROFILES } from "@/market/profiles";
import { type StoreDataProvenance, useAppState } from "@/state/app-state";

const FLAGS: Record<MarketId, string> = {
  "kr-seoul": "🇰🇷",
  "us-nyc": "🇺🇸",
  "jp-tokyo": "🇯🇵",
  "es-madrid": "🇪🇸",
  "cn-shanghai": "🇨🇳",
};

function Glyph({ type }: { type: "database" | "reference" | "refresh" }) {
  if (type === "database") return <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"><ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/></svg>;
  if (type === "reference") return <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 4h12v16H6z"/><path d="M9 8h6M9 12h6M9 16h4"/></svg>;
  return <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></svg>;
}

export function OwnerNavigation() {
  const { state, locale, runAction } = useAppState();
  const ui = getStoreSurfaceCopy(locale);
  const provenance = (state.business as typeof state.business & { dataProvenance?: StoreDataProvenance }).dataProvenance;
  const storeLive = provenance?.storeTruth === "database";
  const referenceMode = provenance?.referenceEvidence ?? "deterministic-seed";
  const referenceProvider = referenceMode === "database-provider-cache";
  const referenceBenchmark = referenceMode === "database-benchmark-cache";

  const statusStyle = (tone: "live" | "benchmark" | "fallback") => ({
    width: 29,
    height: 29,
    display: "grid",
    placeItems: "center",
    borderRadius: 8,
    border: `1px solid ${tone === "live" ? "#b9d4c6" : tone === "benchmark" ? "#e2c98f" : "#d9d4cc"}`,
    background: tone === "live" ? "#edf6f1" : tone === "benchmark" ? "#fff8e8" : "#f5f3ef",
    color: tone === "live" ? "#315847" : tone === "benchmark" ? "#9a6a20" : "#817a72",
  } as const);

  return <nav className="owner-navigation" aria-label="OwnerOps" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
    <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
      <a href="#today">{ui.today}</a><a href="#schedule">{ui.schedule}</a><a href="#analysis">{ui.analysis}</a><a href="#store">{ui.store}</a>
    </div>
    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
      <label style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #ded7ce", background: "#fff", borderRadius: 8, padding: "4px 7px 4px 8px" }}>
        <span aria-hidden="true">{FLAGS[state.business.market]}</span>
        <select
          data-testid="market-select"
          aria-label="Market"
          value={state.business.market}
          onChange={(event) => runAction({ type: "create_schedule_draft", preset: "demo", industry: state.business.industry, market: event.target.value as MarketId })}
          style={{ border: 0, background: "transparent", color: "#4f4a44", font: "inherit", fontSize: 11, fontWeight: 760, outline: "none", cursor: "pointer" }}
        >
          {(Object.keys(MARKET_PROFILES) as MarketId[]).map((market) => <option key={market} value={market}>{getMarketLocation(market, locale)}</option>)}
        </select>
      </label>
      <span data-testid="store-truth-status" title={storeLive ? "매장 데이터 · DB" : "매장 데이터 · Demo"} aria-label={storeLive ? "Store data database" : "Store data fallback"} style={statusStyle(storeLive ? "live" : "fallback")}><Glyph type="database"/></span>
      <span data-testid="reference-status" title={referenceProvider ? "시장 참고 · Provider cache" : referenceBenchmark ? "시장 참고 · Benchmark" : "시장 참고 · Demo"} aria-label={referenceProvider ? "Reference provider cache" : referenceBenchmark ? "Reference benchmark" : "Reference fallback"} style={statusStyle(referenceProvider ? "live" : referenceBenchmark ? "benchmark" : "fallback")}><Glyph type="reference"/></span>
      <button
        data-testid="demo-reset"
        type="button"
        aria-label="Reload current demo store"
        title="현재 매장 다시 불러오기"
        onClick={() => runAction({ type: "reset_demo" })}
        style={{ ...statusStyle("fallback"), padding: 0, cursor: "pointer" }}
      ><Glyph type="refresh"/></button>
    </div>
  </nav>;
}
