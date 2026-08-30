from pathlib import Path
import re


def one(path: str, old: str, new: str):
    p = Path(path)
    text = p.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one match, got {count}: {old[:100]!r}")
    p.write_text(text.replace(old, new, 1))


def sub1(path: str, pattern: str, replacement: str):
    p = Path(path)
    text = p.read_text()
    updated, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f"{path}: regex expected one match, got {count}: {pattern[:100]!r}")
    p.write_text(updated)


# Provenance timestamps remain semantic; compact icons only expose them on hover.
one(
    "src/state/app-state.tsx",
    "  disclosure: string;\n};",
    "  disclosure: string;\n  storeUpdatedAt?: string;\n  referenceObservedAt?: string;\n  referenceFetchedAt?: string;\n};",
)
sub1(
    "src/state/app-state.tsx",
    r"function withDataProvenance\(state: AppState, storeTruth: StoreTruthSource, referenceEvidence: ReferenceEvidenceSource\): AppState \{[\s\S]*?\n\}",
    '''function withDataProvenance(state: AppState, storeTruth: StoreTruthSource, referenceEvidence: ReferenceEvidenceSource, timestamps: Partial<Pick<StoreDataProvenance, "storeUpdatedAt" | "referenceObservedAt" | "referenceFetchedAt">> = {}): AppState {
  const previous = (state.business as RuntimeBusiness).dataProvenance;
  return {
    ...state,
    business: {
      ...state.business,
      dataProvenance: {
        storeTruth,
        referenceEvidence,
        disclosure: provenanceDisclosure(storeTruth, referenceEvidence),
        storeUpdatedAt: timestamps.storeUpdatedAt ?? previous?.storeUpdatedAt,
        referenceObservedAt: timestamps.referenceObservedAt ?? previous?.referenceObservedAt,
        referenceFetchedAt: timestamps.referenceFetchedAt ?? previous?.referenceFetchedAt,
      },
    } as AppState["business"],
  };
}''',
)
one(
    "src/state/app-state.tsx",
    '? withDataProvenance(mergePersistenceProjection(current, payload.projection), "database", refs)',
    '? withDataProvenance(mergePersistenceProjection(current, payload.projection), "database", refs, { storeUpdatedAt: payload.projection.persistedAt })',
)
one(
    "src/state/app-state.tsx",
    "        const merged = payload.references?.length ? mergeCachedReferences(current, payload.references) : current;\n        const next = withDataProvenance(merged, dataProvenance(current).storeTruth, referenceEvidence);",
    "        const merged = payload.references?.length ? mergeCachedReferences(current, payload.references) : current;\n        const latest = (payload.references ?? []).reduce((acc, reference) => ({ observed: !acc.observed || reference.observedAt > acc.observed ? reference.observedAt : acc.observed, fetched: !acc.fetched || reference.fetchedAt > acc.fetched ? reference.fetchedAt : acc.fetched }), { observed: \"\", fetched: \"\" });\n        const next = withDataProvenance(merged, dataProvenance(current).storeTruth, referenceEvidence, { referenceObservedAt: latest.observed || undefined, referenceFetchedAt: latest.fetched || undefined });",
)

# Compact icon tooltips: DB is not called live; references show observed/fetched time.
one(
    "src/components/owner-navigation.tsx",
    'import { getStoreSurfaceCopy } from "@/i18n/store-surface";',
    'import { formatEvidenceTime, getEvidenceCopy } from "@/i18n/evidence";\nimport { getStoreSurfaceCopy } from "@/i18n/store-surface";',
)
one(
    "src/components/owner-navigation.tsx",
    "  const ui = getStoreSurfaceCopy(locale);",
    "  const ui = getStoreSurfaceCopy(locale);\n  const evidenceUi = getEvidenceCopy(locale);",
)
one(
    "src/components/owner-navigation.tsx",
    '  const referenceBenchmark = referenceMode === "database-benchmark-cache";',
    '  const referenceBenchmark = referenceMode === "database-benchmark-cache";\n  const storeTitle = storeLive ? `${evidenceUi.states.db} · ${evidenceUi.stored} ${formatEvidenceTime(locale, provenance?.storeUpdatedAt)}` : evidenceUi.states.demo;\n  const referenceTitle = `${referenceProvider ? evidenceUi.states.cached : referenceBenchmark ? evidenceUi.states.benchmark : evidenceUi.states.demo} · ${evidenceUi.observed} ${formatEvidenceTime(locale, provenance?.referenceObservedAt)} · ${evidenceUi.fetched} ${formatEvidenceTime(locale, provenance?.referenceFetchedAt)}`;',
)
one(
    "src/components/owner-navigation.tsx",
    'title={storeLive ? "매장 데이터 · DB" : "매장 데이터 · Demo"}',
    'title={storeTitle}',
)
one(
    "src/components/owner-navigation.tsx",
    'title={referenceProvider ? "시장 참고 · Provider cache" : referenceBenchmark ? "시장 참고 · Benchmark" : "시장 참고 · Demo"}',
    'title={referenceTitle}',
)

# Shift reassignment can edit time as well as worker/day.
one(
    "src/domain/actions.ts",
    'import { applyChanges, calculateImpact } from "./impact";',
    'import { applyChanges, calculateImpact, hoursBetween } from "./impact";',
)
one(
    "src/domain/actions.ts",
    '| { type: "reassign_shift"; shiftId: string; workerId: string; targetDay?: string }',
    '| { type: "reassign_shift"; shiftId: string; workerId: string; targetDay?: string; start?: string; end?: string }',
)
one(
    "src/domain/actions.ts",
    '      const movedTime = action.targetDay ? shiftToDay(candidateCurrent.start, candidateCurrent.end, action.targetDay) : { start: candidateCurrent.start, end: candidateCurrent.end };',
    '      const movedDay = action.targetDay ? shiftToDay(candidateCurrent.start, candidateCurrent.end, action.targetDay) : { start: candidateCurrent.start, end: candidateCurrent.end };\n      const movedTime = { start: action.start ?? movedDay.start, end: action.end ?? movedDay.end };\n      const duration = hoursBetween(movedTime.start, movedTime.end);\n      if (movedTime.start.slice(0, 10) !== movedTime.end.slice(0, 10) || !Number.isFinite(duration) || duration <= 0 || duration > 18) throw new Error("Shift start/end must form a valid same-day interval.");',
)

# Month -> Week -> Day schedule hierarchy and time editing.
one(
    "src/components/ownerops-app.tsx",
    'import { getMarketLocation, getMarketProfile } from "@/market/profiles";\n',
    'import { getMarketLocation, getMarketProfile } from "@/market/profiles";\nimport { getScheduleHierarchyCopy } from "@/i18n/schedule-hierarchy";\n',
)
one("src/components/ownerops-app.tsx", 'type ScheduleView = "day" | "week";', 'type ScheduleView = "month" | "week" | "day";')

app = Path("src/components/ownerops-app.tsx").read_text()
marker = "function ScheduleCostSummaryStrip("
idx = app.index(marker)
helpers = '''function monthWeekStartsFor(date: string): string[] {
  const anchor = new Date(`${date.slice(0, 7)}-01T12:00:00`);
  const month = anchor.getMonth();
  anchor.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
  return Array.from({ length: 6 }, (_, index) => {
    const week = new Date(anchor);
    week.setDate(anchor.getDate() + index * 7);
    return dateOnly(week);
  }).filter((week, index) => index === 0 || new Date(`${week}T12:00:00`).getMonth() === month || new Date(`${week}T12:00:00`).getDate() <= 7);
}

function MonthScheduleOverview({ state, locale, selectedDate, onSelectWeek }: { state: AppState; locale: UiLocale; selectedDate: string; onSelectWeek: (date: string) => void }) {
  const copy = getScheduleHierarchyCopy(locale);
  return <div data-testid="schedule-month-overview" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--line)" }}>
    {monthWeekStartsFor(selectedDate).map((weekStart) => {
      const days = weekDatesFor(weekStart);
      const summary = scheduleCostSummary(state, weekRange(days), { scheduleBasis: "candidate" });
      return <button type="button" data-testid={`month-week-${weekStart}`} key={weekStart} onClick={() => onSelectWeek(weekStart)} style={{ textAlign: "left", border: "1px solid var(--line)", background: "var(--surface-strong)", borderRadius: 9, padding: 11, cursor: "pointer", color: "inherit" }}>
        <span style={{ display: "block", color: "var(--muted)", fontSize: 10, fontWeight: 750 }}>{copy.weekSummary}</span>
        <strong style={{ display: "block", marginTop: 3 }}>{days[0].slice(5).replace("-", "/")}–{days[6].slice(5).replace("-", "/")}</strong>
        {summary.scheduledHours > 0 ? <><span style={{ display: "block", marginTop: 7, fontSize: 11 }}>{formatHours(locale, summary.scheduledHours)} h · {formatMoney(state, locale, summary.scheduledWage)}</span><small style={{ display: "block", marginTop: 3, color: "var(--muted)" }}>{formatMoney(state, locale, summary.salesBasis)} · {summary.warningCount} ⚑</small></> : <small style={{ display: "block", marginTop: 8, color: "var(--faint)" }}>{copy.noSchedule}</small>}
      </button>;
    })}
  </div>;
}

'''
Path("src/components/ownerops-app.tsx").write_text(app[:idx] + helpers + app[idx:])

sub1(
    "src/components/ownerops-app.tsx",
    r'  const businessDate = state\.context\?\.businessDate \?\? DEMO_WEEK\[4\];\n  const weekDays = useMemo\(\(\) => weekDatesFor\(businessDate\), \[businessDate\]\);\n  const \[view, setView\] = useState<ScheduleView>\("week"\);\n  const \[selectedDate, setSelectedDate\] = useState\(businessDate\);',
    '  const businessDate = state.context?.businessDate ?? DEMO_WEEK[4];\n  const [view, setView] = useState<ScheduleView>("week");\n  const [selectedDate, setSelectedDate] = useState(businessDate);\n  const weekDays = useMemo(() => weekDatesFor(selectedDate), [selectedDate]);\n  const hierarchy = getScheduleHierarchyCopy(locale);',
)
one(
    "src/components/ownerops-app.tsx",
    '  const heading = view === "day" ? ui.schedule.dayTitle.replace("{date}", scheduleDayLabel(locale, activeDate)) : ui.schedule.weekTitle;',
    '  const heading = view === "month" ? hierarchy.monthTitle(formatDay(locale, selectedDate, { month: "long", year: "numeric" })) : view === "day" ? ui.schedule.dayTitle.replace("{date}", scheduleDayLabel(locale, activeDate)) : ui.schedule.weekTitle;',
)
sub1(
    "src/components/ownerops-app.tsx",
    r'<div className="schedule-view-toggle" role="group" aria-label=\{ui\.schedule\.viewSelector\}>\s*<button type="button" aria-pressed=\{view === "day"\}[\s\S]*?</button>\s*<button type="button" aria-pressed=\{view === "week"\}[\s\S]*?</button>\s*</div>',
    '<div className="schedule-view-toggle" role="group" aria-label={ui.schedule.viewSelector}><button data-testid="schedule-view-month" type="button" aria-pressed={view === "month"} className={view === "month" ? "active" : ""} onClick={() => setView("month")}>{hierarchy.month}</button><button data-testid="schedule-view-week" type="button" aria-pressed={view === "week"} className={view === "week" ? "active" : ""} onClick={() => setView("week")}>{ui.schedule.week}</button><button data-testid="schedule-view-day" type="button" aria-pressed={view === "day"} className={view === "day" ? "active" : ""} onClick={() => setView("day")}>{ui.schedule.day}</button></div>',
)
one(
    "src/components/ownerops-app.tsx",
    '      {view === "day" && <div className="schedule-day-picker"',
    '      {view === "month" && <MonthScheduleOverview state={state} locale={locale} selectedDate={selectedDate} onSelectWeek={(date) => { setSelectedDate(date); setView("week"); }} />}\n      {view === "day" && <div className="schedule-day-picker"',
)
one("src/components/ownerops-app.tsx", '      <ScheduleCostSummaryStrip state={state} locale={locale} view={view} selectedDate={activeDate} weekDays={weekDays}/>', '      {view !== "month" && <ScheduleCostSummaryStrip state={state} locale={locale} view={view} selectedDate={activeDate} weekDays={weekDays}/>}')
one("src/components/ownerops-app.tsx", '      <SchedulePlanCost state={state} locale={locale} weekDays={weekDays}/>', '      {view !== "month" && <SchedulePlanCost state={state} locale={locale} weekDays={weekDays}/>}')
one("src/components/ownerops-app.tsx", '      <div className="schedule-scroll">', '      <div className="schedule-scroll" style={{ display: view === "month" ? "none" : undefined }}>')
one("src/components/ownerops-app.tsx", '      <p className="drag-help">{ui.schedule.dragHelp}</p>', '      {view !== "month" && <p className="drag-help">{ui.schedule.dragHelp}</p>}')
one(
    "src/components/ownerops-app.tsx",
    'return <div key={day} className={`day-head ${day === focusDay ? "focus-day" : ""}`}><strong>',
    'return <button type="button" key={day} onClick={() => { setSelectedDate(day); setView("day"); }} className={`day-head ${day === focusDay ? "focus-day" : ""}`} style={{ border: 0, font: "inherit", cursor: "pointer", color: "inherit" }}><strong>',
)
one("src/components/ownerops-app.tsx", '{day === focusDay && state.incident && <em>{profile.copy.incidentLabel}</em>}</div>;', '{day === focusDay && state.incident && <em>{profile.copy.incidentLabel}</em>}</button>;')
one(
    "src/components/ownerops-app.tsx",
    '      {selectedShift && <ManualShiftEditor key={selectedShift.id} shift={selectedShift} onClose={() => setSelectedShiftId(null)} onSave={(workerId, targetDay) => { runAction({ type: "reassign_shift", shiftId: selectedShift.id, workerId, targetDay }); setSelectedShiftId(null); }} />}',
    '      {view !== "month" && selectedShift && <ManualShiftEditor key={selectedShift.id} shift={selectedShift} onClose={() => setSelectedShiftId(null)} onSave={(workerId, targetDay, startTime, endTime) => { runAction({ type: "reassign_shift", shiftId: selectedShift.id, workerId, targetDay, start: `${targetDay}T${startTime}:00`, end: `${targetDay}T${endTime}:00` }); setSelectedShiftId(null); }} />}',
)
sub1(
    "src/components/ownerops-app.tsx",
    r'function ManualShiftEditor\([\s\S]*?\n\}\n\nfunction ScenarioPanel\(\) \{',
    '''function ManualShiftEditor({ shift, onClose, onSave }: { shift: Shift; onClose: () => void; onSave: (workerId: string, targetDay: string, startTime: string, endTime: string) => void }) {
  const { state, locale } = useAppState();
  const ui = getUiCopy(locale);
  const hierarchy = getScheduleHierarchyCopy(locale);
  const profile = getLocalizedIndustryProfile(getIndustryProfile(state.business.industry), locale);
  const [workerId, setWorkerId] = useState(shift.workerId ?? state.workers[0].id);
  const [targetDay, setTargetDay] = useState(shiftDay(shift));
  const [startTime, setStartTime] = useState(formatTime(shift.start));
  const [endTime, setEndTime] = useState(formatTime(shift.end));
  const validTime = endTime > startTime;
  return <div className="dialog-backdrop shift-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="shift-editor" role="dialog" aria-modal="true" aria-labelledby="shift-editor-title"><div className="dialog-head"><div><span className="eyebrow">{ui.schedule.manualEdit}</span><h2 id="shift-editor-title">{ui.schedule.reassign} {formatTime(shift.start)}–{formatTime(shift.end)}</h2></div><button className="icon-button" onClick={onClose} aria-label={ui.schedule.close}>×</button></div><label>{ui.schedule.teamMemberField}<select value={workerId} onChange={(event) => setWorkerId(event.target.value)}>{state.workers.map((worker) => <option value={worker.id} key={worker.id}>{worker.name} · {profile.roleLabels[worker.role]}</option>)}</select></label><label>{ui.schedule.workDay}<select value={targetDay} onChange={(event) => setTargetDay(event.target.value)}>{DEMO_WEEK.map((day) => <option value={day} key={day}>{formatDay(locale, day, { weekday: "long", month: "short", day: "numeric" })}</option>)}</select></label><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><label>{hierarchy.startTime}<input data-testid="shift-start-time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label><label>{hierarchy.endTime}<input data-testid="shift-end-time" type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label></div>{!validTime && <p style={{ color: "var(--danger)" }}>{hierarchy.invalidTime}</p>}<p>{ui.schedule.manualHelp}</p><div className="dialog-actions"><button className="secondary" onClick={onClose}>{ui.schedule.cancel}</button><button className="primary" disabled={!validTime} onClick={() => validTime && onSave(workerId, targetDay, startTime, endTime)}>{ui.schedule.saveAssignment}</button></div></section></div>;
}

function ScenarioPanel() {''',
)

# Sales evidence UI and separate source/freshness from operational urgency.
one(
    "src/components/operating-command-center.tsx",
    'import { analyzeInventoryCosts, analyzeMenuCosts, getDailyBrief, storeCostMetrics } from "@/domain/store-ops";\n',
    'import { analyzeInventoryCosts, analyzeMenuCosts, getDailyBrief, storeCostMetrics } from "@/domain/store-ops";\nimport { analyzeSalesEvidence } from "@/domain/sales-evidence";\nimport { formatEvidenceTime, getEvidenceCopy, referenceEvidenceState, type EvidenceState } from "@/i18n/evidence";\n',
)
occ = Path("src/components/operating-command-center.tsx").read_text()
idx = occ.index("export function OperatingCommandCenter() {")
badge = '''function evidenceTone(state: EvidenceState) {
  if (["live", "recent", "db"].includes(state)) return { color: "#315847", background: "#edf6f1", border: "#c8ddd1" };
  if (["benchmark", "cached", "demo"].includes(state)) return { color: "#94651e", background: "#fff8e8", border: "#ead7a8" };
  if (state === "stale") return { color: "#a84f3d", background: "#fff4ef", border: "#ebc9be" };
  return { color: "#817a72", background: "#f5f3ef", border: "#ded8d0" };
}
function EvidenceBadge({ state, label, title }: { state: EvidenceState; label: string; title?: string }) {
  const tone = evidenceTone(state);
  return <span title={title} style={{ display: "inline-flex", border: `1px solid ${tone.border}`, background: tone.background, color: tone.color, borderRadius: 999, padding: "1px 6px", fontSize: 9, fontWeight: 800, whiteSpace: "nowrap" }}>{label}</span>;
}

'''
Path("src/components/operating-command-center.tsx").write_text(occ[:idx] + badge + occ[idx:])
one("src/components/operating-command-center.tsx", "  const plan = state.storePlan;\n", "  const plan = state.storePlan;\n  const evidenceUi = getEvidenceCopy(locale);\n  const salesEvidence = analyzeSalesEvidence(state);\n")

sales_section = '''        <details data-testid="sales-evidence" style={{ borderTop: "1px solid #eee6dc", paddingTop: 8 }}>
          <summary style={{ cursor: "pointer", color: "#315847", fontSize: 12, fontWeight: 800 }}>{evidenceUi.salesEvidence}</summary>
          <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
            <section style={{ display: "grid", gap: 6 }}><h3 style={{ margin: 0, fontSize: 12 }}>{evidenceUi.dailySales}</h3><div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse", fontSize: 11 }}><thead><tr style={{ textAlign: "left", color: "#746e65", borderBottom: "1px solid #e8ded3" }}><th style={{ padding: 6 }}>{evidenceUi.date}</th><th style={{ padding: 6 }}>{evidenceUi.source}</th><th style={{ padding: 6 }}>{evidenceUi.netSales}</th><th style={{ padding: 6 }}>{evidenceUi.orders}</th><th style={{ padding: 6 }}>{evidenceUi.foodCost}</th><th style={{ padding: 6 }}>{evidenceUi.foodCostRatio}</th><th style={{ padding: 6 }}>{evidenceUi.wasteCost}</th><th style={{ padding: 6 }}>{evidenceUi.lossRate}</th></tr></thead><tbody>{salesEvidence.daily.map((item) => <tr key={item.date} style={{ borderBottom: "1px solid #f0e9df" }}><td style={{ padding: 6 }}>{item.date}</td><td style={{ padding: 6 }}><EvidenceBadge state={item.source === "demo" ? "demo" : "db"} label={item.source === "demo" ? evidenceUi.states.demo : evidenceUi.states.db}/></td><td style={{ padding: 6, fontWeight: 700 }}>{operatingBriefMoney(locale, currency, item.netSales)}</td><td style={{ padding: 6 }}>{item.orderCount}</td><td style={{ padding: 6 }}>{operatingBriefMoney(locale, currency, item.theoreticalFoodCost)}</td><td style={{ padding: 6 }}>{percentage(item.foodCostRatio, locale)}</td><td style={{ padding: 6 }}>{operatingBriefMoney(locale, currency, item.wasteCost)}</td><td style={{ padding: 6 }}>{percentage(item.lossRate, locale)}</td></tr>)}</tbody></table></div></section>
            <section style={{ display: "grid", gap: 6 }}><h3 style={{ margin: 0, fontSize: 12 }}>{evidenceUi.menuMix}</h3><div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse", fontSize: 11 }}><thead><tr style={{ textAlign: "left", color: "#746e65", borderBottom: "1px solid #e8ded3" }}><th style={{ padding: 6 }}>{ui.analysis.item}</th><th style={{ padding: 6 }}>{evidenceUi.soldQty}</th><th style={{ padding: 6 }}>{evidenceUi.netSales}</th><th style={{ padding: 6 }}>{evidenceUi.foodCost}</th><th style={{ padding: 6 }}>{evidenceUi.foodCostRatio}</th></tr></thead><tbody>{salesEvidence.menu.map((item) => <tr key={item.menuItemId} style={{ borderBottom: "1px solid #f0e9df" }}><td style={{ padding: 6, fontWeight: 700 }}>{item.name}</td><td style={{ padding: 6 }}>{item.quantity}</td><td style={{ padding: 6 }}>{operatingBriefMoney(locale, currency, item.netSales)}</td><td style={{ padding: 6 }}>{operatingBriefMoney(locale, currency, item.foodCost)}</td><td style={{ padding: 6 }}>{percentage(item.foodCostRatio, locale)}</td></tr>)}</tbody></table></div></section>
            {Math.abs(salesEvidence.totals.unallocatedSales) > 1 && <small style={{ color: "#94651e" }}>{evidenceUi.reconciliation}: {operatingBriefMoney(locale, currency, salesEvidence.totals.unallocatedSales)}</small>}
          </div>
        </details>

'''
one("src/components/operating-command-center.tsx", '        <details data-testid="cost-analysis"', sales_section + '        <details data-testid="cost-analysis"')
sub1(
    "src/components/operating-command-center.tsx",
    r'<div aria-label=\{ui\.analysis\.status\}[\s\S]*?</div>\n            <section aria-label=\{ui\.analysis\.menu\}',
    '<div aria-label={ui.analysis.status} style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 10, color: "#746e65", alignItems: "center" }}><span><strong>{evidenceUi.data}</strong> · <EvidenceBadge state="db" label={evidenceUi.states.db}/> <EvidenceBadge state="benchmark" label={evidenceUi.states.benchmark}/> <EvidenceBadge state="missing" label={evidenceUi.states.missing}/></span><span><strong>{evidenceUi.operation}</strong> · <span style={{ color: "#315847", fontWeight: 700 }}>{ui.analysis.complete}</span> · <span style={{ color: "#a36b16", fontWeight: 700 }}>{ui.severities.attention}</span> · <span style={{ color: "#a84f3d", fontWeight: 700 }}>{ui.severities.urgent}</span></span></div>\n            <section aria-label={ui.analysis.menu}',
)
one(
    "src/components/operating-command-center.tsx",
    '<th style={{ padding: "5px 6px" }}>{ui.analysis.foodCostOnlyMargin}</th>\n                      <th style={{ padding: "5px 6px" }}>{ui.analysis.status}</th>',
    '<th style={{ padding: "5px 6px" }}>{ui.analysis.foodCostOnlyMargin}</th>\n                      <th style={{ padding: "5px 6px" }}>{evidenceUi.data}</th>\n                      <th style={{ padding: "5px 6px" }}>{evidenceUi.operation}</th>',
)
one(
    "src/components/operating-command-center.tsx",
    '                      const status = analysis.status === "unit_issue" ? ui.analysis.unitIssue : analysis.status === "data_issue" ? ui.analysis.dataIssue : aboveTarget ? ui.analysis.aboveTarget : ui.analysis.complete;',
    '                      const dataState: EvidenceState = analysis.status === "complete" ? "db" : "missing";\n                      const operationStatus = analysis.foodCostRatio === null ? "—" : aboveTarget ? ui.severities.attention : ui.analysis.complete;',
)
one(
    "src/components/operating-command-center.tsx",
    '<td style={{ padding: "6px", whiteSpace: "nowrap" }}>{analysis.foodCostOnlyMargin === null ? ui.analysis.noData : operatingBriefMoney(locale, currency, analysis.foodCostOnlyMargin)}</td>\n                        <td style={{ padding: "6px", color: statusColor(analysis.status), fontWeight: 750 }}>{status}</td>',
    '<td style={{ padding: "6px", whiteSpace: "nowrap" }}>{analysis.foodCostOnlyMargin === null ? ui.analysis.noData : operatingBriefMoney(locale, currency, analysis.foodCostOnlyMargin)}</td>\n                        <td style={{ padding: "6px" }}><EvidenceBadge state={dataState} label={evidenceUi.states[dataState]}/></td>\n                        <td style={{ padding: "6px", color: aboveTarget ? "#a36b16" : "#315847", fontWeight: 750 }}>{operationStatus}</td>',
)
one(
    "src/components/operating-command-center.tsx",
    '<th style={{ padding: "5px 6px" }}>{ui.analysis.versusReference}</th>\n                      <th style={{ padding: "5px 6px" }}>{ui.analysis.status}</th>',
    '<th style={{ padding: "5px 6px" }}>{ui.analysis.versusReference}</th>\n                      <th style={{ padding: "5px 6px" }}>{evidenceUi.data}</th>\n                      <th style={{ padding: "5px 6px" }}>{evidenceUi.operation}</th>',
)
sub1(
    "src/components/operating-command-center.tsx",
    r'\s*const ref = analysis\.reference[\s\S]*?const status = analysis\.status[\s\S]*?;',
    '''
                      const refState = referenceEvidenceState(analysis.reference);
                      const refTitle = analysis.reference ? `${analysis.reference.provider} · ${evidenceUi.observed} ${formatEvidenceTime(locale, analysis.reference.observedAt)} · ${evidenceUi.fetched} ${formatEvidenceTime(locale, analysis.reference.fetchedAt)}` : undefined;
                      const urgent = analysis.item.onHand <= analysis.item.reorderPoint || (analysis.daysOfCover !== null && analysis.daysOfCover <= analysis.item.leadTimeDays);
                      const attention = analysis.item.onHand <= analysis.item.parLevel || (analysis.daysOfCover !== null && analysis.daysOfCover <= analysis.item.leadTimeDays + 1);
                      const operationStatus = urgent ? ui.severities.urgent : attention ? ui.severities.attention : ui.analysis.complete;
                      const dataState: EvidenceState = analysis.actualPurchaseUnitCost === null ? "missing" : "db";''',
)
one(
    "src/components/operating-command-center.tsx",
    '<td style={{ padding: "6px", minWidth: 210, color: "#746e65" }}>{ref}</td>\n                        <td style={{ padding: "6px", fontVariantNumeric: "tabular-nums", color: analysis.differenceRate !== null && analysis.differenceRate > 0 ? "#a36b16" : "#315847" }}>{percentage(analysis.differenceRate, locale)}</td>\n                        <td style={{ padding: "6px", color: statusColor(analysis.status), fontWeight: 750 }}>{status}</td>',
    '<td style={{ padding: "6px", minWidth: 160, color: "#746e65" }}>{analysis.reference && analysis.referenceUnitCost !== null ? <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><EvidenceBadge state={refState} label={evidenceUi.states[refState]} title={refTitle}/><span>{operatingBriefMoney(locale, analysis.reference.currency ?? currency, analysis.referenceUnitCost)} / {analysis.item.unit}</span></span> : <EvidenceBadge state="missing" label={evidenceUi.states.missing}/>}</td>\n                        <td style={{ padding: "6px", fontVariantNumeric: "tabular-nums", color: analysis.differenceRate !== null && analysis.differenceRate > 0 ? "#a36b16" : "#315847" }}>{percentage(analysis.differenceRate, locale)}</td>\n                        <td style={{ padding: "6px" }}><EvidenceBadge state={dataState} label={evidenceUi.states[dataState]}/></td>\n                        <td style={{ padding: "6px", color: urgent ? "#a84f3d" : attention ? "#a36b16" : "#315847", fontWeight: 750 }}>{operationStatus}</td>',
)
sub1("src/components/operating-command-center.tsx", r'function statusColor\(status: string\): string \{[\s\S]*?\n\}\n\n', '')

# WebMCP semantic-first routing and sales proof.
one(
    "src/webmcp/register-tools.ts",
    'import { analyzeInventoryCosts, analyzeMenuCosts, getDailyBrief, inventoryAtRisk, menuUnitFoodCost, purchaseReferenceComparison, storeCostMetrics } from "@/domain/store-ops";\n',
    'import { analyzeInventoryCosts, analyzeMenuCosts, getDailyBrief, inventoryAtRisk, menuUnitFoodCost, purchaseReferenceComparison, storeCostMetrics } from "@/domain/store-ops";\nimport { analyzeSalesEvidence } from "@/domain/sales-evidence";\n',
)
one("src/webmcp/register-tools.ts", '    sales: state.sales ?? [],\n    menuCostAnalysis: analyzeMenuCosts(state),', '    sales: state.sales ?? [],\n    salesEvidence: analyzeSalesEvidence(state),\n    menuCostAnalysis: analyzeMenuCosts(state),')
one("src/webmcp/register-tools.ts", '      items: getDailyBrief(bridge.getState(), input.limit ?? 5),\n    }),', '      items: getDailyBrief(bridge.getState(), input.limit ?? 5),\n      dataProvenance: (bridge.getState().business as AppState["business"] & { dataProvenance?: unknown }).dataProvenance ?? null,\n    }),')
one(
    "src/webmcp/register-tools.ts",
    'description: `PRIMARY READ PATH. Read exact canonical StoreState. Use focus=overview, people, sales, stock, operations, costs, or context so the agent receives focused evidence instead of a giant raw state dump. Answer supported questions directly without asking the owner to navigate modules. Never open/export Snapshot UI for live work. ${capabilityBoundaryDescription}`',
    'description: `PRIMARY READ PATH. Read exact canonical StoreState directly through this Site Tool. When this tool is available, do not use browser/DOM inspection, computer-use, screenshots, or automatic clicking to read OwnerOps data. Use focus=overview, people, sales, stock, operations, costs, or context so the agent receives focused evidence instead of a giant raw state dump. Answer supported questions directly without asking the owner to navigate modules. Never open/export Snapshot UI for live work. ${capabilityBoundaryDescription}`',
)
one(
    "src/webmcp/register-tools.ts",
    'description: "Preferred first tool for \'prepare today\', \'what do I need to know\', or \'what is risky\'. Return only the highest-priority evidence across people, stock, costs, operations, and context."',
    'description: "Preferred first tool for \'prepare today\', \'what do I need to know\', or \'what is risky\'. Use this Site Tool directly instead of browser/computer-use when available. Return only the highest-priority evidence across people, stock, costs, operations, and context, with dataProvenance for source/freshness reasoning."',
)

# Browser acceptance for the newly visible/semantic behavior.
one(
    "scripts/webmcp-browser-e2e.mjs",
    '    step("continue full reviewed-apply flow on Seoul");',
    '    step("verify month to week schedule hierarchy");\n    await page.getByTestId("schedule-view-month").click();\n    await page.getByTestId("schedule-month-overview").waitFor({ state: "visible", timeout: 10_000 });\n    await page.locator("[data-testid^=month-week-]").filter({ hasText: /h/ }).first().click();\n\n    step("continue full reviewed-apply flow on Seoul");',
)
one(
    "scripts/webmcp-browser-e2e.mjs",
    '    step("read milk stock, cover, actual price and benchmark reference");',
    '    step("verify sales evidence and split data/operation semantics");\n    const salesTool = await invoke("get_store_state", { focus: "sales" });\n    assert(salesTool.salesEvidence?.daily?.length === 7 && salesTool.salesEvidence?.menu?.length >= 4, "Sales evidence missing from semantic tool surface.", salesTool.salesEvidence);\n    assert(await page.getByTestId("sales-evidence").count() === 1, "Sales evidence UI missing.");\n    const analysisText = await page.getByTestId("cost-analysis").textContent();\n    assert(!String(analysisText).includes("데이터 확인 필요"), "Data quality is still mixed into operational status.", analysisText);\n\n    step("read milk stock, cover, actual price and benchmark reference");',
)
one(
    "scripts/webmcp-browser-e2e.mjs",
    '    await editor.locator("select").first().selectOption(humanWorker);\n    await editor.locator("button.primary").click();',
    '    await editor.locator("select").first().selectOption(humanWorker);\n    await editor.getByTestId("shift-end-time").fill("21:30");\n    await editor.locator("button.primary").click();',
)
one(
    "scripts/webmcp-browser-e2e.mjs",
    '    assert(editedPlan?.state === "preview" && editedStaffing?.workerId === humanWorker, "Human edit did not update the canonical candidate.", editedPlan);',
    '    assert(editedPlan?.state === "preview" && editedStaffing?.workerId === humanWorker && String(editedStaffing?.end).includes("21:30"), "Human worker/time edit did not update the canonical candidate.", editedPlan);',
)
one(
    "scripts/webmcp-browser-e2e.mjs",
    '    assert(appliedShift?.workerId === humanWorker && appliedShift?.status === "scheduled", "Human-edited staffing was not committed.", appliedShift);',
    '    assert(appliedShift?.workerId === humanWorker && appliedShift?.status === "scheduled" && String(appliedShift?.end).includes("21:30"), "Human-edited staffing/time was not committed.", appliedShift);',
)

print("review UX patch applied")
