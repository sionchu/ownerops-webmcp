"use client";

import { analyzeInventoryCosts, analyzeMenuCosts, getDailyBrief, storeCostMetrics } from "@/domain/store-ops";
import { analyzeSalesEvidence } from "@/domain/sales-evidence";
import { formatEvidenceTime, getEvidenceCopy, referenceEvidenceState, type EvidenceState } from "@/i18n/evidence";
import type { StoreMetricSnapshot } from "@/domain/model";
import { getOperatingBriefCopy, localizeDailyBriefItem, operatingBriefMoney } from "@/i18n/operating-brief";
import { getStoreSurfaceCopy } from "@/i18n/store-surface";
import { useAppState } from "@/state/app-state";

function metricRows(
  before: StoreMetricSnapshot,
  after: StoreMetricSnapshot,
  labels: ReturnType<typeof getOperatingBriefCopy>["plan"]["metrics"],
) {
  return [
    { label: labels.operatingProfit, before: before.estimatedOperatingProfit, after: after.estimatedOperatingProfit, kind: "money" as const, better: "higher" as const },
    { label: labels.operatingMargin, before: before.operatingMargin, after: after.operatingMargin, kind: "percent" as const, better: "higher" as const },
    { label: labels.flCost, before: before.flCostRatio, after: after.flCostRatio, kind: "percent" as const, better: "lower" as const },
    { label: labels.labor, before: before.laborCost, after: after.laborCost, kind: "money" as const, better: "lower" as const },
    { label: labels.breakEvenSales, before: before.breakEvenSales, after: after.breakEvenSales, kind: "money" as const, better: "lower" as const },
    { label: labels.purchaseCash, before: before.purchaseCashOutlay, after: after.purchaseCashOutlay, kind: "money" as const, better: "lower" as const },
  ];
}

function quantity(value: number | null | undefined, unit: string, locale: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(value)} ${unit}`;
}

function percentage(value: number | null | undefined, locale: string): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(value * 100)}%`;
}

function evidenceTone(state: EvidenceState) {
  if (["live", "recent", "db"].includes(state)) return { color: "#315847", background: "#edf6f1", border: "#c8ddd1" };
  if (["benchmark", "cached", "demo"].includes(state)) return { color: "#94651e", background: "#fff8e8", border: "#ead7a8" };
  if (state === "stale") return { color: "#a84f3d", background: "#fff4ef", border: "#ebc9be" };
  return { color: "#817a72", background: "#f5f3ef", border: "#ded8d0" };
}
function EvidenceBadge({ state, label, title }: { state: EvidenceState; label: string; title?: string }) {
  const tone = evidenceTone(state);
  return <span title={title} style={{ display: "inline-flex", border: `1px solid ${tone.border}`, background: tone.background, color: tone.color, borderRadius: 999, padding: "1px 6px", fontSize: 9, fontWeight: 800, whiteSpace: "nowrap" }}>{label}</span>;
}

export function OperatingCommandCenter() {
  const { state, runAction, locale } = useAppState();
  const ui = getOperatingBriefCopy(locale);
  const storeUi = getStoreSurfaceCopy(locale);
  const brief = getDailyBrief(state, 3);
  const costs = storeCostMetrics(state);
  const menuAnalysis = analyzeMenuCosts(state);
  const inventoryAnalysis = analyzeInventoryCosts(state);
  const currency = state.business.currency;
  const plan = state.storePlan;
  const evidenceUi = getEvidenceCopy(locale);
  const salesEvidence = analyzeSalesEvidence(state);
  const resolvedCallout = [...(state.incidents ?? [])].reverse().find((incident) => incident.type === "worker_unavailable" && incident.status === "resolved");
  const canApplyStorePlan = plan?.state === "reviewed";

  const compatibilityCss = [
    resolvedCallout && !state.incident ? `.scenario-panel.pre-incident{display:none!important}` : "",
    plan ? `.preview-bar{display:none!important}` : "",
  ].filter(Boolean).join("\n");

  return (
    <>
      <style>{compatibilityCss}</style>
      <section id="today" aria-label={ui.ariaLabel} style={{ borderBottom: "1px solid #e5ded1", background: "#fffdf9", padding: "14px 22px", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".09em", fontWeight: 800, color: "#746e65" }}>{ui.eyebrow}</div>
            <div style={{ fontSize: 18, fontWeight: 760, color: "#2c2925", marginTop: 2 }}>{state.business.name} · {state.context?.businessDate ?? ui.currentWeek}</div>
          </div>
          <div style={{ display: "flex", gap: 18, fontSize: 12, color: "#746e65", flexWrap: "wrap" }}>
            <span>{ui.metrics.sales} <strong style={{ color: "#2c2925" }}>{operatingBriefMoney(locale, currency, costs.weeklySales)}</strong></span>
            <span>{ui.metrics.food} <strong style={{ color: "#2c2925" }}>{(costs.foodCostRatio * 100).toFixed(1)}%</strong></span>
            <span>{ui.metrics.labor} <strong style={{ color: "#2c2925" }}>{(costs.laborCostRatio * 100).toFixed(1)}%</strong></span>
            <span>FL <strong style={{ color: costs.flCostRatio > 0.6 ? "#a84f3d" : "#2c2925" }}>{(costs.flCostRatio * 100).toFixed(1)}%</strong></span>
            <span>{ui.metrics.weeklyBep} <strong style={{ color: "#2c2925" }}>{operatingBriefMoney(locale, currency, costs.weeklyBreakEvenSales)}</strong></span>
          </div>
        </div>

        {resolvedCallout && !state.incident && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "#315847" }}>
            <strong>{ui.resolvedIncident}</strong>
            <span>·</span>
            <span>{ui.resolvedIncidentDetail}</span>
          </div>
        )}

        {plan ? (
          <div style={{ borderTop: "1px solid #eee6dc", paddingTop: 10, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <strong style={{ color: "#2c2925" }}>{plan.title}</strong>
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, color: plan.state === "reviewed" ? "#315847" : "#a36b16" }}>{ui.plan.states[plan.state] ?? plan.state}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#746e65" }}>{ui.plan.changes(plan.changes.length, plan.impact.reviewFlags.length)}</span>
                <button onClick={() => runAction({ type: "reject_preview" })} style={{ border: "1px solid #d9d0c5", background: "#fff", borderRadius: 7, padding: "6px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>{ui.plan.reject}</button>
                <button
                  disabled={!canApplyStorePlan}
                  onClick={() => canApplyStorePlan && runAction({ type: "apply_store_plan", planId: plan.id, version: plan.version })}
                  title={canApplyStorePlan ? ui.plan.applyTitle : ui.plan.reviewTitle}
                  style={{ border: 0, background: canApplyStorePlan ? "#315847" : "#d9d5cf", color: "#fff", borderRadius: 7, padding: "7px 10px", fontSize: 11, fontWeight: 800, cursor: canApplyStorePlan ? "pointer" : "not-allowed" }}
                >{canApplyStorePlan ? ui.plan.applyReviewed : ui.plan.reviewRequired}</button>
              </div>
            </div>

            <div style={{ fontSize: 11, color: "#746e65" }}>
              {ui.plan.purchaseNote}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
              {metricRows(plan.impact.before, plan.impact.after, ui.plan.metrics).map((metric) => {
                const delta = metric.after - metric.before;
                const improved = metric.better === "higher" ? delta > 0 : delta < 0;
                const format = (value: number) => metric.kind === "percent" ? percentage(value, locale) : operatingBriefMoney(locale, currency, value);
                const deltaLabel = metric.kind === "percent" ? `${delta >= 0 ? "+" : "−"}${percentage(Math.abs(delta), locale)}` : `${delta >= 0 ? "+" : "−"}${operatingBriefMoney(locale, currency, Math.abs(delta))}`;
                return <div key={metric.label} style={{ padding: "8px 10px", border: "1px solid #e8ded3", borderRadius: 9, background: "#fff" }}>
                  <div style={{ fontSize: 10, color: "#746e65", textTransform: "uppercase", fontWeight: 750 }}>{metric.label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ fontSize: 12, color: "#746e65" }}>{format(metric.before)}</span>
                    <span style={{ color: "#aaa" }}>→</span>
                    <strong style={{ fontSize: 13, color: "#2c2925" }}>{format(metric.after)}</strong>
                  </div>
                  <div style={{ fontSize: 11, marginTop: 2, color: delta === 0 ? "#746e65" : improved ? "#315847" : "#a84f3d" }}>Δ {deltaLabel}</div>
                </div>;
              })}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
            {brief.map((item) => {
              const localized = localizeDailyBriefItem(locale, state, item);
              return <article key={item.id} style={{ borderTop: `2px solid ${item.severity === "urgent" ? "#a84f3d" : item.severity === "attention" ? "#b27a18" : "#3f6f5a"}`, padding: "8px 10px 6px", background: "#fff", borderRadius: 8, boxShadow: "0 1px 0 rgba(44,41,37,.04)" }}>
                <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#746e65" }}>{localized.domain} · {localized.severity}</div>
                <strong style={{ display: "block", marginTop: 3, fontSize: 13, color: "#2c2925" }}>{localized.title}</strong>
                <p style={{ margin: "3px 0 0", fontSize: 11, lineHeight: 1.35, color: "#746e65" }}>{localized.evidence}</p>
                {localized.estimatedImpact && <div style={{ marginTop: 4, fontSize: 11, color: "#3f6f5a", fontWeight: 650 }}>{localized.estimatedImpact}</div>}
              </article>;
            })}
          </div>
        )}

        <details id="analysis" data-testid="operating-pnl" style={{ borderTop: "1px solid #eee6dc", paddingTop: 8 }}>
          <summary style={{ cursor: "pointer", color: "#315847", fontSize: 12, fontWeight: 800 }}>{storeUi.pnl}</summary>
          <div className="operating-pnl-grid">
            <div><span>{storeUi.sales}</span><strong>{operatingBriefMoney(locale, currency, costs.weeklySales)}</strong></div>
            <div><span>{storeUi.food}</span><strong>−{operatingBriefMoney(locale, currency, costs.foodCost)}</strong></div>
            <div><span>{storeUi.labor}</span><strong>−{operatingBriefMoney(locale, currency, costs.laborCost)}</strong></div>
            <div><span>{storeUi.variable}</span><strong>−{operatingBriefMoney(locale, currency, costs.variableOperatingCost)}</strong></div>
            <div><span>{storeUi.occupancy}</span><strong>−{operatingBriefMoney(locale, currency, costs.occupancyWeekly)}</strong></div>
            <div><span>{storeUi.fixed}</span><strong>−{operatingBriefMoney(locale, currency, costs.fixedOperatingWeekly)}</strong></div>
            <div className="operating-pnl-primary"><span>{storeUi.profit}</span><strong>{operatingBriefMoney(locale, currency, costs.estimatedOperatingProfit)}</strong></div>
            <div><span>{storeUi.margin}</span><strong>{percentage(costs.operatingMargin, locale)}</strong></div>
            <div><span>{storeUi.bep}</span><strong>{operatingBriefMoney(locale, currency, costs.weeklyBreakEvenSales)}</strong></div>
            <div><span>{storeUi.fl}</span><strong>{percentage(costs.flCostRatio, locale)}</strong></div>
          </div>
        </details>

        <details data-testid="sales-evidence" style={{ borderTop: "1px solid #eee6dc", paddingTop: 8 }}>
          <summary style={{ cursor: "pointer", color: "#315847", fontSize: 12, fontWeight: 800 }}>{evidenceUi.salesEvidence}</summary>
          <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
            <section style={{ display: "grid", gap: 6 }}><h3 style={{ margin: 0, fontSize: 12 }}>{evidenceUi.dailySales}</h3><div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", fontSize: 11 }}><thead><tr style={{ textAlign: "left", color: "#746e65", borderBottom: "1px solid #e8ded3" }}><th style={{ padding: 6 }}>{evidenceUi.date}</th><th style={{ padding: 6 }}>{evidenceUi.source}</th><th style={{ padding: 6 }}>{evidenceUi.netSales}</th><th style={{ padding: 6 }}>{evidenceUi.orders}</th><th style={{ padding: 6 }}>{evidenceUi.foodCost}</th><th style={{ padding: 6 }}>{evidenceUi.foodCostRatio}</th><th style={{ padding: 6 }}>{evidenceUi.wasteCost}</th><th style={{ padding: 6 }}>{evidenceUi.lossRate}</th></tr></thead><tbody>{salesEvidence.daily.map((item) => <tr key={item.date} style={{ borderBottom: "1px solid #f0e9df" }}><td style={{ padding: 6 }}>{item.date}</td><td style={{ padding: 6 }}><EvidenceBadge state={item.source === "demo" ? "demo" : "db"} label={item.source === "demo" ? evidenceUi.states.demo : evidenceUi.states.db}/></td><td style={{ padding: 6, fontWeight: 700 }}>{operatingBriefMoney(locale, currency, item.netSales)}</td><td style={{ padding: 6 }}>{item.orderCount}</td><td style={{ padding: 6 }}>{operatingBriefMoney(locale, currency, item.theoreticalFoodCost)}</td><td style={{ padding: 6 }}>{percentage(item.foodCostRatio, locale)}</td><td style={{ padding: 6 }}>{operatingBriefMoney(locale, currency, item.wasteCost)}</td><td style={{ padding: 6 }}>{percentage(item.lossRate, locale)}</td></tr>)}</tbody></table></div></section>
            <section style={{ display: "grid", gap: 6 }}><h3 style={{ margin: 0, fontSize: 12 }}>{evidenceUi.menuMix}</h3><div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse", fontSize: 11 }}><thead><tr style={{ textAlign: "left", color: "#746e65", borderBottom: "1px solid #e8ded3" }}><th style={{ padding: 6 }}>{ui.analysis.item}</th><th style={{ padding: 6 }}>{evidenceUi.soldQty}</th><th style={{ padding: 6 }}>{evidenceUi.netSales}</th><th style={{ padding: 6 }}>{evidenceUi.foodCost}</th><th style={{ padding: 6 }}>{evidenceUi.foodCostRatio}</th></tr></thead><tbody>{salesEvidence.menu.map((item) => <tr key={item.menuItemId} style={{ borderBottom: "1px solid #f0e9df" }}><td style={{ padding: 6, fontWeight: 700 }}>{item.name}</td><td style={{ padding: 6 }}>{item.quantity}</td><td style={{ padding: 6 }}>{operatingBriefMoney(locale, currency, item.netSales)}</td><td style={{ padding: 6 }}>{operatingBriefMoney(locale, currency, item.foodCost)}</td><td style={{ padding: 6 }}>{percentage(item.foodCostRatio, locale)}</td></tr>)}</tbody></table></div></section>
            {Math.abs(salesEvidence.totals.unallocatedSales) > 1 && <small style={{ color: "#94651e" }}>{evidenceUi.reconciliation}: {operatingBriefMoney(locale, currency, salesEvidence.totals.unallocatedSales)}</small>}
          </div>
        </details>

        <details data-testid="cost-analysis" style={{ borderTop: "1px solid #eee6dc", paddingTop: 8 }}>
          <summary style={{ cursor: "pointer", color: "#315847", fontSize: 12, fontWeight: 800 }}>{ui.analysis.title}</summary>
          <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
            <div aria-label={ui.analysis.status} style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 10, color: "#746e65", alignItems: "center" }}><span><strong>{evidenceUi.data}</strong> · <EvidenceBadge state="db" label={evidenceUi.states.db}/> <EvidenceBadge state="benchmark" label={evidenceUi.states.benchmark}/> <EvidenceBadge state="missing" label={evidenceUi.states.missing}/></span><span><strong>{evidenceUi.operation}</strong> · <span style={{ color: "#315847", fontWeight: 700 }}>{ui.analysis.complete}</span> · <span style={{ color: "#a36b16", fontWeight: 700 }}>{ui.severities.attention}</span> · <span style={{ color: "#a84f3d", fontWeight: 700 }}>{ui.severities.urgent}</span></span></div>
            <section aria-label={ui.analysis.menu} data-testid="menu-cost-table" style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 12, color: "#2c2925" }}>{ui.analysis.menu}</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: 650, borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#746e65", borderBottom: "1px solid #e8ded3" }}>
                      <th style={{ padding: "5px 6px" }}>{ui.analysis.item}</th>
                      <th style={{ padding: "5px 6px" }}>{ui.analysis.sellingPrice}</th>
                      <th style={{ padding: "5px 6px" }}>{ui.analysis.foodCost}</th>
                      <th style={{ padding: "5px 6px" }}>{ui.analysis.foodCostRatio}</th>
                      <th style={{ padding: "5px 6px" }}>{ui.analysis.target}</th>
                      <th style={{ padding: "5px 6px" }}>{ui.analysis.foodCostOnlyMargin}</th>
                      <th style={{ padding: "5px 6px" }}>{evidenceUi.data}</th>
                      <th style={{ padding: "5px 6px" }}>{evidenceUi.operation}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuAnalysis.map((analysis) => {
                      const aboveTarget = analysis.varianceVsTarget !== null && analysis.varianceVsTarget > 0;
                      const dataState: EvidenceState = analysis.status === "complete" ? "db" : "missing";
                      const operationStatus = analysis.foodCostRatio === null ? "—" : aboveTarget ? ui.severities.attention : ui.analysis.complete;
                      return <tr key={analysis.item.id} style={{ borderBottom: "1px solid #f0e9df", background: analysis.status === "unit_issue" ? "#fff5f0" : aboveTarget ? "#fffaf0" : "transparent" }}>
                        <td style={{ padding: "6px", fontWeight: 700 }}>{analysis.item.name}</td>
                        <td style={{ padding: "6px", whiteSpace: "nowrap" }}>{operatingBriefMoney(locale, currency, analysis.sellingPrice)}</td>
                        <td style={{ padding: "6px", whiteSpace: "nowrap" }}>{analysis.unitFoodCost === null ? ui.analysis.noData : operatingBriefMoney(locale, currency, analysis.unitFoodCost)}</td>
                        <td style={{ padding: "6px", fontVariantNumeric: "tabular-nums", color: aboveTarget ? "#a84f3d" : "#2c2925", fontWeight: aboveTarget ? 800 : 500 }}>{percentage(analysis.foodCostRatio, locale)}</td>
                        <td style={{ padding: "6px", fontVariantNumeric: "tabular-nums" }}>{percentage(analysis.targetFoodCostRatio, locale)}</td>
                        <td style={{ padding: "6px", whiteSpace: "nowrap" }}>{analysis.foodCostOnlyMargin === null ? ui.analysis.noData : operatingBriefMoney(locale, currency, analysis.foodCostOnlyMargin)}</td>
                        <td style={{ padding: "6px" }}><EvidenceBadge state={dataState} label={evidenceUi.states[dataState]}/></td>
                        <td style={{ padding: "6px", color: aboveTarget ? "#a36b16" : "#315847", fontWeight: 750 }}>{operationStatus}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section aria-label={ui.analysis.inventory} data-testid="inventory-cost-table" style={{ display: "grid", gap: 6 }}>
              <h3 style={{ margin: 0, fontSize: 12, color: "#2c2925" }}>{ui.analysis.inventory}</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#746e65", borderBottom: "1px solid #e8ded3" }}>
                      <th style={{ padding: "5px 6px" }}>{ui.analysis.item}</th>
                      <th style={{ padding: "5px 6px" }}>{ui.analysis.currentInventory} / {ui.analysis.parLevel}</th>
                      <th style={{ padding: "5px 6px" }}>{ui.analysis.daysOfCover}</th>
                      <th style={{ padding: "5px 6px" }}>{ui.analysis.reorderRecommendation}</th>
                      <th style={{ padding: "5px 6px" }}>{ui.analysis.actualPurchaseUnitCost}</th>
                      <th style={{ padding: "5px 6px" }}>{ui.analysis.marketReference}</th>
                      <th style={{ padding: "5px 6px" }}>{ui.analysis.versusReference}</th>
                      <th style={{ padding: "5px 6px" }}>{evidenceUi.data}</th>
                      <th style={{ padding: "5px 6px" }}>{evidenceUi.operation}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryAnalysis.map((analysis) => {
                      const refState = referenceEvidenceState(analysis.reference);
                      const refTitle = analysis.reference ? `${analysis.reference.provider} · ${evidenceUi.observed} ${formatEvidenceTime(locale, analysis.reference.observedAt)} · ${evidenceUi.fetched} ${formatEvidenceTime(locale, analysis.reference.fetchedAt)}` : undefined;
                      const urgent = analysis.item.onHand <= analysis.item.reorderPoint || (analysis.daysOfCover !== null && analysis.daysOfCover <= analysis.item.leadTimeDays);
                      const attention = analysis.item.onHand <= analysis.item.parLevel || (analysis.daysOfCover !== null && analysis.daysOfCover <= analysis.item.leadTimeDays + 1);
                      const operationStatus = urgent ? ui.severities.urgent : attention ? ui.severities.attention : ui.analysis.complete;
                      const dataState: EvidenceState = analysis.actualPurchaseUnitCost === null ? "missing" : "db";
                      return <tr key={analysis.item.id} style={{ borderBottom: "1px solid #f0e9df", background: analysis.status === "unit_issue" ? "#fff5f0" : analysis.status === "urgent" ? "#fff8f5" : "transparent" }}>
                        <td style={{ padding: "6px", fontWeight: 700 }}>{analysis.item.name}</td>
                        <td style={{ padding: "6px", whiteSpace: "nowrap" }}>{quantity(analysis.item.onHand, analysis.item.unit, locale)} / {quantity(analysis.item.parLevel, analysis.item.unit, locale)}</td>
                        <td style={{ padding: "6px", fontVariantNumeric: "tabular-nums" }}>{analysis.daysOfCover === null ? ui.analysis.noData : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(analysis.daysOfCover)}d`}</td>
                        <td style={{ padding: "6px", whiteSpace: "nowrap" }}>{quantity(analysis.reorderQuantity, analysis.item.unit, locale)}</td>
                        <td style={{ padding: "6px", whiteSpace: "nowrap", color: "#2c2925", fontWeight: 700 }}>{analysis.actualPurchaseUnitCost === null ? ui.analysis.noData : `${operatingBriefMoney(locale, currency, analysis.actualPurchaseUnitCost)} / ${analysis.item.unit}`}</td>
                        <td style={{ padding: "6px", minWidth: 160, color: "#746e65" }}>{analysis.reference && analysis.referenceUnitCost !== null ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><EvidenceBadge state={refState} label={evidenceUi.states[refState]} title={refTitle}/><span>{operatingBriefMoney(locale, analysis.reference.currency ?? currency, analysis.referenceUnitCost)} / {analysis.item.unit}</span></span> : <EvidenceBadge state="missing" label={evidenceUi.states.missing}/>}</td>
                        <td style={{ padding: "6px", fontVariantNumeric: "tabular-nums", color: analysis.differenceRate !== null && analysis.differenceRate > 0 ? "#a36b16" : "#315847" }}>{percentage(analysis.differenceRate, locale)}</td>
                        <td style={{ padding: "6px" }}><EvidenceBadge state={dataState} label={evidenceUi.states[dataState]}/></td>
                        <td style={{ padding: "6px", color: urgent ? "#a84f3d" : attention ? "#a36b16" : "#315847", fontWeight: 750 }}>{operationStatus}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </details>
      </section>
    </>
  );
}
