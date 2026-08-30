"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { AssistantAvatar } from "@/components/assistant-avatar";
import { DEMO_WEEK } from "@/domain/fixtures";
import { applyChanges } from "@/domain/impact";
import type { AppState, PlanImpact, Shift } from "@/domain/model";
import { scheduleActualWageVariance, scheduleCostSummary, scheduleDayRange, scheduledWageForShift } from "@/domain/schedule-cost";
import { INTL_LOCALE, getLocalizedIndustryProfile, getUiCopy, type UiLocale } from "@/i18n";
import { capacityGapCopy, disruptionBody, getOutreachCopy, liveOperatingSummary, markUnavailableLabel, marketScheduleContext, minimumWageLabel, outreachDraft, suggestedIncidentPrompt, unavailableLabel, weekRebuildCopy, weekRebuildTimelineCopy } from "@/i18n/dynamic";
import { getIndustryProfile } from "@/industry/profiles";
import { getMarketLocation, getMarketProfile } from "@/market/profiles";
import { parseSnapshot, serializeSnapshot } from "@/snapshot/snapshot";
import { useAppState } from "@/state/app-state";
import { useWebMcpRegistration } from "@/webmcp/use-webmcp";

const moneyFormatters = new Map<string, Intl.NumberFormat>();

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
function formatDay(locale: UiLocale, day: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], options).format(new Date(`${day}T12:00:00`));
}
function formatMoney(state: AppState, locale: UiLocale, value: number) {
  const key = `${locale}:${state.business.currency}`;
  let formatter = moneyFormatters.get(key);
  if (!formatter) {
    const zeroDecimals = state.business.currency === "KRW" || state.business.currency === "JPY";
    formatter = new Intl.NumberFormat(INTL_LOCALE[locale], {
      style: "currency",
      currency: state.business.currency,
      maximumFractionDigits: zeroDecimals ? 0 : 2,
    });
    moneyFormatters.set(key, formatter);
  }
  return formatter.format(value);
}
function signedMoney(state: AppState, locale: UiLocale, value: number) {
  return `${value >= 0 ? "+" : "−"}${formatMoney(state, locale, Math.abs(value))}`;
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
  const market = getMarketProfile(state.business.market);
  const incidentWorker = state.workers.find((worker) => worker.id === (state.incident?.workerId ?? "minsoo"));
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
  const weekRebuild = state.preview?.kind === "week_rebuild" || state.activity.context === "week_rebuild";
  const activeCapacityGap = state.preview?.capacityGap ?? null;
  const rebuildTimeline = weekRebuildTimelineCopy(locale);
  const multiChangePreview = Boolean(state.preview && state.preview.changes.length > 1);
  const showAvatarCallout = ["warning", "proposalReady", "reviewNeeded", "reviewed", "applied"].includes(state.activity.state);
  const activityDetail = state.activity.state === "warning" && incidentWorker
    ? `${unavailableLabel(locale, incidentWorker.name)} · ${ui.timeline.fridayGap}`
    : activity.detail;
  const timeline = weekRebuild ? [
    { label: ui.timeline.readLive, detail: ui.timeline.canonicalLoaded, status: "complete" as TimelineStatus },
    { label: rebuildTimeline.label, detail: rebuildTimeline.detail, status: hasProposal ? "complete" as TimelineStatus : "active" as TimelineStatus },
    { label: ui.timeline.proposal, detail: state.preview ? `${state.preview.changes.length} ${ui.scenario.changes}` : ui.timeline.chooseOption, status: hasProposal ? "complete" as TimelineStatus : "pending" as TimelineStatus },
    { label: ui.timeline.humanReview, detail: applied || reviewed ? ui.timeline.editInReviewedPlan : needsReview ? ui.timeline.reviewPending : state.preview ? ui.timeline.waitingEdit : ui.timeline.editUncommitted, status: applied || reviewed ? "complete" as TimelineStatus : needsReview || state.preview ? "active" as TimelineStatus : "pending" as TimelineStatus },
    { label: ui.timeline.agentReview, detail: applied || reviewed ? ui.timeline.exactRecalculated : needsReview ? ui.timeline.evaluateNext : ui.timeline.runsAfterEdit, status: applied || reviewed ? "complete" as TimelineStatus : needsReview ? "active" as TimelineStatus : "pending" as TimelineStatus },
    { label: ui.timeline.applyReviewed, detail: applied ? ui.timeline.committed : reviewed ? ui.timeline.readyToApply : ui.timeline.onlyAfterReview, status: applied ? "complete" as TimelineStatus : reviewed ? "active" as TimelineStatus : "pending" as TimelineStatus },
  ] : [
    { label: ui.timeline.readLive, detail: ui.timeline.canonicalLoaded, status: "complete" as TimelineStatus },
    { label: `${profile.copy.incidentLabel} · ${unavailableLabel(locale, incidentWorker?.name ?? "Minsoo")}`, detail: hasIncident ? `${ui.timeline.fridayGap} · ${profile.copy.peakLabel}` : ui.timeline.waitingIncident, status: hasIncident ? "complete" as TimelineStatus : "pending" as TimelineStatus },
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
        <div><strong>{supported === null ? ui.rail.checkingSharedState : supported ? ui.rail.liveSharedState : ui.rail.agentNotConnected}</strong><small>{supported === null ? ui.rail.checkingBrowser : supported ? "WebMCP · 9 tools" : ui.rail.manualStillWorks}</small></div>
      </div>
      <div className={`assistant-avatar-stage ${showAvatarCallout ? "has-callout" : ""}`}>
        {showAvatarCallout && <div className={`activity-copy avatar-callout activity-${state.activity.state}`} aria-live="polite"><span className="activity-kicker">{activity.kicker}</span><strong>{activity.message}</strong>{activityDetail && <p>{activityDetail}</p>}</div>}
        <AssistantAvatar state={state.activity.state} accessory={profile.visual.avatarAccessory} detail={profile.visual.avatarDetail} />
      </div>
      {!showAvatarCallout && <div className={`activity-copy activity-${state.activity.state}`} aria-live="polite"><span className="activity-kicker">{activity.kicker}</span><strong>{activity.message}</strong>{activityDetail && <p>{activityDetail}</p>}</div>}
      <ol className="activity-timeline" aria-label={ui.rail.sharedStateActivity}>
        {timeline.map((step) => <TimelineStep key={step.label} {...step} />)}
      </ol>
      {state.preview && previewImpact && <section className={`candidate-card candidate-${stage}`} aria-label={`${candidateLabel} ${ui.rail.candidatePlan}`}>
        <div className="candidate-card-head"><span>{ui.rail.candidatePlan}</span><strong>{candidateLabel}</strong></div>
        <h3>{multiChangePreview && state.preview ? `${state.preview.changes.length} ${ui.scenario.changes}` : candidate.label}</h3>
        <small>{stage === "human-edit" ? ui.rail.localImpactPending : stage === "reviewed" ? ui.rail.reviewedReady : ui.rail.previewUncommitted}</small>
        <div className="candidate-metrics">
          <div><span>{ui.rail.addedPayroll}</span><strong>{signedMoney(state, locale, visibleImpact.payrollDelta)}</strong></div>
          <div><span>{multiChangePreview ? ui.scenario.changes : ui.rail.weeklyHours}</span><strong>{multiChangePreview ? visibleImpact.scheduleChangeCount : `${candidateHours} h`}</strong></div>
          <div><span>{profile.copy.coverageLabel}</span><strong>{visibleImpact.uncoveredPeakMinutes ? `${visibleImpact.uncoveredPeakMinutes} ${ui.rail.minutesGap}` : ui.rail.covered}</strong></div>
          <div><span>{ui.rail.warnings}</span><strong>{visibleImpact.warnings.length}</strong></div>
        </div>
        <p className="candidate-note">{stage === "human-edit" ? ui.rail.localImpactPending : stage === "reviewed" ? ui.rail.reviewedReady : ui.rail.previewUncommitted}</p>
      </section>}
      {activeCapacityGap && (() => { const gapCopy = capacityGapCopy(locale, profile.roleLabels[activeCapacityGap.role], activeCapacityGap.hoursPerWeek); return <section className="capacity-gap-card" aria-label={gapCopy.eyebrow}><span className="activity-kicker">{gapCopy.eyebrow}</span><h3>{gapCopy.title}</h3><p>{gapCopy.detail}</p></section>; })()}
      {needsReview && <div className="agent-prompt"><span>{ui.rail.nextAgentAction}</span><strong>{ui.rail.evaluateCurrentPlan}</strong><small>{ui.rail.rereadExactEdit}</small></div>}
      {!state.preview && !needsReview && <div className="agent-prompt agent-suggestion"><span>{ui.rail.tryAsking}</span><strong>{suggestedIncidentPrompt(locale, incidentWorker?.name ?? "Minsoo", profile.copy.peakLabel)}</strong><small>{ui.rail.sameLiveSchedule}</small></div>}
      <div className="rail-facts">
        <div><Icon name="users"/><span>{profile.copy.coverageLabel}</span><strong>{visibleImpact.uncoveredPeakMinutes ? `${visibleImpact.uncoveredPeakMinutes} ${ui.rail.minutesGap}` : ui.rail.covered}</strong></div>
        <div><Icon name="refresh"/><span>{ui.scenario.changes}</span><strong>{visibleImpact.scheduleChangeCount}</strong></div>
        <div title={market.wageReference.sourceLabel}><Icon name="wallet"/><span>{minimumWageLabel(locale)}</span><strong>{formatMoney(state, locale, market.wageReference.hourly)}/h</strong></div>
        <div><Icon name="clock"/><span>{ui.rail.warnings}</span><strong>{visibleImpact.warnings.length}</strong></div>
      </div>
    </aside>
  );
}

type ScheduleView = "day" | "week";

function dateOnly(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
}

function weekDatesFor(date: string): string[] {
  const anchor = new Date(`${date.slice(0, 10)}T12:00:00`);
  if (!Number.isFinite(anchor.getTime())) return DEMO_WEEK;
  anchor.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(anchor);
    day.setDate(anchor.getDate() + index);
    return dateOnly(day);
  });
}

function weekRange(weekDays: string[]) {
  const start = weekDays[0] ?? DEMO_WEEK[0];
  const end = scheduleDayRange(weekDays[weekDays.length - 1] ?? DEMO_WEEK[6]).end;
  return { start: `${start}T00:00:00`, end };
}

function formatHours(locale: UiLocale, value: number): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
}

function formatPercent(locale: UiLocale, value: number): string {
  return `${new Intl.NumberFormat(INTL_LOCALE[locale], { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value * 100)}%`;
}

function scheduleDayLabel(locale: UiLocale, day: string): string {
  return formatDay(locale, day, { month: "short", day: "numeric", weekday: "short" });
}

function ScheduleCostSummaryStrip({ state, locale, view, selectedDate, weekDays }: { state: AppState; locale: UiLocale; view: ScheduleView; selectedDate: string; weekDays: string[] }) {
  const ui = getUiCopy(locale);
  const range = view === "day" ? scheduleDayRange(selectedDate) : weekRange(weekDays);
  const summary = scheduleCostSummary(state, range);
  const labels = ui.schedule.costSummary;
  const hasActual = summary.actualHours > 0;
  const hoursLabel = view === "day" ? labels.totalHours : labels.weeklyHours;
  const actualVariance = scheduleActualWageVariance(summary);

  return (
    <section className="schedule-cost-summary" data-testid="schedule-cost-summary" data-view={view} aria-label={labels.scheduledWage}>
      <div className="schedule-cost-item">
        <span>{labels.workerCount}</span>
        <strong>{summary.workerCount}{labels.peopleSuffix}</strong>
      </div>
      <div className="schedule-cost-item">
        <span>{hoursLabel}</span>
        <strong>{formatHours(locale, summary.scheduledHours)}{labels.hoursSuffix}</strong>
      </div>
      <div className="schedule-cost-item schedule-cost-primary">
        <span>{labels.scheduledWage}</span>
        <strong>{formatMoney(state, locale, summary.scheduledWage)}</strong>
      </div>
      <div className="schedule-cost-item">
        {view === "day" && !hasActual ? <>
          <span>{labels.laborRatio}</span>
          <strong>{summary.salesBasis > 0 ? formatPercent(locale, summary.laborRatio) : "—"}</strong>
        </> : <>
          <span>{view === "week" ? labels.currentActualWageCumulative : summary.actualComplete ? labels.actualWage : labels.actualWageCumulative}</span>
          <strong>{hasActual ? formatMoney(state, locale, summary.actualWage) : "—"}</strong>
          {view === "day" && actualVariance !== null && <small>{labels.expectedVsActual} {signedMoney(state, locale, actualVariance)} · {labels.laborRatio} {summary.salesBasis > 0 ? formatPercent(locale, summary.laborRatio) : "—"}</small>}
          {view === "day" && actualVariance === null && <small>{labels.scheduledToday} {formatMoney(state, locale, summary.scheduledWage)} · {labels.laborRatio} {summary.salesBasis > 0 ? formatPercent(locale, summary.laborRatio) : "—"}</small>}
          {view === "week" && <small>{labels.laborRatio} {summary.salesBasis > 0 ? formatPercent(locale, summary.laborRatio) : "—"}{actualVariance !== null ? ` · ${labels.expectedVsActual} ${signedMoney(state, locale, actualVariance)}` : ""}</small>}
        </>}
      </div>
      <div className={`schedule-cost-item ${summary.warningCount > 0 ? "warning" : ""}`}>
        <span>{labels.reviewNeeded}</span>
        <strong>{summary.warningCount}</strong>
      </div>
    </section>
  );
}

function SchedulePlanCost({ state, locale, weekDays }: { state: AppState; locale: UiLocale; weekDays: string[] }) {
  const plan = state.storePlan;
  const hasStaffingPlan = Boolean(plan?.changes.some((change) => change.type === "staffing" || change.type === "shift_release"));
  if (!hasStaffingPlan && !state.preview) return null;

  const range = weekRange(weekDays);
  const baseline = scheduleCostSummary({ ...state, preview: null }, range).scheduledWage;
  const current = scheduleCostSummary(state, range).scheduledWage;
  const before = hasStaffingPlan && plan ? plan.impact.before.laborCost : baseline;
  const after = hasStaffingPlan && plan ? plan.impact.after.laborCost : current;
  const delta = after - before;
  const labels = getUiCopy(locale).schedule.costSummary;

  return <section className="schedule-plan-cost" data-testid="schedule-plan-cost" aria-label={labels.planDelta}>
    <span>{labels.planDelta}</span>
    <strong>{formatMoney(state, locale, before)} → {formatMoney(state, locale, after)}</strong>
    <small>{signedMoney(state, locale, delta)}</small>
  </section>;
}

function ScheduleGrid() {
  const { state, runAction, locale } = useAppState();
  const ui = getUiCopy(locale);
  const profile = getLocalizedIndustryProfile(getIndustryProfile(state.business.industry), locale);
  const location = getMarketLocation(state.business.market, locale);
  const businessDate = state.context?.businessDate ?? DEMO_WEEK[4];
  const weekDays = useMemo(() => weekDatesFor(businessDate), [businessDate]);
  const [view, setView] = useState<ScheduleView>("week");
  const [selectedDate, setSelectedDate] = useState(businessDate);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const displayShifts = useMemo(() => state.preview ? applyChanges(state.shifts, state.preview.changes) : state.shifts, [state]);
  const previewIds = new Set(state.preview?.changes.map((change) => change.shiftId) ?? []);
  const previewKind = state.preview ? candidateStage(state) : null;
  const previewTag = previewKind === "human-edit" ? ui.preview.humanEdit : previewKind === "reviewed" ? ui.preview.reviewed : ui.preview.agentProposal;
  const selectedShift = displayShifts.find((item) => item.id === selectedShiftId) ?? null;
  const activeDate = weekDays.includes(selectedDate) ? selectedDate : weekDays.includes(businessDate) ? businessDate : weekDays[0];
  const visibleDays = view === "day" ? [activeDate] : weekDays;
  const focusDay = state.incident ? shiftDay(state.shifts.find((item) => item.id === state.incident?.shiftId) ?? state.shifts[0]) : businessDate;
  const heading = view === "day" ? ui.schedule.dayTitle.replace("{date}", scheduleDayLabel(locale, activeDate)) : ui.schedule.weekTitle;

  const onDrop = (event: React.DragEvent, workerId: string, day: string) => {
    event.preventDefault();
    const shiftId = event.dataTransfer.getData("text/ownerops-shift");
    if (shiftId) runAction({ type: "reassign_shift", shiftId, workerId, targetDay: day });
  };

  return (
    <section className="schedule-panel" aria-label={heading}>
      <div className="section-heading">
        <div className="schedule-heading-main">
          <div><span className="eyebrow">{marketScheduleContext(locale, profile.copy.scheduleContext, location)}</span><h1>{heading}</h1></div>
          <div className="schedule-view-toggle" role="group" aria-label={ui.schedule.viewSelector}>
            <button type="button" aria-pressed={view === "day"} className={view === "day" ? "active" : ""} onClick={() => setView("day")}>{ui.schedule.day}</button>
            <button type="button" aria-pressed={view === "week"} className={view === "week" ? "active" : ""} onClick={() => setView("week")}>{ui.schedule.week}</button>
          </div>
        </div>
        <div className="schedule-legend"><span><i className="legend-scheduled"/>{ui.schedule.committed}</span><span><i className="legend-preview"/>{ui.schedule.agentProposal}</span><span><i className="legend-human"/>{ui.schedule.humanEdit}</span><span><i className="legend-gap"/>{ui.schedule.uncovered}</span></div>
      </div>
      {view === "day" && <div className="schedule-day-picker" aria-label={ui.schedule.selectDate}>{weekDays.map((day) => <button type="button" key={day} aria-pressed={day === activeDate} className={day === activeDate ? "active" : ""} onClick={() => setSelectedDate(day)}>{scheduleDayLabel(locale, day)}</button>)}</div>}
      <ScheduleCostSummaryStrip state={state} locale={locale} view={view} selectedDate={activeDate} weekDays={weekDays}/>
      <SchedulePlanCost state={state} locale={locale} weekDays={weekDays}/>
      <div className="schedule-scroll">
        <div className={`schedule-grid ${view === "day" ? "day-view" : "week-view"}`} style={{ gridTemplateColumns: `176px repeat(${visibleDays.length}, minmax(104px, 1fr))` }}>
          <div className="grid-corner">{ui.schedule.teamMember}</div>
          {visibleDays.map((day) => {
            const daySummary = scheduleCostSummary(state, scheduleDayRange(day));
            return <div key={day} className={`day-head ${day === focusDay ? "focus-day" : ""}`}><strong>{formatDay(locale, day, { weekday: "short" })}</strong><span>{day.slice(5).replace("-", "/")}</span><small className="day-cost-summary">{formatHours(locale, daySummary.scheduledHours)}{ui.schedule.costSummary.hoursSuffix} · {formatMoney(state, locale, daySummary.scheduledWage)}</small>{day === focusDay && state.incident && <em>{profile.copy.incidentLabel}</em>}</div>;
          })}
          {state.workers.map((worker) => (
            <div className="worker-row-fragment" key={worker.id}>
              <div className="worker-label"><span className={`worker-avatar role-${worker.role}`}>{worker.name.slice(0, 1)}</span><div><strong>{worker.name}</strong><span>{profile.roleLabels[worker.role]} · {formatMoney(state, locale, worker.hourlyRate)}/h</span></div></div>
              {visibleDays.map((day) => {
                const shifts = displayShifts.filter((item) => item.workerId === worker.id && shiftDay(item) === day);
                return <div key={day} className={`schedule-cell ${day === focusDay ? "focus-day" : ""}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => onDrop(event, worker.id, day)}>
                  {shifts.map((item) => { const isPreview = previewIds.has(item.id); return <button draggable key={item.id} className={`shift-chip ${isPreview ? `preview candidate-${previewKind}` : ""}`} onDragStart={(event) => { event.dataTransfer.setData("text/ownerops-shift", item.id); event.dataTransfer.effectAllowed = "move"; }} title={isPreview ? `${previewTag}` : ui.schedule.reassign} onClick={() => setSelectedShiftId(item.id)}>{isPreview && <small className="chip-tag">{previewTag}</small>}<strong className="shift-worker-name">{worker.name}</strong><span className="shift-time">{formatTime(item.start)}–{formatTime(item.end)}</span></button>; })}
                </div>;
              })}
            </div>
          ))}
          <div className="gap-label"><span className="worker-avatar gap">!</span><div><strong>{ui.schedule.openCoverage}</strong><span>{ui.schedule.needsAssignment}</span></div></div>
          {visibleDays.map((day) => {
            const gaps = displayShifts.filter((item) => item.status === "uncovered" && shiftDay(item) === day && !previewIds.has(item.id));
            return <div key={day} className={`schedule-cell gap-cell ${day === focusDay ? "focus-day" : ""}`}>{gaps.map((item) => <button draggable key={item.id} className="shift-chip uncovered" onDragStart={(event) => event.dataTransfer.setData("text/ownerops-shift", item.id)}><Icon name="alert"/><span>{formatTime(item.start)}–{formatTime(item.end)}</span><small>{ui.schedule.uncovered}</small></button>)}</div>;
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
  return <div className="dialog-backdrop shift-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="shift-editor" role="dialog" aria-modal="true" aria-labelledby="shift-editor-title"><div className="dialog-head"><div><span className="eyebrow">{ui.schedule.manualEdit}</span><h2 id="shift-editor-title">{ui.schedule.reassign} {formatTime(shift.start)}–{formatTime(shift.end)}</h2></div><button className="icon-button" onClick={onClose} aria-label={ui.schedule.close}>×</button></div><label>{ui.schedule.teamMemberField}<select value={workerId} onChange={(event) => setWorkerId(event.target.value)}>{state.workers.map((worker) => <option value={worker.id} key={worker.id}>{worker.name} · {profile.roleLabels[worker.role]}</option>)}</select></label><label>{ui.schedule.workDay}<select value={targetDay} onChange={(event) => setTargetDay(event.target.value)}>{DEMO_WEEK.map((day) => <option value={day} key={day}>{formatDay(locale, day, { weekday: "long", month: "short", day: "numeric" })}</option>)}</select></label><p>{ui.schedule.manualHelp}</p><div className="dialog-actions"><button className="secondary" onClick={onClose}>{ui.schedule.cancel}</button><button className="primary" onClick={() => onSave(workerId, targetDay)}>{ui.schedule.saveAssignment}</button></div></section></div>;
}

function ScenarioPanel() {
  const { state, scenarios, runAction, locale } = useAppState();
  const ui = getUiCopy(locale);
  const profile = getLocalizedIndustryProfile(getIndustryProfile(state.business.industry), locale);
  const market = getMarketProfile(state.business.market);
  const outreach = getOutreachCopy(locale);
  const [outreachScenarioId, setOutreachScenarioId] = useState<string | null>(null);
  const [outreachCopied, setOutreachCopied] = useState(false);
  const incidentShift = state.shifts.find((item) => item.id === state.incident?.shiftId);
  const incidentWorker = state.workers.find((worker) => worker.id === (state.incident?.workerId ?? "minsoo"));
  if (!state.incident) {
    if (state.preview?.kind === "week_rebuild") {
      const rebuild = weekRebuildCopy(locale, state.preview.changes.length);
      return <section className="scenario-panel week-rebuild-summary"><div><span className="eyebrow">{rebuild.eyebrow}</span><h2>{rebuild.title}</h2><p>{rebuild.body}</p></div><div className="rebuild-stats"><strong>{state.preview.changes.length} {ui.scenario.changes}</strong><span>{state.preview.impact.uncoveredPeakMinutes ? `${state.preview.impact.uncoveredPeakMinutes} ${ui.rail.minutesGap}` : ui.preview.covered}</span></div></section>;
    }
    return <section className="scenario-panel pre-incident"><div><span className="eyebrow">{profile.copy.incidentLabel} · {ui.scenario.canonicalDisruption}</span><h2>{profile.copy.disruptionTitle}</h2><p>{disruptionBody(locale, incidentWorker?.name ?? "Minsoo")}</p></div><button className="danger-soft" onClick={() => runAction({ type: "mark_unavailable", workerId: "minsoo", shiftId: "fri-minsoo-18", reason: "Last-minute absence" })}><Icon name="alert"/>{markUnavailableLabel(locale, incidentWorker?.name ?? "Minsoo")}</button></section>;
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
          const replacementShiftPay = incidentShift && replacement ? scheduledWageForShift(state, incidentShift, replacement.id) : 0;
          const originalShiftPay = incidentShift && incidentWorker ? scheduledWageForShift(state, incidentShift, incidentWorker.id) : 0;
          return <article key={scenario.id} className={`scenario-row ${state.preview?.scenarioId === scenario.id ? "selected" : ""}`}>
            <div className="rank">{index + 1}</div><div className="scenario-main"><div><strong>{ui.scenario.coversShift(replacementName)}</strong>{index === 0 && <span className="recommended">{ui.scenario.recommended}</span>}</div><p>{ui.scenario.takesShift(replacementName, start, end)}</p><div className="scenario-wage-context"><span>{outreach.hourlyRate} {replacement ? `${formatMoney(state, locale, replacement.hourlyRate)}/h` : "—"}</span><span>{outreach.shiftPay} {formatMoney(state, locale, replacementShiftPay)}</span><span>{outreach.originalPay} {formatMoney(state, locale, originalShiftPay)}</span></div><small>{ui.scenario.restoresCoverage(`${(scenario.impact.laborRatio * 100).toFixed(1)}%`)}</small></div>
            <div className="scenario-stat" title={outreach.wageBasis}><span>{ui.scenario.addedPayroll}</span><strong>{signedMoney(state, locale, scenario.impact.payrollDelta)}</strong></div>
            <div className="scenario-stat"><span>{ui.scenario.weeklyHours}</span><strong>{replacement ? `${scenario.impact.workerWeeklyHours[replacement.id]} h` : "—"}</strong></div>
            <div className="scenario-stat"><span>{profile.copy.peakLabel} {ui.scenario.gap}</span><strong>{scenario.impact.uncoveredPeakMinutes} min</strong></div>
            <div className="scenario-stat optional"><span>{ui.scenario.warnings}</span><strong>{scenario.impact.warnings.length}</strong></div>
            <div className="scenario-stat optional"><span>{ui.scenario.changes}</span><strong>{scenario.impact.scheduleChangeCount}</strong></div>
            <div className="scenario-actions"><button className="secondary compact" onClick={() => runAction({ type: "preview_scenario", scenarioId: scenario.id })}>{state.preview?.scenarioId === scenario.id ? ui.scenario.previewing : ui.scenario.preview}</button><button className="secondary compact outreach-button" onClick={() => { setOutreachScenarioId(scenario.id); setOutreachCopied(false); }}>{outreach.prepare}</button></div>
          </article>;
        })}
      </div>
      {outreachScenarioId && (() => {
        const selected = scenarios.find((scenario) => scenario.id === outreachScenarioId);
        const replacementId = selected?.changes[0]?.workerId;
        const replacement = state.workers.find((worker) => worker.id === replacementId);
        if (!selected || !replacement || !incidentShift) return null;
        const start = formatTime(incidentShift.start);
        const end = formatTime(incidentShift.end);
        const dayLabel = formatDay(locale, shiftDay(incidentShift), { weekday: "long", month: "short", day: "numeric" });
        const message = outreachDraft(locale, state.business.name, replacement.name, dayLabel, start, end);
        const contact = market.workerContacts[replacement.id] ?? "—";
        return <section className="outreach-draft" aria-label={outreach.title}><div className="outreach-head"><div><span className="eyebrow">{outreach.demoContact}</span><h3>{outreach.title}</h3></div><strong>{replacement.name} · {contact}</strong></div><p>{message}</p><div className="outreach-footer"><small>{outreach.draftOnly}</small><button className="secondary compact" onClick={async () => { try { await navigator.clipboard.writeText(message); setOutreachCopied(true); } catch { setOutreachCopied(false); } }}>{outreachCopied ? outreach.copied : outreach.copy}</button></div></section>;
      })()}
    </section>
  );
}

function ImpactStrip({ impact }: { impact: PlanImpact }) {
  const { state, locale } = useAppState();
  const ui = getUiCopy(locale);
  const hasCandidate = Boolean(state.preview);
  const applied = state.activity.state === "applied";
  const recoveryCost = hasCandidate ? signedMoney(state, locale, impact.payrollDelta) : applied ? ui.metrics.committed : "—";
  const changeValue = hasCandidate ? String(impact.scheduleChangeCount) : applied ? ui.metrics.committed : "0";
  return <section className="impact-strip decision-strip" aria-label={ui.top.liveSharedState}>
    <Metric label={ui.metrics.coverage} value={impact.uncoveredPeakMinutes ? `${impact.uncoveredPeakMinutes} ${ui.rail.minutesGap}` : ui.metrics.covered} hint={impact.uncoveredPeakMinutes ? ui.metrics.actionNeeded : ui.metrics.noGap} tone={impact.uncoveredPeakMinutes ? "warning" : "good"}/>
    <Metric label={ui.metrics.recoveryCost} value={recoveryCost} hint={hasCandidate ? ui.metrics.candidateImpact : applied ? ui.metrics.appliedPlan : ui.metrics.selectOption}/>
    <Metric label={ui.metrics.scheduleChanges} value={changeValue} hint={hasCandidate ? ui.metrics.candidateImpact : applied ? ui.metrics.appliedPlan : ui.metrics.liveSchedule}/>
    <Metric label={ui.metrics.reviewFlags} value={String(impact.warnings.length)} hint={impact.warnings.length ? ui.metrics.needsReview : ui.metrics.clear} tone={impact.warnings.length ? "warning" : "good"}/>
  </section>;
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
  return <div className={`preview-bar preview-${stage}`}><div className="preview-bar-copy"><div className="preview-bar-title"><span className="preview-badge">{stageLabel}</span><strong>{candidate.label}</strong><span className="preview-version">v{state.preview.version}</span></div><span>{stageCopy}</span></div><div className="preview-bar-impact"><span>{signedMoney(state, locale, previewImpact.payrollDelta)} {ui.preview.payroll}</span><span>{previewImpact.uncoveredPeakMinutes ? `${previewImpact.uncoveredPeakMinutes} ${ui.preview.gap}` : ui.preview.covered}</span><span>{previewImpact.warnings.length} {ui.preview.warning}</span></div><div className="preview-bar-actions"><button className="secondary" onClick={() => runAction({ type: "reject_preview" })}>{ui.preview.reject}</button><button className="primary" disabled={!canApply} onClick={() => runAction({ type: "apply_preview", previewId: state.preview!.id, version: state.preview!.version })}><Icon name="check"/>{canApply ? ui.preview.applyReviewed : ui.preview.reviewRequired}</button></div></div>;
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
  const { state, impact, previewImpact, scenarios, hydrated, runAction, locale } = useAppState();
  const supported = useWebMcpRegistration();
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const ui = getUiCopy(locale);
  const profile = getLocalizedIndustryProfile(getIndustryProfile(state.business.industry), locale);
  const location = getMarketLocation(state.business.market, locale);
  const visibleImpact = previewImpact ?? impact;
  const operatingSummary = liveOperatingSummary(locale, {
    activityState: state.activity.state,
    hasIncident: Boolean(state.incident),
    hasPreview: Boolean(state.preview),
    optionCount: scenarios.length,
    uncoveredPeakMinutes: visibleImpact.uncoveredPeakMinutes,
    warningCount: visibleImpact.warnings.length,
    payrollDelta: visibleImpact.payrollDelta,
    scheduleChangeCount: visibleImpact.scheduleChangeCount,
    currencyCode: state.business.currency,
    incidentWindow: ui.timeline.fridayGap,
  });
  return (
    <main className={`app-shell ${hydrated ? "hydrated" : ""}`} data-industry={profile.id} data-locale={locale} data-market={state.business.market} data-operating-tone={operatingSummary.tone} style={{ "--oo-accent": profile.visual.accent, "--oo-accent-hover": profile.visual.accentHover, "--oo-accent-soft": profile.visual.accentSoft, "--oo-canvas": profile.visual.canvas, "--oo-surface": profile.visual.surface, "--oo-surface-elevated": profile.visual.surfaceElevated, "--oo-ink": profile.visual.ink, "--oo-secondary-ink": profile.visual.secondaryInk, "--oo-border": profile.visual.border, "--oo-focus-lane": profile.visual.focusLane, "--oo-agent-glow": profile.visual.agentGlow, "--oo-radius-card": profile.visual.radiusCard, "--oo-radius-shift": profile.visual.radiusShift, "--oo-motif-opacity": profile.visual.motifOpacity, "--oo-motion-theme": profile.visual.motionTheme } as CSSProperties}>
      <header className="topbar"><div className="brand"><span className="brand-mark">O</span><div><strong>OwnerOps</strong><span>{state.business.name}</span></div></div><div className="topbar-center"><span className="live-dot"/>{ui.top.liveSharedState}<span className="divider"/>{profile.label} · {location} · {state.business.currency}</div><nav><button className="top-action" onClick={() => setSnapshotOpen(true)}><Icon name="copy"/>{ui.top.snapshot}</button><button className="top-action" onClick={() => runAction({ type: "reset_demo" })}><Icon name="refresh"/>{ui.top.resetDemo}</button></nav><div className="context-stage"><span className="eyebrow">{profile.label} · {location} · {ui.top.dateRange}</span><h1>{operatingSummary.headline}</h1><p>{operatingSummary.detail}</p></div></header>
      <PreviewBar />
      <div className="workspace"><div className="primary-workspace"><ImpactStrip impact={visibleImpact}/><ScenarioPanel/><ScheduleGrid/></div><AssistantRail supported={supported}/></div>
      {snapshotOpen && <SnapshotDialog onClose={() => setSnapshotOpen(false)}/>} 
    </main>
  );
}
