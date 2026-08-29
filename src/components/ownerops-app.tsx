"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { AssistantAvatar } from "@/components/assistant-avatar";
import { DEMO_WEEK } from "@/domain/fixtures";
import { applyChanges } from "@/domain/impact";
import type { AppState, PlanImpact, Shift } from "@/domain/model";
import { getIndustryProfile } from "@/industry/profiles";
import { parseSnapshot, serializeSnapshot } from "@/snapshot/snapshot";
import { useAppState } from "@/state/app-state";
import { useWebMcpRegistration } from "@/webmcp/use-webmcp";

const dayFormatter = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
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
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></>,
  };
  return <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
}

function formatTime(iso: string) { return iso.slice(11, 16); }
function shiftDay(shift: Shift) { return shift.start.slice(0, 10); }
function signedWon(value: number) { return `${value >= 0 ? "+" : "−"}${won.format(Math.abs(value))}`; }

type CandidateStage = "proposal" | "human-edit" | "reviewed";

function candidateStage(state: AppState): CandidateStage {
  if (state.activity.state === "reviewed") return "reviewed";
  if (state.activity.state === "reviewNeeded") return "human-edit";
  return "proposal";
}

function activityLabel(state: AppState) {
  switch (state.activity.state) {
    case "proposalReady": return "Agent proposal";
    case "reviewNeeded": return "Human edit · review needed";
    case "reviewed": return "Agent reviewed";
    case "warning": return "Coverage warning";
    case "applied": return "Plan applied";
    case "checking": return "Analyzing live state";
    case "listening": return "Listening for agent";
    case "error": return "Connection issue";
    default: return "Workspace ready";
  }
}

function candidateDetails(state: AppState) {
  const change = state.preview?.changes[0];
  const shift = change ? state.shifts.find((item) => item.id === change.shiftId) : undefined;
  const worker = change ? state.workers.find((item) => item.id === change.workerId) : undefined;
  const start = change?.start ?? shift?.start;
  const end = change?.end ?? shift?.end;
  return {
    worker,
    shift,
    label: worker && start && end ? `${worker.name} · ${formatTime(start)}–${formatTime(end)}` : "Current staffing candidate",
  };
}

function Metric({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "warning" | "good" }) {
  return <div className={`metric ${tone ?? ""}`}><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>;
}

type TimelineStatus = "complete" | "active" | "pending";

function TimelineStep({ label, detail, status }: { label: string; detail: string; status: TimelineStatus }) {
  return <li className={`timeline-step ${status}`}><span className="timeline-marker" aria-hidden="true">{status === "complete" ? "✓" : status === "active" ? "•" : "○"}</span><div><strong>{label}</strong><span>{detail}</span></div></li>;
}

function AssistantRail({ supported }: { supported: boolean | null }) {
  const { state, impact, previewImpact, scenarios } = useAppState();
  const profile = getIndustryProfile(state.business.industry);
  const visibleImpact = previewImpact ?? impact;
  const applied = state.activity.state === "applied";
  const reviewed = state.activity.state === "reviewed";
  const needsReview = state.activity.state === "reviewNeeded";
  const hasIncident = Boolean(state.incident) || applied;
  const hasOptions = applied || (Boolean(state.incident) && scenarios.length === 3);
  const hasProposal = applied || Boolean(state.preview) || needsReview || reviewed;
  const candidate = candidateDetails(state);
  const stage = state.preview ? candidateStage(state) : null;
  const candidateName = candidate.worker?.name ?? "Candidate";
  const candidateHours = candidate.worker ? visibleImpact.workerWeeklyHours[candidate.worker.id] ?? 0 : 0;
  const candidateLabel = stage === "human-edit" ? "Human edit" : stage === "reviewed" ? "Reviewed" : "Agent proposal";
  const timeline = [
    { label: "Read live schedule", detail: "Canonical schedule loaded", status: "complete" as TimelineStatus },
    { label: `${profile.copy.incidentLabel} · Minsoo unavailable`, detail: hasIncident ? `Fri 18:00–22:00 · ${profile.copy.peakLabel} gap` : "Waiting for a staffing incident", status: hasIncident ? "complete" as TimelineStatus : "pending" as TimelineStatus },
    { label: "Compared 3 options", detail: hasOptions ? "Deterministic recovery set ready" : hasIncident ? "Comparing bounded recovery choices" : "Open an incident to compare options", status: hasOptions ? "complete" as TimelineStatus : hasIncident ? "active" as TimelineStatus : "pending" as TimelineStatus },
    { label: "Agent proposal", detail: state.preview ? `${candidateName} · preview only` : "Choose a recovery option", status: hasProposal ? "complete" as TimelineStatus : state.activity.state === "proposalReady" ? "active" as TimelineStatus : "pending" as TimelineStatus },
    { label: "Human review", detail: applied || reviewed ? "Candidate edit is part of the reviewed plan" : needsReview ? state.activity.detail ?? "Agent review pending" : state.preview ? "Waiting for your schedule edit" : "Your edit stays uncommitted", status: applied || reviewed ? "complete" as TimelineStatus : needsReview || state.preview ? "active" as TimelineStatus : "pending" as TimelineStatus },
    { label: "Agent review", detail: applied || reviewed ? "Exact live candidate recalculated" : needsReview ? "Evaluate the edited candidate next" : "Runs after the human edit", status: applied || reviewed ? "complete" as TimelineStatus : needsReview ? "active" as TimelineStatus : "pending" as TimelineStatus },
    { label: "Apply reviewed plan", detail: applied ? "Committed to the schedule" : reviewed ? "Ready to apply" : "Only after review", status: applied ? "complete" as TimelineStatus : reviewed ? "active" as TimelineStatus : "pending" as TimelineStatus },
  ];
  return (
    <aside className="assistant-rail" aria-label="Agent activity timeline">
      <div className="assistant-heading"><div><span className="eyebrow">OwnerOps agent</span><h2>Shared-state activity</h2></div><span className={`status-dot ${state.activity.state}`} /></div>
      <div className={`connection-state ${supported === null ? "checking" : supported ? "connected" : "disconnected"}`} aria-label={supported ? "Agent connected with eight WebMCP tools" : "Agent connection status"}>
        <span className="connection-dot" aria-hidden="true" />
        <div><strong>{supported === null ? "Checking shared state" : supported ? "Live shared state" : "Agent not connected"}</strong><small>{supported === null ? "Checking browser capability" : supported ? "WebMCP · 8 tools" : "Manual scheduling still works"}</small></div>
      </div>
      <AssistantAvatar state={state.activity.state} accessory={profile.visual.avatarAccessory} detail={profile.visual.avatarDetail} />
      <div className={`activity-copy activity-${state.activity.state}`} aria-live="polite"><span className="activity-kicker">{activityLabel(state)}</span><strong>{state.activity.message}</strong>{state.activity.detail && <p>{state.activity.detail}</p>}</div>
      <ol className="activity-timeline" aria-label="OwnerOps agent activity">
        {timeline.map((step) => <TimelineStep key={step.label} {...step} />)}
      </ol>
      {state.preview && previewImpact && <section className={`candidate-card candidate-${stage}`} aria-label={`${candidateLabel} candidate`}>
        <div className="candidate-card-head"><span>Candidate plan</span><strong>{candidateLabel}</strong></div>
        <h3>{candidate.label}</h3>
        <small>{state.preview.title}</small>
        <div className="candidate-metrics">
          <div><span>Added payroll</span><strong>{signedWon(visibleImpact.payrollDelta)}</strong></div>
          <div><span>Weekly hours</span><strong>{candidateHours} h</strong></div>
          <div><span>{profile.copy.coverageLabel}</span><strong>{visibleImpact.uncoveredPeakMinutes ? `${visibleImpact.uncoveredPeakMinutes} min gap` : "Covered"}</strong></div>
          <div><span>Warnings</span><strong>{visibleImpact.warnings.length}</strong></div>
        </div>
        <p className="candidate-note">{stage === "human-edit" ? "Local impact updated · agent review pending" : stage === "reviewed" ? "Reviewed from the current live state · ready to apply" : "Preview only · committed schedule unchanged"}</p>
      </section>}
      {needsReview && <div className="agent-prompt"><span>Next agent action</span><strong>Evaluate the current plan</strong><small>Ask the agent to re-read the exact edited candidate.</small></div>}
      {!state.preview && !needsReview && <div className="agent-prompt agent-suggestion"><span>Try asking your agent</span><strong>{profile.copy.suggestedPrompt}</strong><small>Structured review stays on the same live schedule.</small></div>}
      <div className="rail-facts">
        <div><Icon name="users"/><span>{profile.copy.coverageLabel}</span><strong>{visibleImpact.uncoveredPeakMinutes ? `${visibleImpact.uncoveredPeakMinutes} min gap` : "Covered"}</strong></div>
        <div><Icon name="wallet"/><span>Labor ratio</span><strong>{(visibleImpact.laborRatio * 100).toFixed(1)}%</strong></div>
        <div><Icon name="clock"/><span>Warnings</span><strong>{visibleImpact.warnings.length}</strong></div>
      </div>
    </aside>
  );
}

function ScheduleGrid() {
  const { state, runAction } = useAppState();
  const profile = getIndustryProfile(state.business.industry);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const displayShifts = useMemo(() => state.preview ? applyChanges(state.shifts, state.preview.changes) : state.shifts, [state]);
  const previewIds = new Set(state.preview?.changes.map((change) => change.shiftId) ?? []);
  const previewKind = state.preview ? candidateStage(state) : null;
  const previewTag = previewKind === "human-edit" ? "HUMAN EDIT" : previewKind === "reviewed" ? "REVIEWED" : "AGENT PROPOSAL";
  const selectedShift = displayShifts.find((item) => item.id === selectedShiftId) ?? null;

  const onDrop = (event: React.DragEvent, workerId: string, day: string) => {
    event.preventDefault();
    const shiftId = event.dataTransfer.getData("text/ownerops-shift");
    if (shiftId) runAction({ type: "reassign_shift", shiftId, workerId, targetDay: day });
  };

  return (
    <section className="schedule-panel" aria-label="Weekly staff schedule">
      <div className="section-heading"><div><span className="eyebrow">{profile.copy.scheduleContext}</span><h1>Week of August 24</h1></div><div className="schedule-legend"><span><i className="legend-scheduled"/>Committed</span><span><i className="legend-preview"/>Agent proposal</span><span><i className="legend-human"/>Human edit</span><span><i className="legend-gap"/>Uncovered</span></div></div>
      <div className="schedule-scroll">
        <div className="schedule-grid">
          <div className="grid-corner">Team member</div>
          {DEMO_WEEK.map((day) => <div key={day} className={`day-head ${day === "2026-08-28" ? "focus-day" : ""}`}><strong>{dayFormatter.format(new Date(`${day}T12:00:00`)).split(",")[0]}</strong><span>{day.slice(5).replace("-", "/")}</span>{day === "2026-08-28" && state.incident && <em>{profile.copy.incidentLabel}</em>}</div>)}
          {state.workers.map((worker) => (
            <div className="worker-row-fragment" key={worker.id}>
              <div className="worker-label"><span className={`worker-avatar role-${worker.role}`}>{worker.name.slice(0, 1)}</span><div><strong>{worker.name}</strong><span>{profile.roleLabels[worker.role]} · {won.format(worker.hourlyRate)}/h</span></div></div>
              {DEMO_WEEK.map((day) => {
                const shifts = displayShifts.filter((item) => item.workerId === worker.id && shiftDay(item) === day);
                return <div key={day} className={`schedule-cell ${day === "2026-08-28" ? "focus-day" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, worker.id, day)}>
                  {shifts.map((item) => { const isPreview = previewIds.has(item.id); return <button draggable key={item.id} className={`shift-chip ${isPreview ? `preview candidate-${previewKind}` : ""}`} onDragStart={(event) => { event.dataTransfer.setData("text/ownerops-shift", item.id); event.dataTransfer.effectAllowed = "move"; }} title={isPreview ? `${previewTag} · drag or press to reassign` : "Drag or press to reassign"} onClick={() => setSelectedShiftId(item.id)}>{isPreview && <small className="chip-tag">{previewTag}</small>}<span>{formatTime(item.start)}–{formatTime(item.end)}</span><small>{profile.roleLabels[item.role]}</small></button>; })}
                </div>;
              })}
            </div>
          ))}
          <div className="gap-label"><span className="worker-avatar gap">!</span><div><strong>Open {profile.copy.coverageLabel.toLowerCase()}</strong><span>Needs assignment</span></div></div>
          {DEMO_WEEK.map((day) => {
            const gaps = state.shifts.filter((item) => item.status === "uncovered" && shiftDay(item) === day && !previewIds.has(item.id));
            return <div key={day} className={`schedule-cell gap-cell ${day === "2026-08-28" ? "focus-day" : ""}`}>{gaps.map((item) => <button draggable key={item.id} className="shift-chip uncovered" onDragStart={(event) => event.dataTransfer.setData("text/ownerops-shift", item.id)}><Icon name="alert"/><span>{formatTime(item.start)}–{formatTime(item.end)}</span><small>Uncovered</small></button>)}</div>;
          })}
        </div>
      </div>
      <p className="drag-help">Drag any shift to a worker/day cell. During preview, your reassignment updates the candidate without committing it.</p>
      {selectedShift && <ManualShiftEditor key={selectedShift.id} shift={selectedShift} onClose={() => setSelectedShiftId(null)} onSave={(workerId, targetDay) => { runAction({ type: "reassign_shift", shiftId: selectedShift.id, workerId, targetDay }); setSelectedShiftId(null); }} />}
    </section>
  );
}

function ManualShiftEditor({ shift, onClose, onSave }: { shift: Shift; onClose: () => void; onSave: (workerId: string, targetDay: string) => void }) {
  const { state } = useAppState();
  const profile = getIndustryProfile(state.business.industry);
  const [workerId, setWorkerId] = useState(shift.workerId ?? state.workers[0].id);
  const [targetDay, setTargetDay] = useState(shiftDay(shift));
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="shift-editor" role="dialog" aria-modal="true" aria-labelledby="shift-editor-title"><div className="dialog-head"><div><span className="eyebrow">Manual schedule edit</span><h2 id="shift-editor-title">Reassign {formatTime(shift.start)}–{formatTime(shift.end)}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div><label>Team member<select value={workerId} onChange={(event) => setWorkerId(event.target.value)}>{state.workers.map((worker) => <option value={worker.id} key={worker.id}>{worker.name} · {profile.roleLabels[worker.role]}</option>)}</select></label><label>Work day<select value={targetDay} onChange={(event) => setTargetDay(event.target.value)}>{DEMO_WEEK.map((day) => <option value={day} key={day}>{dayFormatter.format(new Date(`${day}T12:00:00`))}</option>)}</select></label><p>This uses the same live action as drag/drop and WebMCP. If a preview is open, only the candidate changes.</p><div className="dialog-actions"><button className="secondary" onClick={onClose}>Cancel</button><button className="primary" onClick={() => onSave(workerId, targetDay)}>Save assignment</button></div></section></div>;
}

function ScenarioPanel() {
  const { state, scenarios, runAction } = useAppState();
  const profile = getIndustryProfile(state.business.industry);
  const incidentShift = state.shifts.find((item) => item.id === state.incident?.shiftId);
  if (!state.incident) {
    return <section className="scenario-panel pre-incident"><div><span className="eyebrow">{profile.copy.incidentLabel} · canonical disruption</span><h2>{profile.copy.disruptionTitle}</h2><p>{profile.copy.disruptionBody}</p></div><button className="danger-soft" onClick={() => runAction({ type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Last-minute absence" })}><Icon name="alert"/>Mark Minsoo unavailable</button></section>;
  }
  return (
    <section className="scenario-panel">
      <div className="scenario-title"><div><span className="eyebrow">{profile.copy.coverageLabel} · recovery comparison</span><h2>Three response options</h2></div><p>{incidentShift ? `${formatTime(incidentShift.start)}–${formatTime(incidentShift.end)} Friday` : "Current incident"} · Ranked by {profile.copy.peakLabel.toLowerCase()}, warnings, cost, and changes</p></div>
      <div className="scenario-list">
        {scenarios.map((scenario, index) => {
          const replacementId = scenario.changes[0]?.workerId;
          const replacement = state.workers.find((worker) => worker.id === replacementId);
          return <article key={scenario.id} className={`scenario-row ${state.preview?.scenarioId === scenario.id ? "selected" : ""}`}>
            <div className="rank">{index + 1}</div><div className="scenario-main"><div><strong>{scenario.title}</strong>{index === 0 && <span className="recommended">Recommended</span>}</div><p>{scenario.summary}</p><small>{scenario.rationale}</small></div>
            <div className="scenario-stat"><span>Added payroll</span><strong>{won.format(scenario.impact.payrollDelta)}</strong></div>
            <div className="scenario-stat"><span>Weekly hours</span><strong>{replacement ? `${scenario.impact.workerWeeklyHours[replacement.id]} h` : "—"}</strong></div>
            <div className="scenario-stat"><span>{profile.copy.peakLabel} gap</span><strong>{scenario.impact.uncoveredPeakMinutes} min</strong></div>
            <div className="scenario-stat optional"><span>Warnings</span><strong>{scenario.impact.warnings.length}</strong></div>
            <div className="scenario-stat optional"><span>Changes</span><strong>{scenario.impact.scheduleChangeCount}</strong></div>
            <button className="secondary compact" onClick={() => runAction({ type: "preview_scenario", scenarioId: scenario.id })}>{state.preview?.scenarioId === scenario.id ? "Previewing" : "Preview"}</button>
          </article>;
        })}
      </div>
    </section>
  );
}

function ImpactStrip({ impact }: { impact: PlanImpact }) {
  const { state } = useAppState();
  const profile = getIndustryProfile(state.business.industry);
  const fridaySales = state.business.expectedSalesByDay["2026-08-28"];
  return <section className="impact-strip" aria-label="Business context"><Metric label="Estimated weekly labor" value={won.format(impact.projectedLaborCost)} hint={`${impact.payrollDelta >= 0 ? "+" : ""}${won.format(impact.payrollDelta)} in current comparison`} /><Metric label="Friday expected sales" value={won.format(fridaySales)} hint={`${profile.copy.peakLabel} · 19:00–21:00`}/><Metric label="Estimated labor ratio" value={`${(impact.laborRatio * 100).toFixed(1)}%`} hint={`${(state.business.targetLaborRatio * 100).toFixed(0)}% target`} tone={impact.laborRatio > state.business.targetLaborRatio ? "warning" : "good"}/><Metric label={`${profile.copy.coverageLabel} status`} value={impact.uncoveredPeakMinutes ? `${impact.uncoveredPeakMinutes} min gap` : "Peak covered"} hint={`${impact.warnings.length} review flag${impact.warnings.length === 1 ? "" : "s"}`} tone={impact.uncoveredPeakMinutes ? "warning" : "good"}/></section>;
}

function PreviewBar() {
  const { state, previewImpact, runAction } = useAppState();
  if (!state.preview || !previewImpact) return null;
  const stage = candidateStage(state);
  const canApply = stage === "reviewed";
  const stageLabel = stage === "human-edit" ? "HUMAN EDIT" : stage === "reviewed" ? "REVIEWED" : "AGENT PROPOSAL";
  const stageCopy = stage === "human-edit" ? "Local impact updated · agent review pending" : stage === "reviewed" ? "Reviewed from current live state · ready to apply" : "Candidate only · committed schedule unchanged";
  return <div className={`preview-bar preview-${stage}`}><div className="preview-bar-copy"><div className="preview-bar-title"><span className="preview-badge">{stageLabel}</span><strong>{state.preview.title}</strong><span className="preview-version">v{state.preview.version}</span></div><span>{stageCopy}</span></div><div className="preview-bar-impact"><span>{signedWon(previewImpact.payrollDelta)} payroll</span><span>{previewImpact.uncoveredPeakMinutes ? `${previewImpact.uncoveredPeakMinutes} min gap` : "Peak covered"}</span><span>{previewImpact.warnings.length} warning{previewImpact.warnings.length === 1 ? "" : "s"}</span></div><div className="preview-bar-actions"><button className="secondary" onClick={() => runAction({ type: "reject_preview" })}>Reject</button><button className="primary" disabled={!canApply} onClick={() => runAction({ type: "apply_preview", previewId: state.preview!.id, version: state.preview!.version })}><Icon name="check"/>{canApply ? "Apply reviewed plan" : "Review required"}</button></div></div>;
}

function SnapshotDialog({ onClose }: { onClose: () => void }) {
  const { state, runAction } = useAppState();
  const [text, setText] = useState(() => serializeSnapshot(state));
  const [message, setMessage] = useState("");
  const copy = async () => { try { await navigator.clipboard.writeText(serializeSnapshot(state)); setMessage("Snapshot copied to clipboard."); } catch { setMessage("Clipboard access was blocked. Select and copy the text below."); } };
  const importText = () => { try { const parsed = parseSnapshot(text); runAction({ type: "import_state", state: parsed }); setMessage("Snapshot restored successfully."); } catch (error) { setMessage(error instanceof Error ? error.message : "Snapshot could not be parsed."); } };
  return <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="snapshot-dialog" role="dialog" aria-modal="true" aria-labelledby="snapshot-title"><div className="dialog-head"><div><span className="eyebrow">Portable handoff</span><h2 id="snapshot-title">Schedule snapshot</h2></div><button className="icon-button" onClick={onClose} aria-label="Close">×</button></div><p>Copy this versioned text into another browser or chat. Import validates the entire document before replacing the schedule.</p><textarea value={text} onChange={(event) => setText(event.target.value)} spellCheck={false} aria-label="OwnerOps snapshot text"/><div className="dialog-actions"><span className={message.includes("blocked") || message.includes("must") || message.includes("malformed") ? "error-text" : "success-text"}>{message}</span><button className="secondary" onClick={copy}><Icon name="copy"/>Copy snapshot</button><button className="primary" onClick={importText}><Icon name="upload"/>Import snapshot</button></div></section></div>;
}

export function OwnerOpsApp() {
  const { state, impact, previewImpact, hydrated, runAction } = useAppState();
  const supported = useWebMcpRegistration();
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const profile = getIndustryProfile(state.business.industry);
  const visibleImpact = previewImpact ?? impact;
  return (
    <main className={`app-shell ${hydrated ? "hydrated" : ""}`} data-industry={profile.id} style={{ "--oo-accent": profile.visual.accent, "--oo-accent-hover": profile.visual.accentHover, "--oo-accent-soft": profile.visual.accentSoft, "--oo-surface-tint": profile.visual.surfaceTint } as CSSProperties}>
      <header className="topbar"><div className="brand"><span className="brand-mark">O</span><div><strong>OwnerOps</strong><span>{state.business.name}</span></div></div><div className="topbar-center"><span className="live-dot"/>{profile.label} · live schedule<span className="divider"/>Aug 24–30, 2026</div><nav><button className="top-action" onClick={() => setSnapshotOpen(true)}><Icon name="copy"/>Snapshot</button><button className="top-action" onClick={() => runAction({ type: "reset_demo" })}><Icon name="refresh"/>Reset demo</button></nav></header>
      <PreviewBar />
      <div className="workspace"><div className="primary-workspace"><ImpactStrip impact={visibleImpact}/><ScheduleGrid/><ScenarioPanel/></div><AssistantRail supported={supported}/></div>
      {snapshotOpen && <SnapshotDialog onClose={() => setSnapshotOpen(false)}/>} 
    </main>
  );
}
