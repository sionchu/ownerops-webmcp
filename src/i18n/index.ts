import type { IndustryId, WorkerRole } from "@/domain/model";
import type { IndustryProfile } from "@/industry/profiles";

export type UiLocale = "en" | "ko" | "ja" | "es" | "zh-CN";

export const UI_LOCALE_STORAGE_KEY = "ownerops.uiLocale.v1";
export const SUPPORTED_UI_LOCALES: UiLocale[] = ["en", "ko", "ja", "es", "zh-CN"];

export const INTL_LOCALE: Record<UiLocale, string> = {
  en: "en-US",
  ko: "ko-KR",
  ja: "ja-JP",
  es: "es-ES",
  "zh-CN": "zh-CN",
};

export function normalizeUiLocale(value: unknown): UiLocale | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace("_", "-").toLowerCase();
  if (normalized === "en" || normalized.startsWith("en-")) return "en";
  if (normalized === "ko" || normalized.startsWith("ko-")) return "ko";
  if (normalized === "ja" || normalized.startsWith("ja-")) return "ja";
  if (normalized === "es" || normalized.startsWith("es-")) return "es";
  if (normalized === "zh" || normalized.startsWith("zh-")) return "zh-CN";
  return null;
}

export function isUiLocale(value: unknown): value is UiLocale {
  return SUPPORTED_UI_LOCALES.includes(value as UiLocale);
}

type IndustryTranslation = {
  label: string;
  roleLabels: Record<WorkerRole, string>;
  copy: IndustryProfile["copy"];
};

type UiCopy = {
  top: {
    liveSharedState: string;
    snapshot: string;
    resetDemo: string;
    dateRange: string;
  };
  rail: {
    ownerOpsAgent: string;
    sharedStateActivity: string;
    checkingSharedState: string;
    liveSharedState: string;
    agentNotConnected: string;
    checkingBrowser: string;
    manualStillWorks: string;
    candidatePlan: string;
    humanEdit: string;
    reviewed: string;
    agentProposal: string;
    addedPayroll: string;
    weeklyHours: string;
    warnings: string;
    covered: string;
    minutesGap: string;
    localImpactPending: string;
    reviewedReady: string;
    previewUncommitted: string;
    nextAgentAction: string;
    evaluateCurrentPlan: string;
    rereadExactEdit: string;
    tryAsking: string;
    sameLiveSchedule: string;
    laborRatio: string;
  };
  timeline: {
    readLive: string;
    canonicalLoaded: string;
    unavailable: string;
    waitingIncident: string;
    compared: string;
    recoveryReady: string;
    comparing: string;
    openIncident: string;
    proposal: string;
    previewOnly: string;
    chooseOption: string;
    humanReview: string;
    editInReviewedPlan: string;
    reviewPending: string;
    waitingEdit: string;
    editUncommitted: string;
    agentReview: string;
    exactRecalculated: string;
    evaluateNext: string;
    runsAfterEdit: string;
    applyReviewed: string;
    committed: string;
    readyToApply: string;
    onlyAfterReview: string;
    fridayGap: string;
  };
  activity: Record<"idle" | "listening" | "checking" | "proposalReady" | "reviewNeeded" | "reviewed" | "warning" | "applied" | "error", { kicker: string; message: string; detail: string }>;
  schedule: {
    weekTitle: string;
    teamMember: string;
    committed: string;
    agentProposal: string;
    humanEdit: string;
    reviewed: string;
    uncovered: string;
    openCoverage: string;
    needsAssignment: string;
    dragHelp: string;
    manualEdit: string;
    reassign: string;
    close: string;
    teamMemberField: string;
    workDay: string;
    manualHelp: string;
    cancel: string;
    saveAssignment: string;
  };
  scenario: {
    canonicalDisruption: string;
    markUnavailable: string;
    recoveryComparison: string;
    threeOptions: string;
    currentIncident: string;
    rankedBy: string;
    recommended: string;
    addedPayroll: string;
    weeklyHours: string;
    gap: string;
    warnings: string;
    changes: string;
    preview: string;
    previewing: string;
    coversShift: (name: string) => string;
    takesShift: (name: string, start: string, end: string) => string;
    restoresCoverage: (ratio: string) => string;
  };
  metrics: {
    coverage: string;
    recoveryCost: string;
    scheduleChanges: string;
    reviewFlags: string;
    covered: string;
    noGap: string;
    actionNeeded: string;
    candidateImpact: string;
    selectOption: string;
    committed: string;
    appliedPlan: string;
    liveSchedule: string;
    needsReview: string;
    clear: string;
  };
  preview: {
    humanEdit: string;
    reviewed: string;
    agentProposal: string;
    localImpactPending: string;
    reviewedReady: string;
    candidateOnly: string;
    payroll: string;
    gap: string;
    covered: string;
    warning: string;
    reject: string;
    applyReviewed: string;
    reviewRequired: string;
  };
  snapshot: {
    portableHandoff: string;
    title: string;
    close: string;
    description: string;
    textLabel: string;
    copied: string;
    blocked: string;
    restored: string;
    parseError: string;
    copy: string;
    import: string;
  };
};

const UI: Record<UiLocale, UiCopy> = {
  en: {
    top: { liveSharedState: "Live shared state", snapshot: "Snapshot", resetDemo: "Reset demo", dateRange: "Aug 24–30, 2026" },
    rail: { ownerOpsAgent: "OwnerOps agent", sharedStateActivity: "Shared-state activity", checkingSharedState: "Checking shared state", liveSharedState: "Live shared state", agentNotConnected: "Agent not connected", checkingBrowser: "Checking browser capability", manualStillWorks: "Manual scheduling still works", candidatePlan: "Candidate plan", humanEdit: "Human edit", reviewed: "Reviewed", agentProposal: "Agent proposal", addedPayroll: "Net wage impact", weeklyHours: "Weekly hours", warnings: "Warnings", covered: "Covered", minutesGap: "min gap", localImpactPending: "Local impact updated · agent review pending", reviewedReady: "Reviewed from the current live state · ready to apply", previewUncommitted: "Preview only · committed schedule unchanged", nextAgentAction: "Next agent action", evaluateCurrentPlan: "Evaluate the current plan", rereadExactEdit: "Ask the agent to re-read the exact edited candidate.", tryAsking: "Try asking your agent", sameLiveSchedule: "Structured review stays on the same live schedule.", laborRatio: "Labor ratio" },
    timeline: { readLive: "Read live schedule", canonicalLoaded: "Canonical schedule loaded", unavailable: "Minsoo unavailable", waitingIncident: "Waiting for a staffing incident", compared: "Compared 3 options", recoveryReady: "Deterministic recovery set ready", comparing: "Comparing bounded recovery choices", openIncident: "Open an incident to compare options", proposal: "Agent proposal", previewOnly: "preview only", chooseOption: "Choose a recovery option", humanReview: "Human review", editInReviewedPlan: "Candidate edit is part of the reviewed plan", reviewPending: "Agent review pending", waitingEdit: "Waiting for your schedule edit", editUncommitted: "Your edit stays uncommitted", agentReview: "Agent review", exactRecalculated: "Exact live candidate recalculated", evaluateNext: "Evaluate the edited candidate next", runsAfterEdit: "Runs after the human edit", applyReviewed: "Apply reviewed plan", committed: "Committed to the schedule", readyToApply: "Ready to apply", onlyAfterReview: "Only after review", fridayGap: "Fri 18:00–22:00" },
    activity: {
      idle: { kicker: "Workspace ready", message: "Schedule ready for review.", detail: "" },
      listening: { kicker: "Listening for agent", message: "Waiting for the next instruction.", detail: "" },
      checking: { kicker: "Analyzing live state", message: "Checking the exact schedule.", detail: "" },
      proposalReady: { kicker: "Agent proposal", message: "Agent proposal ready.", detail: "Nothing has been committed." },
      reviewNeeded: { kicker: "Human edit · review needed", message: "Human edit detected.", detail: "Local impact updated. Agent review pending." },
      reviewed: { kicker: "Agent reviewed", message: "Agent reviewed live plan.", detail: "Exact live candidate recalculated. Ready to apply." },
      warning: { kicker: "Coverage warning", message: "Coverage gap detected.", detail: "Minsoo is unavailable for the Friday evening shift." },
      applied: { kicker: "Plan applied", message: "Plan applied.", detail: "The reviewed shift is committed. Preview cleared." },
      error: { kicker: "Connection issue", message: "Agent connection needs attention.", detail: "Manual scheduling is still available." },
    },
    schedule: { weekTitle: "Week of August 24", teamMember: "Team member", committed: "Committed", agentProposal: "Agent proposal", humanEdit: "Human edit", reviewed: "Reviewed", uncovered: "Uncovered", openCoverage: "Open coverage", needsAssignment: "Needs assignment", dragHelp: "Drag any shift to a worker/day cell. During preview, your reassignment updates the candidate without committing it.", manualEdit: "Manual schedule edit", reassign: "Reassign", close: "Close", teamMemberField: "Team member", workDay: "Work day", manualHelp: "This uses the same live action as drag/drop and WebMCP. If a preview is open, only the candidate changes.", cancel: "Cancel", saveAssignment: "Save assignment" },
    scenario: { canonicalDisruption: "canonical disruption", markUnavailable: "Mark Minsoo unavailable", recoveryComparison: "recovery comparison", threeOptions: "Three response options", currentIncident: "Current incident", rankedBy: "Ranked by coverage, warnings, net wage impact, and changes", recommended: "Recommended", addedPayroll: "Net wage impact", weeklyHours: "Weekly hours", gap: "gap", warnings: "Warnings", changes: "Changes", preview: "Preview", previewing: "Previewing", coversShift: (name) => `${name} covers the shift`, takesShift: (name, start, end) => `${name} takes ${start}–${end} as a single reassignment.`, restoresCoverage: (_ratio) => `Restores peak coverage with one schedule change.` },
    metrics: { coverage: "Coverage", recoveryCost: "Net wage impact", scheduleChanges: "Schedule changes", reviewFlags: "Review flags", covered: "Covered", noGap: "No peak gap", actionNeeded: "Action needed", candidateImpact: "Current candidate", selectOption: "Select a recovery option", committed: "Committed", appliedPlan: "Applied plan", liveSchedule: "Live schedule", needsReview: "Needs review", clear: "Clear" },
    preview: { humanEdit: "HUMAN EDIT", reviewed: "REVIEWED", agentProposal: "AGENT PROPOSAL", localImpactPending: "Local impact updated · agent review pending", reviewedReady: "Reviewed from current live state · ready to apply", candidateOnly: "Candidate only · committed schedule unchanged", payroll: "net wage", gap: "min gap", covered: "Peak covered", warning: "warning", reject: "Reject", applyReviewed: "Apply reviewed plan", reviewRequired: "Review required" },
    snapshot: { portableHandoff: "Portable handoff", title: "Schedule snapshot", close: "Close", description: "Copy this versioned text into another browser or chat. Import validates the entire document before replacing the schedule.", textLabel: "OwnerOps snapshot text", copied: "Snapshot copied to clipboard.", blocked: "Clipboard access was blocked. Select and copy the text below.", restored: "Snapshot restored successfully.", parseError: "Snapshot could not be parsed.", copy: "Copy snapshot", import: "Import snapshot" },
  },
  ko: {
    top: { liveSharedState: "실시간 공유 상태", snapshot: "스냅샷", resetDemo: "데모 초기화", dateRange: "2026년 8월 24–30일" },
    rail: { ownerOpsAgent: "OwnerOps 에이전트", sharedStateActivity: "공유 상태 활동", checkingSharedState: "공유 상태 확인 중", liveSharedState: "실시간 공유 상태", agentNotConnected: "에이전트 연결 안 됨", checkingBrowser: "브라우저 기능 확인 중", manualStillWorks: "수동 스케줄 편집은 계속 사용할 수 있습니다", candidatePlan: "후보 계획", humanEdit: "사람이 수정", reviewed: "검토 완료", agentProposal: "에이전트 제안", addedPayroll: "순 임금 영향", weeklyHours: "주간 근무시간", warnings: "경고", covered: "커버 완료", minutesGap: "분 공백", localImpactPending: "영향 재계산 완료 · 에이전트 검토 대기", reviewedReady: "현재 실시간 상태 기준 검토 완료 · 적용 가능", previewUncommitted: "미리보기만 표시 · 확정 스케줄은 변경되지 않음", nextAgentAction: "다음 에이전트 작업", evaluateCurrentPlan: "현재 계획 검토", rereadExactEdit: "에이전트에게 사람이 수정한 정확한 후보를 다시 읽도록 요청하세요.", tryAsking: "에이전트에게 요청해 보세요", sameLiveSchedule: "구조화된 검토는 같은 실시간 스케줄에서 진행됩니다.", laborRatio: "인건비 비율" },
    timeline: { readLive: "실시간 스케줄 읽기", canonicalLoaded: "기준 스케줄 불러옴", unavailable: "민수 결근", waitingIncident: "인력 이슈 대기 중", compared: "3가지 옵션 비교", recoveryReady: "결정론적 대응안 준비 완료", comparing: "제한된 대응안 비교 중", openIncident: "이슈를 열어 옵션을 비교하세요", proposal: "에이전트 제안", previewOnly: "미리보기", chooseOption: "대응 옵션을 선택하세요", humanReview: "사람 검토", editInReviewedPlan: "사람이 수정한 후보가 검토된 계획에 포함됨", reviewPending: "에이전트 검토 대기", waitingEdit: "스케줄 수정을 기다리는 중", editUncommitted: "수정 내용은 아직 확정되지 않음", agentReview: "에이전트 검토", exactRecalculated: "정확한 실시간 후보 재계산 완료", evaluateNext: "수정된 후보를 다음으로 검토", runsAfterEdit: "사람이 수정한 뒤 실행", applyReviewed: "검토된 계획 적용", committed: "스케줄에 확정 반영됨", readyToApply: "적용 준비 완료", onlyAfterReview: "검토 후에만 적용", fridayGap: "금 18:00–22:00" },
    activity: {
      idle: { kicker: "작업공간 준비됨", message: "검토할 스케줄이 준비되었습니다.", detail: "" },
      listening: { kicker: "에이전트 요청 대기", message: "다음 지시를 기다리고 있습니다.", detail: "" },
      checking: { kicker: "실시간 상태 분석 중", message: "정확한 스케줄 상태를 확인하고 있습니다.", detail: "" },
      proposalReady: { kicker: "에이전트 제안", message: "에이전트 제안이 준비되었습니다.", detail: "아직 아무것도 확정되지 않았습니다." },
      reviewNeeded: { kicker: "사람이 수정 · 검토 필요", message: "사람이 수정한 내용을 감지했습니다.", detail: "영향을 다시 계산했습니다. 에이전트 검토가 필요합니다." },
      reviewed: { kicker: "에이전트 검토 완료", message: "에이전트가 실시간 계획을 검토했습니다.", detail: "정확한 실시간 후보를 재계산했습니다. 이제 적용할 수 있습니다." },
      warning: { kicker: "커버리지 경고", message: "근무 공백이 발생했습니다.", detail: "민수가 금요일 저녁 근무에 참여할 수 없습니다." },
      applied: { kicker: "계획 적용됨", message: "계획이 적용되었습니다.", detail: "검토된 근무가 확정되었습니다. 미리보기를 정리했습니다." },
      error: { kicker: "연결 문제", message: "에이전트 연결을 확인해야 합니다.", detail: "수동 스케줄 편집은 계속 사용할 수 있습니다." },
    },
    schedule: { weekTitle: "8월 24일 주간", teamMember: "팀원", committed: "확정", agentProposal: "에이전트 제안", humanEdit: "사람이 수정", reviewed: "검토 완료", uncovered: "미배정", openCoverage: "미배정 커버리지", needsAssignment: "배정 필요", dragHelp: "근무를 팀원/요일 셀로 드래그하세요. 미리보기 중에는 후보만 바뀌고 확정 스케줄은 변경되지 않습니다.", manualEdit: "수동 스케줄 수정", reassign: "재배정", close: "닫기", teamMemberField: "팀원", workDay: "근무일", manualHelp: "드래그앤드롭 및 WebMCP와 동일한 실시간 액션을 사용합니다. 미리보기가 열려 있으면 후보만 변경됩니다.", cancel: "취소", saveAssignment: "배정 저장" },
    scenario: { canonicalDisruption: "기준 이슈", markUnavailable: "민수 결근 처리", recoveryComparison: "대응안 비교", threeOptions: "세 가지 대응 옵션", currentIncident: "현재 이슈", rankedBy: "커버리지, 경고, 비용, 변경 수 기준 정렬", recommended: "추천", addedPayroll: "순 임금 영향", weeklyHours: "주간 근무시간", gap: "공백", warnings: "경고", changes: "변경", preview: "미리보기", previewing: "미리보는 중", coversShift: (name) => `${name}이(가) 근무를 대체`, takesShift: (name, start, end) => `${name}이(가) ${start}–${end} 근무를 한 번의 재배정으로 맡습니다.`, restoresCoverage: (_ratio) => `한 번의 스케줄 변경으로 피크 커버리지를 복구합니다.` },
    metrics: { coverage: "커버리지", recoveryCost: "순 임금 영향", scheduleChanges: "스케줄 변경", reviewFlags: "검토 항목", covered: "커버 완료", noGap: "피크 공백 없음", actionNeeded: "조치 필요", candidateImpact: "현재 후보 기준", selectOption: "대응 옵션을 선택하세요", committed: "확정", appliedPlan: "적용된 계획", liveSchedule: "현재 스케줄", needsReview: "검토 필요", clear: "이상 없음" },
    preview: { humanEdit: "사람이 수정", reviewed: "검토 완료", agentProposal: "에이전트 제안", localImpactPending: "영향 재계산 완료 · 에이전트 검토 대기", reviewedReady: "현재 실시간 상태 기준 검토 완료 · 적용 가능", candidateOnly: "후보만 표시 · 확정 스케줄은 변경되지 않음", payroll: "순 임금", gap: "분 공백", covered: "피크 커버 완료", warning: "경고", reject: "거절", applyReviewed: "검토된 계획 적용", reviewRequired: "검토 필요" },
    snapshot: { portableHandoff: "이동 가능한 인계", title: "스케줄 스냅샷", close: "닫기", description: "버전이 포함된 텍스트를 다른 브라우저나 채팅으로 복사하세요. 가져오기는 전체 문서를 검증한 뒤 스케줄을 교체합니다.", textLabel: "OwnerOps 스냅샷 텍스트", copied: "스냅샷을 클립보드에 복사했습니다.", blocked: "클립보드 접근이 차단되었습니다. 아래 텍스트를 선택해 복사하세요.", restored: "스냅샷을 복원했습니다.", parseError: "스냅샷을 해석할 수 없습니다.", copy: "스냅샷 복사", import: "스냅샷 가져오기" },
  },
  ja: {
    top: { liveSharedState: "ライブ共有状態", snapshot: "スナップショット", resetDemo: "デモをリセット", dateRange: "2026年8月24–30日" },
    rail: { ownerOpsAgent: "OwnerOps エージェント", sharedStateActivity: "共有状態のアクティビティ", checkingSharedState: "共有状態を確認中", liveSharedState: "ライブ共有状態", agentNotConnected: "エージェント未接続", checkingBrowser: "ブラウザー機能を確認中", manualStillWorks: "手動スケジュールは利用できます", candidatePlan: "候補プラン", humanEdit: "人が編集", reviewed: "レビュー済み", agentProposal: "エージェント提案", addedPayroll: "純賃金差", weeklyHours: "週間時間", warnings: "警告", covered: "カバー済み", minutesGap: "分不足", localImpactPending: "影響を更新 · エージェントレビュー待ち", reviewedReady: "現在のライブ状態からレビュー済み · 適用可能", previewUncommitted: "プレビューのみ · 確定スケジュールは未変更", nextAgentAction: "次のエージェント操作", evaluateCurrentPlan: "現在のプランを評価", rereadExactEdit: "人が編集した正確な候補を再読するようエージェントに依頼してください。", tryAsking: "エージェントに聞いてみる", sameLiveSchedule: "構造化レビューは同じライブスケジュール上で行われます。", laborRatio: "人件費率" },
    timeline: { readLive: "ライブスケジュールを読む", canonicalLoaded: "基準スケジュールを読込済み", unavailable: "Minsoo 欠勤", waitingIncident: "人員インシデント待ち", compared: "3案を比較", recoveryReady: "決定論的な復旧案を準備済み", comparing: "限定された復旧案を比較中", openIncident: "インシデントを開いて比較", proposal: "エージェント提案", previewOnly: "プレビューのみ", chooseOption: "復旧案を選択", humanReview: "人のレビュー", editInReviewedPlan: "編集内容はレビュー済みプランに含まれています", reviewPending: "エージェントレビュー待ち", waitingEdit: "スケジュール編集待ち", editUncommitted: "編集はまだ確定されていません", agentReview: "エージェントレビュー", exactRecalculated: "正確なライブ候補を再計算済み", evaluateNext: "編集候補を次に評価", runsAfterEdit: "人の編集後に実行", applyReviewed: "レビュー済みプランを適用", committed: "スケジュールに確定", readyToApply: "適用可能", onlyAfterReview: "レビュー後のみ", fridayGap: "金 18:00–22:00" },
    activity: { idle: { kicker: "ワークスペース準備完了", message: "レビュー用スケジュールの準備ができました。", detail: "" }, listening: { kicker: "エージェント待機", message: "次の指示を待っています。", detail: "" }, checking: { kicker: "ライブ状態を分析中", message: "正確なスケジュールを確認しています。", detail: "" }, proposalReady: { kicker: "エージェント提案", message: "提案の準備ができました。", detail: "まだ確定されていません。" }, reviewNeeded: { kicker: "人が編集 · レビュー必要", message: "人の編集を検出しました。", detail: "影響を更新しました。エージェントレビューが必要です。" }, reviewed: { kicker: "エージェントレビュー済み", message: "ライブプランをレビューしました。", detail: "正確なライブ候補を再計算しました。適用できます。" }, warning: { kicker: "カバレッジ警告", message: "カバレッジ不足を検出しました。", detail: "Minsoo は金曜夕方のシフトに入れません。" }, applied: { kicker: "プラン適用済み", message: "プランを適用しました。", detail: "レビュー済みシフトを確定し、プレビューをクリアしました。" }, error: { kicker: "接続の問題", message: "エージェント接続を確認してください。", detail: "手動スケジュールは利用できます。" } },
    schedule: { weekTitle: "8月24日の週", teamMember: "チームメンバー", committed: "確定", agentProposal: "エージェント提案", humanEdit: "人が編集", reviewed: "レビュー済み", uncovered: "未配置", openCoverage: "未配置カバレッジ", needsAssignment: "割当が必要", dragHelp: "シフトをメンバー/曜日セルへドラッグしてください。プレビュー中は候補だけが変わり、確定スケジュールは変更されません。", manualEdit: "手動スケジュール編集", reassign: "再割当", close: "閉じる", teamMemberField: "チームメンバー", workDay: "勤務日", manualHelp: "ドラッグ&ドロップと WebMCP と同じライブ操作です。プレビュー中は候補のみ変更されます。", cancel: "キャンセル", saveAssignment: "割当を保存" },
    scenario: { canonicalDisruption: "基準インシデント", markUnavailable: "Minsoo を欠勤にする", recoveryComparison: "復旧案の比較", threeOptions: "3つの対応案", currentIncident: "現在のインシデント", rankedBy: "カバレッジ、警告、コスト、変更数で順位付け", recommended: "推奨", addedPayroll: "純賃金差", weeklyHours: "週間時間", gap: "不足", warnings: "警告", changes: "変更", preview: "プレビュー", previewing: "プレビュー中", coversShift: (name) => `${name} がシフトをカバー`, takesShift: (name, start, end) => `${name} が ${start}–${end} を1回の再割当で担当します。`, restoresCoverage: (_ratio) => `1回の変更でピークをカバーします。` },
    metrics: { coverage: "カバレッジ", recoveryCost: "純賃金差", scheduleChanges: "スケジュール変更", reviewFlags: "レビュー項目", covered: "対応済み", noGap: "ピーク不足なし", actionNeeded: "対応が必要", candidateImpact: "現在の候補", selectOption: "対応案を選択", committed: "確定済み", appliedPlan: "適用済みプラン", liveSchedule: "現在のスケジュール", needsReview: "確認が必要", clear: "問題なし" },
    preview: { humanEdit: "人が編集", reviewed: "レビュー済み", agentProposal: "エージェント提案", localImpactPending: "影響を更新 · エージェントレビュー待ち", reviewedReady: "現在のライブ状態からレビュー済み · 適用可能", candidateOnly: "候補のみ · 確定スケジュールは未変更", payroll: "純賃金", gap: "分不足", covered: "ピークをカバー", warning: "警告", reject: "却下", applyReviewed: "レビュー済みプランを適用", reviewRequired: "レビュー必要" },
    snapshot: { portableHandoff: "ポータブル引き継ぎ", title: "スケジュールスナップショット", close: "閉じる", description: "バージョン付きテキストを別のブラウザーやチャットへコピーできます。インポート時は全体を検証してから置き換えます。", textLabel: "OwnerOps スナップショット", copied: "スナップショットをコピーしました。", blocked: "クリップボードへのアクセスが拒否されました。下のテキストを選択してコピーしてください。", restored: "スナップショットを復元しました。", parseError: "スナップショットを解析できません。", copy: "コピー", import: "インポート" },
  },
  es: {
    top: { liveSharedState: "Estado compartido en vivo", snapshot: "Instantánea", resetDemo: "Reiniciar demo", dateRange: "24–30 ago 2026" },
    rail: { ownerOpsAgent: "Agente de OwnerOps", sharedStateActivity: "Actividad del estado compartido", checkingSharedState: "Comprobando el estado compartido", liveSharedState: "Estado compartido en vivo", agentNotConnected: "Agente desconectado", checkingBrowser: "Comprobando el navegador", manualStillWorks: "La edición manual sigue disponible", candidatePlan: "Plan candidato", humanEdit: "Edición humana", reviewed: "Revisado", agentProposal: "Propuesta del agente", addedPayroll: "Impacto salarial neto", weeklyHours: "Horas semanales", warnings: "Alertas", covered: "Cubierto", minutesGap: "min sin cubrir", localImpactPending: "Impacto actualizado · revisión del agente pendiente", reviewedReady: "Revisado desde el estado en vivo · listo para aplicar", previewUncommitted: "Solo vista previa · el horario confirmado no cambia", nextAgentAction: "Siguiente acción del agente", evaluateCurrentPlan: "Evaluar el plan actual", rereadExactEdit: "Pide al agente que vuelva a leer exactamente el candidato editado.", tryAsking: "Prueba a pedírselo al agente", sameLiveSchedule: "La revisión estructurada usa el mismo horario en vivo.", laborRatio: "Ratio de personal" },
    timeline: { readLive: "Leer horario en vivo", canonicalLoaded: "Horario canónico cargado", unavailable: "Minsoo no disponible", waitingIncident: "Esperando una incidencia", compared: "3 opciones comparadas", recoveryReady: "Conjunto de recuperación listo", comparing: "Comparando opciones acotadas", openIncident: "Abre una incidencia para comparar", proposal: "Propuesta del agente", previewOnly: "solo vista previa", chooseOption: "Elige una opción de recuperación", humanReview: "Revisión humana", editInReviewedPlan: "La edición forma parte del plan revisado", reviewPending: "Revisión del agente pendiente", waitingEdit: "Esperando tu edición", editUncommitted: "Tu edición aún no está confirmada", agentReview: "Revisión del agente", exactRecalculated: "Candidato en vivo recalculado", evaluateNext: "Evaluar el candidato editado", runsAfterEdit: "Se ejecuta después de la edición humana", applyReviewed: "Aplicar plan revisado", committed: "Confirmado en el horario", readyToApply: "Listo para aplicar", onlyAfterReview: "Solo después de revisar", fridayGap: "Vie 18:00–22:00" },
    activity: { idle: { kicker: "Espacio listo", message: "Horario listo para revisión.", detail: "" }, listening: { kicker: "Esperando al agente", message: "Esperando la siguiente instrucción.", detail: "" }, checking: { kicker: "Analizando estado en vivo", message: "Comprobando el horario exacto.", detail: "" }, proposalReady: { kicker: "Propuesta del agente", message: "La propuesta está lista.", detail: "Todavía no se ha confirmado nada." }, reviewNeeded: { kicker: "Edición humana · revisión necesaria", message: "Se detectó una edición humana.", detail: "Impacto actualizado. Falta la revisión del agente." }, reviewed: { kicker: "Revisado por el agente", message: "El agente revisó el plan en vivo.", detail: "Candidato exacto recalculado. Listo para aplicar." }, warning: { kicker: "Alerta de cobertura", message: "Se detectó un hueco de cobertura.", detail: "Minsoo no está disponible para el turno del viernes por la tarde." }, applied: { kicker: "Plan aplicado", message: "Plan aplicado.", detail: "El turno revisado quedó confirmado. Vista previa cerrada." }, error: { kicker: "Problema de conexión", message: "Revisa la conexión del agente.", detail: "La edición manual sigue disponible." } },
    schedule: { weekTitle: "Semana del 24 de agosto", teamMember: "Miembro del equipo", committed: "Confirmado", agentProposal: "Propuesta del agente", humanEdit: "Edición humana", reviewed: "Revisado", uncovered: "Sin cubrir", openCoverage: "Cobertura abierta", needsAssignment: "Necesita asignación", dragHelp: "Arrastra un turno a una celda de persona/día. Durante la vista previa solo cambia el candidato, no el horario confirmado.", manualEdit: "Edición manual del horario", reassign: "Reasignar", close: "Cerrar", teamMemberField: "Miembro del equipo", workDay: "Día de trabajo", manualHelp: "Usa la misma acción en vivo que arrastrar/soltar y WebMCP. Si hay una vista previa, solo cambia el candidato.", cancel: "Cancelar", saveAssignment: "Guardar asignación" },
    scenario: { canonicalDisruption: "incidencia canónica", markUnavailable: "Marcar a Minsoo no disponible", recoveryComparison: "comparación de recuperación", threeOptions: "Tres opciones de respuesta", currentIncident: "Incidencia actual", rankedBy: "Ordenadas por cobertura, alertas, coste y cambios", recommended: "Recomendada", addedPayroll: "Impacto salarial neto", weeklyHours: "Horas semanales", gap: "hueco", warnings: "Alertas", changes: "Cambios", preview: "Vista previa", previewing: "En vista previa", coversShift: (name) => `${name} cubre el turno`, takesShift: (name, start, end) => `${name} cubre ${start}–${end} con una sola reasignación.`, restoresCoverage: (_ratio) => `Recupera la cobertura punta con un solo cambio.` },
    metrics: { coverage: "Cobertura", recoveryCost: "Impacto salarial neto", scheduleChanges: "Cambios de horario", reviewFlags: "Alertas de revisión", covered: "Cubierto", noGap: "Sin brecha punta", actionNeeded: "Requiere acción", candidateImpact: "Candidato actual", selectOption: "Elige una opción de recuperación", committed: "Confirmado", appliedPlan: "Plan aplicado", liveSchedule: "Horario actual", needsReview: "Requiere revisión", clear: "Sin alertas" },
    preview: { humanEdit: "EDICIÓN HUMANA", reviewed: "REVISADO", agentProposal: "PROPUESTA DEL AGENTE", localImpactPending: "Impacto actualizado · revisión pendiente", reviewedReady: "Revisado desde el estado en vivo · listo para aplicar", candidateOnly: "Solo candidato · horario confirmado sin cambios", payroll: "impacto salarial", gap: "min sin cubrir", covered: "Pico cubierto", warning: "alerta", reject: "Descartar", applyReviewed: "Aplicar plan revisado", reviewRequired: "Revisión necesaria" },
    snapshot: { portableHandoff: "Traspaso portátil", title: "Instantánea del horario", close: "Cerrar", description: "Copia este texto versionado a otro navegador o chat. La importación valida todo el documento antes de sustituir el horario.", textLabel: "Texto de instantánea de OwnerOps", copied: "Instantánea copiada al portapapeles.", blocked: "El acceso al portapapeles fue bloqueado. Selecciona y copia el texto de abajo.", restored: "Instantánea restaurada correctamente.", parseError: "No se pudo interpretar la instantánea.", copy: "Copiar instantánea", import: "Importar instantánea" },
  },
  "zh-CN": {
    top: { liveSharedState: "实时共享状态", snapshot: "快照", resetDemo: "重置演示", dateRange: "2026年8月24–30日" },
    rail: { ownerOpsAgent: "OwnerOps 智能体", sharedStateActivity: "共享状态活动", checkingSharedState: "正在检查共享状态", liveSharedState: "实时共享状态", agentNotConnected: "智能体未连接", checkingBrowser: "正在检查浏览器能力", manualStillWorks: "仍可手动编辑排班", candidatePlan: "候选方案", humanEdit: "人工修改", reviewed: "已审核", agentProposal: "智能体建议", addedPayroll: "净工资影响", weeklyHours: "每周工时", warnings: "警告", covered: "已覆盖", minutesGap: "分钟缺口", localImpactPending: "影响已更新 · 等待智能体审核", reviewedReady: "已按当前实时状态审核 · 可应用", previewUncommitted: "仅预览 · 已确认排班未更改", nextAgentAction: "下一步智能体操作", evaluateCurrentPlan: "审核当前方案", rereadExactEdit: "让智能体重新读取人工修改后的准确候选方案。", tryAsking: "试着让智能体处理", sameLiveSchedule: "结构化审核始终基于同一份实时排班。", laborRatio: "人工成本率" },
    timeline: { readLive: "读取实时排班", canonicalLoaded: "基准排班已加载", unavailable: "Minsoo 无法出勤", waitingIncident: "等待人员事件", compared: "已比较3个选项", recoveryReady: "确定性恢复方案已准备", comparing: "正在比较限定方案", openIncident: "打开事件后比较选项", proposal: "智能体建议", previewOnly: "仅预览", chooseOption: "选择一个恢复方案", humanReview: "人工审核", editInReviewedPlan: "人工修改已包含在审核方案中", reviewPending: "等待智能体审核", waitingEdit: "等待你的排班修改", editUncommitted: "修改尚未确认", agentReview: "智能体审核", exactRecalculated: "已重新计算准确的实时候选方案", evaluateNext: "下一步审核修改后的候选方案", runsAfterEdit: "在人工修改后执行", applyReviewed: "应用已审核方案", committed: "已提交到排班", readyToApply: "可以应用", onlyAfterReview: "仅审核后可应用", fridayGap: "周五 18:00–22:00" },
    activity: { idle: { kicker: "工作区已就绪", message: "排班已准备好进行审核。", detail: "" }, listening: { kicker: "等待智能体", message: "正在等待下一条指令。", detail: "" }, checking: { kicker: "正在分析实时状态", message: "正在检查准确排班。", detail: "" }, proposalReady: { kicker: "智能体建议", message: "智能体建议已准备好。", detail: "尚未提交任何更改。" }, reviewNeeded: { kicker: "人工修改 · 需要审核", message: "检测到人工修改。", detail: "影响已更新，需要智能体审核。" }, reviewed: { kicker: "智能体已审核", message: "智能体已审核实时方案。", detail: "已重新计算准确候选方案，可以应用。" }, warning: { kicker: "覆盖警告", message: "发现排班覆盖缺口。", detail: "Minsoo 无法参加周五晚班。" }, applied: { kicker: "方案已应用", message: "方案已应用。", detail: "已审核班次已提交，预览已清除。" }, error: { kicker: "连接问题", message: "请检查智能体连接。", detail: "仍可手动编辑排班。" } },
    schedule: { weekTitle: "8月24日当周", teamMember: "团队成员", committed: "已确认", agentProposal: "智能体建议", humanEdit: "人工修改", reviewed: "已审核", uncovered: "未覆盖", openCoverage: "待覆盖", needsAssignment: "需要分配", dragHelp: "将班次拖到成员/日期单元格。预览期间只更新候选方案，不会更改已确认排班。", manualEdit: "手动编辑排班", reassign: "重新分配", close: "关闭", teamMemberField: "团队成员", workDay: "工作日", manualHelp: "这里与拖放和 WebMCP 使用同一实时操作。存在预览时只修改候选方案。", cancel: "取消", saveAssignment: "保存分配" },
    scenario: { canonicalDisruption: "基准事件", markUnavailable: "将 Minsoo 标记为无法出勤", recoveryComparison: "恢复方案比较", threeOptions: "三种应对方案", currentIncident: "当前事件", rankedBy: "按覆盖、警告、成本和变更数量排序", recommended: "推荐", addedPayroll: "净工资影响", weeklyHours: "每周工时", gap: "缺口", warnings: "警告", changes: "变更", preview: "预览", previewing: "正在预览", coversShift: (name) => `${name} 覆盖该班次`, takesShift: (name, start, end) => `${name} 通过一次重新分配承担 ${start}–${end}。`, restoresCoverage: (_ratio) => `通过一次排班变更恢复高峰覆盖。` },
    metrics: { coverage: "覆盖情况", recoveryCost: "净工资影响", scheduleChanges: "排班变更", reviewFlags: "复核项", covered: "已覆盖", noGap: "高峰无缺口", actionNeeded: "需要处理", candidateImpact: "当前方案", selectOption: "请选择恢复方案", committed: "已提交", appliedPlan: "已应用方案", liveSchedule: "当前排班", needsReview: "需要复核", clear: "无异常" },
    preview: { humanEdit: "人工修改", reviewed: "已审核", agentProposal: "智能体建议", localImpactPending: "影响已更新 · 等待智能体审核", reviewedReady: "已按当前实时状态审核 · 可以应用", candidateOnly: "仅候选方案 · 已确认排班未更改", payroll: "净工资", gap: "分钟缺口", covered: "高峰已覆盖", warning: "警告", reject: "拒绝", applyReviewed: "应用已审核方案", reviewRequired: "需要审核" },
    snapshot: { portableHandoff: "可移交快照", title: "排班快照", close: "关闭", description: "将此版本化文本复制到另一个浏览器或聊天。导入会先验证完整文档，再替换排班。", textLabel: "OwnerOps 快照文本", copied: "快照已复制到剪贴板。", blocked: "剪贴板访问被阻止。请选择并复制下方文本。", restored: "快照恢复成功。", parseError: "无法解析快照。", copy: "复制快照", import: "导入快照" },
  },
};

const INDUSTRY: Record<UiLocale, Partial<Record<IndustryId, IndustryTranslation>>> = {
  en: {},
  ko: {
    diner: { label: "동네 다이너", roleLabels: { barista: "크루", manager: "시프트 리드" }, copy: { scheduleContext: "다이너 근무표 · 서울", peakLabel: "저녁 러시", incidentLabel: "결근", coverageLabel: "러시 커버리지", disruptionTitle: "금요일 저녁 커버리지", disruptionBody: "민수가 18:00–22:00에 배정되어 있습니다. 결근 처리 후 제한된 대응안을 비교하세요.", suggestedPrompt: "민수가 저녁 러시 전에 결근했어요. 세 가지 대응안을 보여주되 아직 적용하지 마세요.", headline: "금요일 러시. 한 명이 부족합니다. 선택지는 세 가지." } },
    pizza: { label: "동네 피자 가게", roleLabels: { barista: "카운터 크루", manager: "시프트 리드" }, copy: { scheduleContext: "피자 가게 근무표 · 서울", peakLabel: "금요일 피자 러시", incidentLabel: "결근", coverageLabel: "러시 커버리지", disruptionTitle: "금요일 저녁 커버리지", disruptionBody: "민수가 18:00–22:00에 배정되어 있습니다. 결근 처리 후 제한된 대응안을 비교하세요.", suggestedPrompt: "민수가 금요일 피자 러시 전에 결근했어요. 세 가지 대응안을 보여주되 아직 적용하지 마세요.", headline: "금요일 피자 러시. 흐름을 멈추지 마세요." } },
    coffee: { label: "동네 커피숍", roleLabels: { barista: "바리스타", manager: "매니저" }, copy: { scheduleContext: "커피숍 근무표 · 서울", peakLabel: "러시 시간", incidentLabel: "결근", coverageLabel: "바 커버리지", disruptionTitle: "금요일 저녁 커버리지", disruptionBody: "민수가 18:00–22:00에 배정되어 있습니다. 결근 처리 후 제한된 대응안을 비교하세요.", suggestedPrompt: "민수가 러시 시간 전에 결근했어요. 세 가지 대응안을 보여주되 아직 적용하지 마세요.", headline: "러시 시간. 바를 빈틈없이 운영하세요." } },
    salon: { label: "동네 살롱", roleLabels: { barista: "스타일리스트", manager: "살롱 리드" }, copy: { scheduleContext: "살롱 근무표 · 서울", peakLabel: "예약 피크", incidentLabel: "결근", coverageLabel: "체어 커버리지", disruptionTitle: "금요일 예약 커버리지", disruptionBody: "민수가 18:00–22:00에 배정되어 있습니다. 결근 처리 후 제한된 대응안을 비교하세요.", suggestedPrompt: "민수가 예약 피크 전에 결근했어요. 세 가지 대응안을 보여주되 아직 적용하지 마세요.", headline: "예약 피크. 모든 체어를 지키세요." } },
    sushi: { label: "동네 스시 레스토랑", roleLabels: { barista: "홀 크루", manager: "시프트 리드" }, copy: { scheduleContext: "스시 레스토랑 근무표 · 서울", peakLabel: "저녁 서비스", incidentLabel: "결근", coverageLabel: "서비스 커버리지", disruptionTitle: "금요일 서비스 커버리지", disruptionBody: "민수가 18:00–22:00에 배정되어 있습니다. 결근 처리 후 제한된 대응안을 비교하세요.", suggestedPrompt: "민수가 저녁 서비스 전에 결근했어요. 세 가지 대응안을 보여주되 아직 적용하지 마세요.", headline: "저녁 서비스. 홀의 균형을 유지하세요." } },
    curry: { label: "동네 커리 하우스", roleLabels: { barista: "서비스 크루", manager: "시프트 리드" }, copy: { scheduleContext: "커리 하우스 근무표 · 서울", peakLabel: "저녁 러시", incidentLabel: "결근", coverageLabel: "서비스 커버리지", disruptionTitle: "금요일 서비스 커버리지", disruptionBody: "민수가 18:00–22:00에 배정되어 있습니다. 결근 처리 후 제한된 대응안을 비교하세요.", suggestedPrompt: "민수가 저녁 러시 전에 결근했어요. 세 가지 대응안을 보여주되 아직 적용하지 마세요.", headline: "저녁 러시. 서비스 커버리지를 지키세요." } },
  },
  ja: {
    diner: { label: "近所のダイナー", roleLabels: { barista: "クルー", manager: "シフトリード" }, copy: { scheduleContext: "ダイナー勤務表 · ソウル", peakLabel: "ディナーラッシュ", incidentLabel: "欠勤", coverageLabel: "ラッシュカバレッジ", disruptionTitle: "金曜夕方のカバレッジ", disruptionBody: "Minsoo は18:00–22:00に割り当てられています。欠勤にして限定された復旧案を比較してください。", suggestedPrompt: "Minsoo がディナーラッシュ前に欠勤しました。3つの案を見せて、まだ適用しないでください。", headline: "金曜のピーク。1人不足。選択肢は3つ。" } },
    pizza: { label: "近所のピザ店", roleLabels: { barista: "カウンタークルー", manager: "シフトリード" }, copy: { scheduleContext: "ピザ店勤務表 · ソウル", peakLabel: "金曜ピザラッシュ", incidentLabel: "欠勤", coverageLabel: "ラッシュカバレッジ", disruptionTitle: "金曜夕方のカバレッジ", disruptionBody: "Minsoo は18:00–22:00に割り当てられています。欠勤にして限定された復旧案を比較してください。", suggestedPrompt: "Minsoo が金曜のピザラッシュ前に欠勤しました。3つの案を見せて、まだ適用しないでください。", headline: "金曜のピザラッシュ。オペレーションを止めない。" } },
    coffee: { label: "近所のコーヒーショップ", roleLabels: { barista: "バリスタ", manager: "マネージャー" }, copy: { scheduleContext: "コーヒー勤務表 · ソウル", peakLabel: "ラッシュ時間", incidentLabel: "欠勤", coverageLabel: "バーカバレッジ", disruptionTitle: "金曜夕方のカバレッジ", disruptionBody: "Minsoo は18:00–22:00に割り当てられています。欠勤にして限定された復旧案を比較してください。", suggestedPrompt: "Minsoo がラッシュ時間前に欠勤しました。3つの案を見せて、まだ適用しないでください。", headline: "ラッシュ時間。バーをしっかりカバー。" } },
    salon: { label: "近所のサロン", roleLabels: { barista: "スタイリスト", manager: "サロンリード" }, copy: { scheduleContext: "サロン勤務表 · ソウル", peakLabel: "予約ピーク", incidentLabel: "欠勤", coverageLabel: "チェアカバレッジ", disruptionTitle: "金曜予約カバレッジ", disruptionBody: "Minsoo は18:00–22:00に割り当てられています。欠勤にして限定された復旧案を比較してください。", suggestedPrompt: "Minsoo が予約ピーク前に欠勤しました。3つの案を見せて、まだ適用しないでください。", headline: "予約ピーク。すべての席を守る。" } },
    sushi: { label: "近所の寿司店", roleLabels: { barista: "フロアクルー", manager: "シフトリード" }, copy: { scheduleContext: "寿司店勤務表 · ソウル", peakLabel: "ディナーサービス", incidentLabel: "欠勤", coverageLabel: "サービスカバレッジ", disruptionTitle: "金曜サービスカバレッジ", disruptionBody: "Minsoo は18:00–22:00に割り当てられています。欠勤にして限定された復旧案を比較してください。", suggestedPrompt: "Minsoo がディナーサービス前に欠勤しました。3つの案を見せて、まだ適用しないでください。", headline: "ディナーサービス。フロアのバランスを保つ。" } },
    curry: { label: "近所のカレーハウス", roleLabels: { barista: "サービスクルー", manager: "シフトリード" }, copy: { scheduleContext: "カレーハウス勤務表 · ソウル", peakLabel: "ディナーラッシュ", incidentLabel: "欠勤", coverageLabel: "サービスカバレッジ", disruptionTitle: "金曜サービスカバレッジ", disruptionBody: "Minsoo は18:00–22:00に割り当てられています。欠勤にして限定された復旧案を比較してください。", suggestedPrompt: "Minsoo がディナーラッシュ前に欠勤しました。3つの案を見せて、まだ適用しないでください。", headline: "ディナーラッシュ。サービスを途切れさせない。" } },
  },
  es: {
    diner: { label: "Restaurante de barrio", roleLabels: { barista: "Equipo", manager: "Jefe de turno" }, copy: { scheduleContext: "Horario del restaurante · Seúl", peakLabel: "Pico de cena", incidentLabel: "Ausencia", coverageLabel: "Cobertura del pico", disruptionTitle: "Cobertura del viernes por la tarde", disruptionBody: "Minsoo está asignado de 18:00 a 22:00. Marca la ausencia para comparar opciones acotadas.", suggestedPrompt: "Minsoo faltó antes del pico de cena. Muéstrame tres opciones, pero no apliques nada todavía.", headline: "Hora punta del viernes. Falta una persona. Tres opciones." } },
    pizza: { label: "Pizzería de barrio", roleLabels: { barista: "Equipo de mostrador", manager: "Jefe de turno" }, copy: { scheduleContext: "Horario de la pizzería · Seúl", peakLabel: "Pico de pizza del viernes", incidentLabel: "Ausencia", coverageLabel: "Cobertura del pico", disruptionTitle: "Cobertura del viernes por la tarde", disruptionBody: "Minsoo está asignado de 18:00 a 22:00. Marca la ausencia para comparar opciones acotadas.", suggestedPrompt: "Minsoo faltó antes del pico del viernes. Muéstrame tres opciones, pero no apliques nada todavía.", headline: "Viernes de máxima demanda. Que la línea siga avanzando." } },
    coffee: { label: "Cafetería de barrio", roleLabels: { barista: "Barista", manager: "Responsable" }, copy: { scheduleContext: "Horario de la cafetería · Seúl", peakLabel: "Franja punta", incidentLabel: "Ausencia", coverageLabel: "Cobertura de barra", disruptionTitle: "Cobertura del viernes por la tarde", disruptionBody: "Minsoo está asignado de 18:00 a 22:00. Marca la ausencia para comparar opciones acotadas.", suggestedPrompt: "Minsoo faltó antes de la franja punta. Muéstrame tres opciones, pero no apliques nada todavía.", headline: "Franja punta. Mantén la barra cubierta." } },
    salon: { label: "Salón de barrio", roleLabels: { barista: "Estilista", manager: "Responsable del salón" }, copy: { scheduleContext: "Horario del salón · Seúl", peakLabel: "Pico de reservas", incidentLabel: "Ausencia", coverageLabel: "Cobertura de sillas", disruptionTitle: "Cobertura de reservas del viernes", disruptionBody: "Minsoo está asignado de 18:00 a 22:00. Marca la ausencia para comparar opciones acotadas.", suggestedPrompt: "Minsoo faltó antes del pico de reservas. Muéstrame tres opciones, pero no apliques nada todavía.", headline: "Pico de reservas. Protege cada silla." } },
    sushi: { label: "Sushi de barrio", roleLabels: { barista: "Equipo de sala", manager: "Jefe de turno" }, copy: { scheduleContext: "Horario del sushi · Seúl", peakLabel: "Servicio de cena", incidentLabel: "Ausencia", coverageLabel: "Cobertura de servicio", disruptionTitle: "Cobertura del viernes", disruptionBody: "Minsoo está asignado de 18:00 a 22:00. Marca la ausencia para comparar opciones acotadas.", suggestedPrompt: "Minsoo faltó antes del servicio de cena. Muéstrame tres opciones, pero no apliques nada todavía.", headline: "Servicio de cena. Mantén la sala equilibrada." } },
    curry: { label: "Casa de curry del barrio", roleLabels: { barista: "Equipo de servicio", manager: "Jefe de turno" }, copy: { scheduleContext: "Horario de Curry House · Seúl", peakLabel: "Pico de cena", incidentLabel: "Ausencia", coverageLabel: "Cobertura de servicio", disruptionTitle: "Cobertura del viernes", disruptionBody: "Minsoo está asignado de 18:00 a 22:00. Marca la ausencia para comparar opciones acotadas.", suggestedPrompt: "Minsoo faltó antes del pico de cena. Muéstrame tres opciones, pero no apliques nada todavía.", headline: "Pico de cena. Mantén el servicio cubierto." } },
  },
  "zh-CN": {
    diner: { label: "社区餐馆", roleLabels: { barista: "店员", manager: "班次负责人" }, copy: { scheduleContext: "餐馆排班 · 首尔", peakLabel: "晚餐高峰", incidentLabel: "缺勤", coverageLabel: "高峰覆盖", disruptionTitle: "周五晚间覆盖", disruptionBody: "Minsoo 当前排班为18:00–22:00。标记缺勤后比较限定的恢复方案。", suggestedPrompt: "Minsoo 在晚餐高峰前请假了。给我三个方案，但先不要应用。", headline: "周五高峰。少一人。三种应对方案。" } },
    pizza: { label: "社区披萨店", roleLabels: { barista: "前台员工", manager: "班次负责人" }, copy: { scheduleContext: "披萨店排班 · 首尔", peakLabel: "周五披萨高峰", incidentLabel: "缺勤", coverageLabel: "高峰覆盖", disruptionTitle: "周五晚间覆盖", disruptionBody: "Minsoo 当前排班为18:00–22:00。标记缺勤后比较限定的恢复方案。", suggestedPrompt: "Minsoo 在周五披萨高峰前请假了。给我三个方案，但先不要应用。", headline: "周五披萨高峰。让出餐节奏继续。" } },
    coffee: { label: "社区咖啡店", roleLabels: { barista: "咖啡师", manager: "经理" }, copy: { scheduleContext: "咖啡店排班 · 首尔", peakLabel: "忙碌时段", incidentLabel: "缺勤", coverageLabel: "吧台覆盖", disruptionTitle: "周五晚间覆盖", disruptionBody: "Minsoo 当前排班为18:00–22:00。标记缺勤后比较限定的恢复方案。", suggestedPrompt: "Minsoo 在忙碌时段前请假了。给我三个方案，但先不要应用。", headline: "忙碌时段。保持吧台有人值守。" } },
    salon: { label: "社区沙龙", roleLabels: { barista: "造型师", manager: "沙龙负责人" }, copy: { scheduleContext: "沙龙排班 · 首尔", peakLabel: "预约高峰", incidentLabel: "缺勤", coverageLabel: "座椅覆盖", disruptionTitle: "周五预约覆盖", disruptionBody: "Minsoo 当前排班为18:00–22:00。标记缺勤后比较限定的恢复方案。", suggestedPrompt: "Minsoo 在预约高峰前请假了。给我三个方案，但先不要应用。", headline: "预约高峰。守住每一把椅子。" } },
    sushi: { label: "社区寿司店", roleLabels: { barista: "前厅员工", manager: "班次负责人" }, copy: { scheduleContext: "寿司店排班 · 首尔", peakLabel: "晚餐服务", incidentLabel: "缺勤", coverageLabel: "服务覆盖", disruptionTitle: "周五服务覆盖", disruptionBody: "Minsoo 当前排班为18:00–22:00。标记缺勤后比较限定的恢复方案。", suggestedPrompt: "Minsoo 在晚餐服务前请假了。给我三个方案，但先不要应用。", headline: "晚餐服务。保持前厅平衡。" } },
    curry: { label: "社区咖喱店", roleLabels: { barista: "服务员工", manager: "班次负责人" }, copy: { scheduleContext: "咖喱店排班 · 首尔", peakLabel: "晚餐高峰", incidentLabel: "缺勤", coverageLabel: "服务覆盖", disruptionTitle: "周五服务覆盖", disruptionBody: "Minsoo 当前排班为18:00–22:00。标记缺勤后比较限定的恢复方案。", suggestedPrompt: "Minsoo 在晚餐高峰前请假了。给我三个方案，但先不要应用。", headline: "晚餐高峰。保持服务覆盖。" } },
  },
};

export function getUiCopy(locale: UiLocale): UiCopy {
  return UI[locale];
}

export function getLocalizedIndustryProfile(profile: IndustryProfile, locale: UiLocale): IndustryProfile {
  if (locale === "en") return profile;
  const translation = INDUSTRY[locale][profile.id];
  if (!translation) return profile;
  return {
    ...profile,
    label: translation.label,
    roleLabels: translation.roleLabels,
    copy: translation.copy,
  };
}
