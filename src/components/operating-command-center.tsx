"use client";

import { getDailyBrief, storeCostMetrics } from "@/domain/store-ops";
import type { StoreMetricSnapshot } from "@/domain/model";
import { useAppState } from "@/state/app-state";

function money(currency: string, value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: currency === "KRW" || currency === "JPY" ? 0 : 2 }).format(value);
}

function metricRows(before: StoreMetricSnapshot, after: StoreMetricSnapshot) {
  return [
    ["Labor", before.laborCost, after.laborCost],
    ["Food cost", before.foodCost, after.foodCost],
    ["Purchase cash", before.purchaseCashOutlay, after.purchaseCashOutlay],
    ["Waste exposure", before.estimatedWasteCost, after.estimatedWasteCost],
    ["Break-even sales", before.breakEvenSales, after.breakEvenSales],
  ] as const;
}

export function OperatingCommandCenter() {
  const { state, runAction } = useAppState();
  const brief = getDailyBrief(state, 3);
  const costs = storeCostMetrics(state);
  const currency = state.business.currency;
  const plan = state.storePlan;
  const resolvedCallout = [...(state.incidents ?? [])].reverse().find((incident) => incident.type === "worker_unavailable" && incident.status === "resolved");
  const canApplyStorePlan = plan?.state === "reviewed";

  const compatibilityCss = [
    `.connection-state.connected small{font-size:0!important}`,
    `.connection-state.connected small::after{content:"WebMCP · 9 tools";font-size:11px!important}`,
    resolvedCallout && !state.incident ? `.scenario-panel.pre-incident{display:none!important}` : "",
    plan ? `.preview-bar{display:none!important}` : "",
  ].filter(Boolean).join("\n");

  return (
    <>
      <style>{compatibilityCss}</style>
      <section aria-label="OwnerOps operating command center" style={{ borderBottom: "1px solid #e5ded1", background: "#fffdf9", padding: "14px 22px", display: "grid", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: ".09em", fontWeight: 800, color: "#746e65", textTransform: "uppercase" }}>OwnerOps · operating brief</div>
            <div style={{ fontSize: 18, fontWeight: 760, color: "#2c2925", marginTop: 2 }}>{state.business.name} · {state.context?.businessDate ?? "Current week"}</div>
          </div>
          <div style={{ display: "flex", gap: 18, fontSize: 12, color: "#746e65", flexWrap: "wrap" }}>
            <span>Sales <strong style={{ color: "#2c2925" }}>{money(currency, costs.weeklySales)}</strong></span>
            <span>Food <strong style={{ color: "#2c2925" }}>{(costs.foodCostRatio * 100).toFixed(1)}%</strong></span>
            <span>Labor <strong style={{ color: "#2c2925" }}>{(costs.laborCostRatio * 100).toFixed(1)}%</strong></span>
            <span>FL <strong style={{ color: costs.flCostRatio > 0.6 ? "#a84f3d" : "#2c2925" }}>{(costs.flCostRatio * 100).toFixed(1)}%</strong></span>
            <span>Weekly BEP <strong style={{ color: "#2c2925" }}>{money(currency, costs.weeklyBreakEvenSales)}</strong></span>
          </div>
        </div>

        {resolvedCallout && !state.incident && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "#315847" }}>
            <strong>Resolved incident</strong>
            <span>·</span>
            <span>Call-out remains recorded as an availability exception/history; recovery is complete.</span>
          </div>
        )}

        {plan ? (
          <div style={{ borderTop: "1px solid #eee6dc", paddingTop: 10, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <div>
                <strong style={{ color: "#2c2925" }}>{plan.title}</strong>
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, color: plan.state === "reviewed" ? "#315847" : "#a36b16" }}>{plan.state.toUpperCase()}</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#746e65" }}>{plan.changes.length} changes · {plan.impact.reviewFlags.length} review flags</span>
                <button onClick={() => runAction({ type: "reject_preview" })} style={{ border: "1px solid #d9d0c5", background: "#fff", borderRadius: 7, padding: "6px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Reject</button>
                <button
                  disabled={!canApplyStorePlan}
                  onClick={() => canApplyStorePlan && runAction({ type: "apply_store_plan", planId: plan.id, version: plan.version })}
                  title={canApplyStorePlan ? "Apply the reviewed cross-domain plan" : "Ask the agent to evaluate the current plan first"}
                  style={{ border: 0, background: canApplyStorePlan ? "#315847" : "#d9d5cf", color: "#fff", borderRadius: 7, padding: "7px 10px", fontSize: 11, fontWeight: 800, cursor: canApplyStorePlan ? "pointer" : "not-allowed" }}
                >{canApplyStorePlan ? "Apply reviewed plan" : "Agent review required"}</button>
              </div>
            </div>

            <div style={{ fontSize: 11, color: "#746e65" }}>
              {plan.changes.map((change) => change.type).join(" · ")} · purchases become planned POs until receipt
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8 }}>
              {metricRows(plan.impact.before, plan.impact.after).map(([label, before, after]) => {
                const delta = after - before;
                return <div key={label} style={{ padding: "8px 10px", border: "1px solid #e8ded3", borderRadius: 9, background: "#fff" }}>
                  <div style={{ fontSize: 10, color: "#746e65", textTransform: "uppercase", fontWeight: 750 }}>{label}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>
                    <span style={{ fontSize: 12, color: "#746e65" }}>{money(currency, before)}</span>
                    <span style={{ color: "#aaa" }}>→</span>
                    <strong style={{ fontSize: 13, color: "#2c2925" }}>{money(currency, after)}</strong>
                  </div>
                  <div style={{ fontSize: 11, marginTop: 2, color: delta === 0 ? "#746e65" : delta > 0 ? "#a84f3d" : "#315847" }}>Δ {delta >= 0 ? "+" : "−"}{money(currency, Math.abs(delta))}</div>
                </div>;
              })}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>
            {brief.map((item) => <article key={item.id} style={{ borderTop: `2px solid ${item.severity === "urgent" ? "#a84f3d" : item.severity === "attention" ? "#b27a18" : "#3f6f5a"}`, padding: "8px 10px 6px", background: "#fff", borderRadius: 8, boxShadow: "0 1px 0 rgba(44,41,37,.04)" }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".06em", color: "#746e65" }}>{item.domain} · {item.severity}</div>
              <strong style={{ display: "block", marginTop: 3, fontSize: 13, color: "#2c2925" }}>{item.title}</strong>
              <p style={{ margin: "3px 0 0", fontSize: 11, lineHeight: 1.35, color: "#746e65" }}>{item.evidence}</p>
              {item.estimatedImpact && <div style={{ marginTop: 4, fontSize: 11, color: "#3f6f5a", fontWeight: 650 }}>{item.estimatedImpact}</div>}
            </article>)}
          </div>
        )}
      </section>
    </>
  );
}
