"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { AssistantAvatar } from "@/components/assistant-avatar";
import { DEMO_WEEK } from "@/domain/fixtures";
import { applyChanges } from "@/domain/impact";
import type { AppState, PlanImpact, Shift } from "@/domain/model";
import { INTL_LOCALE, getLocalizedIndustryProfile, getUiCopy, type UiLocale } from "@/i18n";
import { getIndustryProfile } from "@/industry/profiles";
import { parseSnapshot, serializeSnapshot } from "@/snapshot/snapshot";
import { useAppState } from "@/state/app-state";
import { useWebMcpRegistration } from "@/webmcp/use-webmcp";

const won = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 });

function Icon({ name }: { name: "copy" | "upload" | "refresh" | "alert" | "check" | "clock" | "wallet" | "users" }) {
  const paths = {
    copy: <><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></>,
    upload: <><path d="M12 16V3m0 0L7 8m5-5 5 5"/><path d="M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></>,
    refresh: <><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/></>,
    alert: <><path d="M10.3 3.6 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    wallet: <><path d="M3 6h16v13H3z"/><path d="M3 9h16M15 14h2"/></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 1 3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function formatTime(iso: string) { return iso.slice(11, 16); }
function shiftDay(shift: Shift) { return shift.start.slice(0, 10); }
function signedWon(value: number) { return `${value >= 0 ? "+" : "−"}${won.format(Math.abs(value))}`; }
function formatDay(locale: UiLocale, day: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], options).format(new Date(`${day}T12:00:00`));
}

type CandidateStage = "proposal" | "human-edit" | "reviewed";

function candidateStage(state: AppState): CandidateStage {
  if (state.activity.state === "reviewed") return "reviewed";
  if (state.activity.state === "reviewNeeded") return "human-edit";
  return "proposal";
}

function candidateDetails(state: AppState, fallback: string) {
  const change = state.preview?.changes[0];
  const shift = change ? state.shifts.find((item) => item.id === change.shiftId) : undefined;
  const worker = change ? state.workers.find((item) => item.id === change.workerId) : undefined;
  const start = change?.start ?? shift?.start;
  const end = change?.end ?? shift?.end;
  return {
    worker,
    shift,
    label: worker && start && end ? `${worker.name} · ${formatTime(start)}–${formatTime(end)}` : fallback,
  };
}

function Metric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "warning" | "good" }) {
  return <div className={`metric ${tone ?? ""}`}><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>;
}

type TimelineStatus = "complete" | "active" | "pending";

function TimelineStep({ label, detail, status }: { label: string; detail: string; status: TimelineStatus }) {
  return <li className={`timeline-step ${status}`}>
    <span className="timeline-marker" aria-hidden="true">
      {status === "complete" ? <Icon name="check"/> : status === "active" ? <span className="timeline-dot"/> : null}
    </span>
    <div><strong>{label}</strong><span>{detail}</span></div>
  </li>;
}

function AssistantRail({ supported }: { supported: boolean | null }) {
  const { state, impact, previewImpact, scenarios, locale } = useAppState();
  const ui = getUiCopy(locale);
  const profile = getLocalizedIndustryProfile(getIndustryProfile(state.business.industry), locale);
  const visibleImpact = previewImpact ?? impact;
  const applied = state.activity.state === "applied";
  const reviewed = state.activity.state === "reviewed";
  const needsReview = state.activity.state === "reviewNeeded";
  const hasIncident = Boolean(state.incident) || applied;
  const hasOptions = applied || (Boolean(state.incident) && scenarios.length === 3);
  const hasProposal = applied || Boolean(state.preview) || needsReview || reviewed;
  const candidate = candidateDetails(state, ui.rail.candidatePlan);
  const stage = state.preview ? candidateStage(state) : null;
  const candidateName = candidate.worker?.name ?? ui.rail.candidatePlan;
  const candidateHours = candidate.worker ? visibleImpact.workerWeeklyHours[candidate.worker.id] ?? 0 : 0;
  const candidateLabel = stage === "human-edit" ? ui.rail.humanEdit : stage === "reviewed" ? ui.rail.reviewed : ui.rail.agentProposal;
  const activity = ui.activity[state.activity.state];
  const timeline = [
    { label: ui.timeline.readLive, detail: ui.timeline.canonicalLoaded, status: "complete" as TimelineStatus },
    { label: `${profile.copy.incidentLabel} · ${ui.timeline.unavailable}`, detail: hasIncident ? `${ui.timeline.fridayGap} · ${profile.copy.peakLabel}` : ui.timeline.waitingIncident, status: hasIncident ? "complete" as TimelineStatus : "pending" as TimelineStatus },
    { label: ui.timeline.compared, detail: hasOptions ? ui.timeline.recoveryReady : hasIncident ? ui.timeline.comparing : ui.timeline.openIncident, status: hasOptions ? "complete" as TimelineStatus : hasIncident ? "active" as TimelineStatus : "pending" as TimelineStatus },
    { label: ui.timeline.proposal, detail: state.preview ? `${candidateName} · ${ui.timeline.previewOnly}` : ui.timeline.chooseOption, status: hasProposal ? "complete" as TimelineStatus : state.activity.state === "proposalReady" ? "active" as TimelineStatus : "pending" as TimelineStatus },
    { label: ui.timeline.humanReview, detail: applied || reviewed ? ui.timeline.editInReviewedPlan : needsReview ? ui.timeline.reviewPending : state.preview ? ui.timeline.waitingEdit : ui.timeline.editUncommitted, status: applied || reviewed ? "complete" as TimelineStatus : needsReview || state.preview ? "active" as TimelineStatus : "pending" as TimelineStatus },
    { label: ui.timeline.agentReview, detail: applied || reviewed ? ui.timeline.exactRecalculated : needsReview ? ui.timeline.evaluateNext : ui.timeline.runsAfterEdit, status: applied || reviewed ? "complete" as TimelineStatus : needsReview ? "active" as TimelineStatus : "pending" as TimelineStatus },
    { label: ui.timeline.applyReviewed, detail: applied ? ui.timeline.committed : reviewed ? ui.timeline.readyToApply : ui.timeline.onlyAfterReview, status: applied ? "complete" as TimelineStatus : reviewed ? "active" as TimelineStatus : "pending" as TimelineStatus },
  ];
  return (
    <aside className="assistant-rail" aria-label={ui.rail.sharedStateActivity}>
      <div className="assistant-heading"><div><span className="eyebrow">{ui.rail.ownerOpsAgent}</span><h2>{ui.rail.sharedStateActivity}</h2></div><span className={`status-dot ${state.activity.state}`} /></div>
      <div className={`connection-state ${supported === null ? "checking" : supported ? "connected" : "disconnected"}`}>
        <span className="connection-dot" aria-hidden="true" />
        <div><strong>{supported === null ? ui.rail.checkingSharedState : supported ? ui.rail.liveSharedState : ui.rail.agentNotConnected}</strong><small>{supported === null ? ui.rail.checkingBrowser : supported ? "WebMCP · 8 tools" : ui.rail.manualStillWorks}</small></div>
      </div>
      <AssistantAvatar state={state.activity.state} accessory={profile.visual.avatarAccessory} detail={profile.visual.avatarDetail} />
      <div className={`activity-copy activity-${state.activity.state}`} aria-live="polite"><span className="activity-kicker">{activity.kicker}</span><strong>{activity.message}</strong>{activity.detail && <p>{activity.detail}</p>}</div>
      <ol className="activity-timeline" aria-label={ui.rail.sharedStateActivity}>
        {timeline.map((step) => <TimelineStep key={step.label} {...step} />)}
      </ol>
      {state.preview && previewImpact && <section className={`candidate-card candidate-${stage}`} aria-label={`${candidateLabel} ${ui.rail.candidatePlan}`}>
        <div className="candidate-card-head"><span>{ui.rail.candidatePlan}</span><strong>{candidateLabel}</strong></div>
        <h3>{candidate.label}</h3>
        <small>{stage === "human-edit" ? ui.rail.localImpactPending : stage === "reviewed" ? ui.rail.reviewedReady : ui.rail.previewUncommitted}</small>
        <div className="candidate-metrics">
          <div><span>{ui.rail.addedPayroll}</span><strong>{signedWon(visibleImpact.payrollDelta)}</strong></div>
          <div><span>{ui.rail.weeklyHours}</span><strong>{candidateHours} h</strong></div>
          <div><span>{profile.copy.coverageLabel}</span><strong>{visibleImpact.uncoveredPeakMinutes ? `${visibleImpact.uncoveredPeakMinutes} ${ui.rail.minutesGap}` : ui.rail.covered}</strong></div>
          <div><span>{ui.rail.warnings}</span><strong>{visibleImpact.warnings.length}</strong></div>
        </div>
        <p className="candidate-note">{stage === "human-edit" ? ui.rail.localImpactPending : stage === "reviewed" ? ui.rail.reviewedReady : ui.rail.previewUncommitted}</p>
      </section>}
      {needsReview && <div className="agent-prompt"><span>{ui.rail.nextAgentAction}</span><strong>{ui.rail.evaluateCurrentPlan}</strong><small>{ui.rail.rereadExactEdit}</small></div>}
      {!state.preview && !needsReview && <div className="agent-prompt agent-suggestion"><span>{ui.rail.tryAsking}</span><strong>{profile.copy.suggestedPrompt}</strong><small>{ui.rail.sameLiveSchedule}</small></div>}
      <div className="rail-facts">
        <div><Icon name="users"/><span>{profile.copy.coverageLabel}</span><strong>{visibleImpact.uncoveredPeakMinutes ? `${visibleImpact.uncoveredPeakMinutes} ${ui.rail.minutesGap}` : ui.rail.covered}</strong></div>
        <div><Icon name="wallet"/><span>{ui.rail.laborRatio}</span><strong>{(visibleImpact.laborRatio * 100).toFixed(1)}%</strong></div>
        <div><Icon name="clock"/><span>{ui.rail.warnings}</span><strong>{visibleImpact.warnings.length}</strong></div>
      </div>
    </aside>
  );
}

function ScheduleGrid() {
  const { state, runAction, locale } = useAppState();
  const ui = getUiCopy(locale);
  const profile = getLocalizedIndustryProfile(getIndustryProfile(state.business.industry), locale);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const displayShifts = useMemo(() => state.preview ? applyChanges(state.shifts, state.preview.changes) : state.shifts, [state]);
  const previewIds = new Set(state.preview?.changes.map((change) => change.shiftId) ?? []);
  const previewKind = state.preview ? candidateStage(state) : null;
  const previewTag = previewKind === "human-edit" ? ui.preview.humanEdit : previewKind === "reviewed" ? ui.preview.reviewed : ui.preview.agentProposal;
  const selectedShift = displayShifts.find((item) => item.id === selectedShiftId) ?? null;

  const onDrop = (event: React.DragEvent, workerId: string, day: string) => {
    event.preventDefault();
    const shiftId = event.dataTransfer.getData("text/ownerops-shift");
    if (shiftId) runAction({ type: "reassign_shift", shiftId, workerId, targetDay: day });
  };

  return (
    <section className="schedule-panel" aria-label={ui.schedule.weekTitle}>
      <div className="section-heading"><div><span className="eyebrow">{profile.copy.scheduleContext}</span><h1>{ui.schedule.weekTitle}</h1></div><div className="schedule-legend"><span><i className="legend-scheduled"/>{ui.schedule.committed}</span><span><i className="legend-preview"/>{ui.schedule.agentProposal}</span><span><i className="legend-human"/>{ui.schedule.humanEdit}</span><span><i className="legend-gap"/>{ui.schedule.uncovered}</span></div></div>
      <div className="schedule-scroll">
        <div className="schedule-grid">
          <div className="grid-corner">{ui.schedule.teamMember}</div>
          {DEMO_WEEK.map((day) => <div key={day} className={`day-head ${day === "2026-08-28" ? "focus-day" : ""}`}><strong>{formatDay(locale, day, { weekday: "short" })}</strong><span>{day.slice(5).replace("-", "/")}</span>{day === "2026-08-28" && state.incident && <em>{profile.copy.incidentLabel}</em>}</div>)}
          {state.workers.map((worker) => (
            <div className="worker-row-fragment" key={worker.id}>
              <div className="worker-label"><span className={`worker-avatar role-${worker.role}`}>{worker.name.slice(0, 1)}</span><div><strong>{worker.name}</strong><span>{profile.roleLabels[worker.role]} · {won.format(worker.hourlyRate)}/h</span></div></div>
              {DEMO_WEEK.map((day) => {
                const shifts = displayShifts.filter((item) => item.workerId === worker.id && shiftDay(item) === day);
                return <div key={day} className={`schedule-cell ${day === "2026-08-28" ? "focus-day" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, worker.id, day)}>
                  {shifts.map((item) => { const isPreview = previewIds.has(item.id); return <button draggable key={item.id} className={`shift-chip ${isPreview ? `preview candidate-${previewKind}` : ""}`} onDragStart={(event) => { event.dataTransfer.setData("text/ownerops-shift", item.id); event.dataTransfer.effectAllowed = "move"; }} title={isPreview ? `${previewTag}` : ui.schedule.reassign} onClick={() => setSelectedShiftId(item.id)}>{isPreview && <small className="chip-tag">{previewTag}</small>}<span>{formatTime(item.start)}–{formatTime(item.end)}</span><small>{profile.roleLabels[item.role]}</small></button>; })}
                </div>;
              })}
            </div>
          ))}
          <div className="gap-label"><span className="worker-avatar gap">!</span><div><strong>{ui.schedule.openCoverage}</strong><span>{ui.schedule.needsAssignment}</span></div></div>
          {DEMO_WEEK.map((day) => {
            const gaps = state.shifts.filter((item) => item.status === "uncovered" && shiftDay(item) === day && !previewIds.has(item.id));
            return <div key={day} className={`schedule-cell gap-cell ${day === "2026-08-28" ? "focus-day" : ""}`}>{gaps.map((item) => <button draggable key={item.id} className="shift-chip uncovered" onDragStart={(event) => event.dataTransfer.setData("text/ownerops-shift", item.id)}><Icon name="alert"/><span>{formatTime(item.start)}–{formatTime(item.end)}</span><small>{ui.schedule.uncovered}</small></button>)}</div>;
          })}
        </div>
      </div>
      <p className="drag-help">{ui.schedule.dragHelp}</p>
      {selectedShift && <ManualShiftEditor key={selectedShift.id} shift={selectedShift} onClose={() => setSelectedShiftId(null)} onSave={(workerId, targetDay) => { runAction({ type: "reassign_shift", shiftId: selectedShift.id, workerId, targetDay }); setSelectedShiftId(null); }} />}
    </section>
  );
}

function ManualShiftEditor({ shift, onClose, onSave }: { shift: Shift; onClose: () => void; onSave: (workerId: string, targetDay: string) => void }) {
  const { state, locale } = useAppState();
  const ui = getUiCopy(locale);
  const profile = getLocalizedIndustryProfile(getIndustryProfile(state.business.industry), locale);
  const [workerId, setWorkerId] = useState(shift.workerId ?? state.workers[0].id);
  const [targetDay, setTargetDay] = useState(shiftDay(shift));
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="shift-editor" role="dialog" aria-modal="true" aria-labelledby="shift-editor-title"><div className="dialog-head"><div><span className="eyebrow">{ui.schedule.manualEdit}</span><h2 id="shift-editor-title">{ui.schedule.reassign} {formatTime(shift.start)}–{formatTime(shift.end)}</h2></div><button className="icon-button" onClick={onClose} aria-label={ui.schedule.close}>×</button></div><label>{ui.schedule.teamMemberField}<select value={workerId} onChange={(event) => setWorkerId(event.target.value)}>{state.workers.map((worker) => <option value={worker.id} key={worker.id}>{worker.name} · {profile.roleLabels[worker.role]}</option>)}</select></label><label>{ui.schedule.workDay}<select value={targetDay} onChange={(event) => setTargetDay(event.target.value)}>{DEMO_WEEK.map((day) => <option value={day} key={day}>{formatDay(locale, day, { weekday: "long", month: "short", day: "numeric" })}</option>)}</select></label><p>{ui.schedule.manualHelp}</p><div className="dialog-actions"><button className="secondary" onClick={onClose}>{ui.schedule.cancel}</button><button className="primary" onClick={() => onSave(workerId, targetDay)}>{ui.schedule.saveAssignment}</button></div></section></div>;
}

function ScenarioPanel() {
  const { state, scenarios, runAction, locale } = useAppState();
  const ui = getUiCopy(locale);
  const profile = getLocalizedIndustryProfile(getIndustryProfile(state.business.industry), locale);
  const incidentShift = state.shifts.find((item) => item.id === state.incident?.shiftId);
  if (!state.incident) {
    return <section className="scenario-panel pre-incident"><div><span className="eyebrow">{profile.copy.incidentLabel} · {ui.scenario.canonicalDisruption}</span><h2>{profile.copy.disruptionTitle}</h2><p>{profile.copy.disruptionBody}</p></div><button className="danger-soft" onClick={() => runAction({ type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Last-minute absence" })}><Icon name="alert"/>{ui.scenario.markUnavailable}</button></section>;
  }
  return (
    <section className="scenario-panel">
      <div className="scenario-title"><div><span className="eyebrow">{profile.copy.coverageLabel} · {ui.scenario.recoveryComparison}</span><h2>{ui.scenario.threeOptions}</h2></div><p>{incidentShift ? `${formatTime(incidentShift.start)}–${formatTime(incidentShift.end)} · ${formatDay(locale, shiftDay(incidentShift), { weekday: "long" })}` : ui.scenario.currentIncident} · {ui.scenario.rankedBy}</p></div>
      <div className="scenario-list">
        {scenarios.map((scenario, index) => {
          const replacementId = scenario.changes[0]?.workerId;
          const replacement = state.workers.find((worker) => worker.id === replacementId);
          const replacementName = replacement?.name ?? ui.rail.candidatePlan;
          const start = incidentShift ? formatTime(incidentShift.start) : "18:00";
          const end = incidentShift ? formatTime(incidentShift.end) : "22:00";
          return <article key={scenario.id} className={`scenario-row ${state.preview?.scenarioId === scenario.id ? "selected" : ""}`}>
            <div className="rank">{index + 1}</div><div className="scenario-main"><div><strong>{ui.scenario.coversShift(replacementName)}</strong>{index === 0 && <span className="recommended">{ui.scenario.recommended}</span>}</div><p>{ui.scenario.takesShift(replacementName, start, end)}</p><small>{ui.scenario.restoresCoverage(`${(scenario.impact.laborRatio * 100).toFixed(1)}%`)}</small></div>
            <div className="scenario-stat"><span>{ui.scenario.addedPayroll}</span><strong>{won.format(scenario.impact.payrollDelta)}</strong></div>
            <div className="scenario-stat"><span>{ui.scenario.weeklyHours}</span><strong>{replacement ? `${scenario.impact.workerWeeklyHours[replacement.id]} h` : "—"}</strong></div>
            <div className="scenario-stat"><span>{profile.copy.peakLabel} {ui.scenario.gap}</span><strong>{scenario.impact.uncoveredPeakMinutes} min</strong></div>
            <div className="scenario-stat optional"><span>{ui.scenario.warnings}</span><strong>{scenario.impact.warnings.length}</strong></div>
            <div className="scenario-stat optional"><span>{ui.scenario.changes}</span><strong>{scenario.impact.scheduleChangeCount}</strong></div>
            <button className="secondary compact" onClick={() => runAction({ type: "preview_scenario", scenarioId: scenario.id })}>{state.preview?.scenarioId === scenario.id ? ui.scenario.previewing : ui.scenario.preview}</button>
          </article>;
        })}
      </div>
    </section>
  );
}

function ImpactStrip({ impact }: { impact: PlanImpact }) {
  const { state, locale } = useAppState();
  const ui = getUiCopy(locale);
  const profile = getLocalizedIndustryProfile(getIndustryProfile(state.business.industry), locale);
  const fridaySales = state.business.expectedSalesByDay["2026-08-28"];
  return <section className="impact-strip" aria-label={ui.top.liveSharedState}><Metric label={ui.metrics.estimatedWeeklyLabor} value={won.format(impact.projectedLaborCost)} hint={`${impact.payrollDelta >= 0 ? "+" : ""}${won.format(impact.payrollDelta)} · ${ui.metrics.currentComparison}`} /><Metric label={ui.metrics.fridayExpectedSales} value={won.format(fridaySales)} hint={`${profile.copy.peakLabel} · 19:00–21:00`}/><Metric label={ui.metrics.estimatedLaborRatio} value={`${(impact.laborRatio * 100).toFixed(1)}%`} hint={`${(state.business.targetLaborRatio * 100).toFixed(0)}% ${ui.metrics.target}`} tone={impact.laborRatio > state.business.targetLaborRatio ? "warning" : "good"}/><Metric label={`${profile.copy.coverageLabel} ${ui.metrics.coverageStatus}`} value={impact.uncoveredPeakMinutes ? `${impact.uncoveredPeakMinutes} ${ui.rail.minutesGap}` : ui.metrics.peakCovered} hint={`${impact.warnings.length} ${ui.metrics.reviewFlag}`} tone={impact.uncoveredPeakMinutes ? "warning" : "good"}/></section>;
}

function PreviewBar() {
  const { state, previewImpact, runAction, locale } = useAppState();
  const ui = getUiCopy(locale);
  if (!state.preview || !previewImpact) return null;
  const stage = candidateStage(state);
  const canApply = stage === "reviewed";
  const stageLabel = stage === "human-edit" ? ui.preview.humanEdit : stage === "reviewed" ? ui.preview.reviewed : ui.preview.agentProposal;
  const stageCopy = stage === "human-edit" ? ui.preview.localImpactPending : stage === "reviewed" ? ui.preview.reviewedReady : ui.preview.candidateOnly;
  const candidate = candidateDetails(state, ui.rail.candidatePlan);
  return <div className={`preview-bar preview-${stage}`}><div className="preview-bar-copy"><div className="preview-bar-title"><span className="preview-badge">{stageLabel}</span><strong>{candidate.label}</strong><span className="preview-version">v{state.preview.version}</span></div><span>{stageCopy}</span></div><div className="preview-bar-impact"><span>{signedWon(previewImpact.payrollDelta)} {ui.preview.payroll}</span><span>{previewImpact.uncoveredPeakMinutes ? `${previewImpact.uncoveredPeakMinutes} ${ui.preview.gap}` : ui.preview.covered}</span><span>{previewImpact.warnings.length} {ui.preview.warning}</span></div><div className="preview-bar-actions"><button className="secondary" onClick={() => runAction({ type: "reject_preview" })}>{ui.preview.reject}</button><button className="primary" disabled={!canApply} onClick={() => runAction({ type: "apply_preview", previewId: state.preview!.id, version: state.preview!.version })}><Icon name="check"/>{canApply ? ui.preview.applyReviewed : ui.preview.reviewRequired}</button></div></div>;
}

function SnapshotDialog({ onClose }: { onClose: () => void }) {
  const { state, runAction, locale } = useAppState();
  const ui = getUiCopy(locale);
  const [text, setText] = useState(() => serializeSnapshot(state));
  const [message, setMessage] = useState("");
  const copy = async () => { try { await navigator.clipboard.writeText(serializeSnapshot(state)); setMessage(ui.snapshot.copied); } catch { setMessage(ui.snapshot.blocked); } };
  const importText = () => { try { const parsed = parseSnapshot(text); runAction({ type: "import_state", state: parsed }); setMessage(ui.snapshot.restored); } catch (error) { setMessage(error instanceof Error && locale === "en" ? error.message : ui.snapshot.parseError); } };
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="snapshot-dialog" role="dialog" aria-modal="true" aria-labelledby="snapshot-title"><div className="dialog-head"><div><span className="eyebrow">{ui.snapshot.portableHandoff}</span><h2 id="snapshot-title">{ui.snapshot.title}</h2></div><button className="icon-button" onClick={onClose} aria-label={ui.snapshot.close}>×</button></div><p>{ui.snapshot.description}</p><textarea value={text} onChange={(event) => setText(event.target.value)} spellCheck={false} aria-label={ui.snapshot.textLabel}/><div className="dialog-actions"><span className={message === ui.snapshot.blocked || message === ui.snapshot.parseError ? "error-text" : "success-text"}>{message}</span><button className="secondary" onClick={copy}><Icon name="copy"/>{ui.snapshot.copy}</button><button className="primary" onClick={importText}><Icon name="upload"/>{ui.snapshot.import}</button></div></section></div>;
}

export function OwnerOpsApp() {
  const { state, impact, previewImpact, hydrated, runAction, locale } = useAppState();
  const supported = useWebMcpRegistration();
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const ui = getUiCopy(locale);
  const profile = getLocalizedIndustryProfile(getIndustryProfile(state.business.industry), locale);
  const visibleImpact = previewImpact ?? impact;
  return (
    <main className={`app-shell ${hydrated ? "hydrated" : ""}`} data-industry={profile.id} data-locale={locale} style={{ "--oo-accent": profile.visual.accent, "--oo-accent-hover": profile.visual.accentHover, "--oo-accent-soft": profile.visual.accentSoft, "--oo-canvas": profile.visual.canvas, "--oo-surface": profile.visual.surface, "--oo-surface-elevated": profile.visual.surfaceElevated, "--oo-ink": profile.visual.ink, "--oo-secondary-ink": profile.visual.secondaryInk, "--oo-border": profile.visual.border, "--oo-focus-lane": profile.visual.focusLane, "--oo-agent-glow": profile.visual.agentGlow, "--oo-radius-card": profile.visual.radiusCard, "--oo-radius-shift": profile.visual.radiusShift, "--oo-motif-opacity": profile.visual.motifOpacity, "--oo-motion-theme": profile.visual.motionTheme } as CSSProperties}>
      <header className="topbar"><div className="brand"><span className="brand-mark">O</span><div><strong>OwnerOps</strong><span>{state.business.name}</span></div></div><div className="topbar-center"><span className="live-dot"/>{ui.top.liveSharedState}<span className="divider"/>{profile.label}</div><nav><button className="top-action" onClick={() => setSnapshotOpen(true)}><Icon name="copy"/>{ui.top.snapshot}</button><button className="top-action" onClick={() => runAction({ type: "reset_demo" })}><Icon name="refresh"/>{ui.top.resetDemo}</button></nav><div className="context-stage"><span className="eyebrow">{profile.label} · {ui.top.dateRange}</span><h1>{profile.copy.headline}</h1><p>{profile.copy.scheduleContext}</p></div></header>
      <PreviewBar />
      <div className="workspace"><div className="primary-workspace"><ImpactStrip impact={visibleImpact}/><ScheduleGrid/><ScenarioPanel/></div><AssistantRail supported={supported}/></div>
      {snapshotOpen && <SnapshotDialog onClose={() => setSnapshotOpen(false)}/>} 
    </main>
  );
}
