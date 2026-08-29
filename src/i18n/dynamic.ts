import type { AssistantState, CurrencyCode } from "@/domain/model";
import type { UiLocale } from "@/i18n";

const SUMMARY_INTL: Record<UiLocale, string> = {
  en: "en-US",
  ko: "ko-KR",
  ja: "ja-JP",
  es: "es-ES",
  "zh-CN": "zh-CN",
};

export type LiveOperatingSummary = {
  headline: string;
  detail: string;
  tone: "stable" | "warning" | "proposal" | "review" | "applied" | "error";
};

export type LiveOperatingSummaryInput = {
  activityState: AssistantState;
  hasIncident: boolean;
  hasPreview: boolean;
  optionCount: number;
  uncoveredPeakMinutes: number;
  warningCount: number;
  payrollDelta: number;
  scheduleChangeCount: number;
  currencyCode: CurrencyCode;
  incidentWindow: string;
};

function metricDetail(locale: UiLocale, input: LiveOperatingSummaryInput): string {
  const currency = new Intl.NumberFormat(SUMMARY_INTL[locale], {
    style: "currency",
    currency: input.currencyCode,
    maximumFractionDigits: input.currencyCode === "KRW" || input.currencyCode === "JPY" ? 0 : 2,
  });
  const cost = `${input.payrollDelta >= 0 ? "+" : "−"}${currency.format(Math.abs(input.payrollDelta))}`;

  if (input.hasPreview) {
    switch (locale) {
      case "ko": return `피크 공백 ${input.uncoveredPeakMinutes}분 · 순 임금 영향 ${cost} · 변경 ${input.scheduleChangeCount}건 · 검토 ${input.warningCount}건`;
      case "ja": return `ピーク不足 ${input.uncoveredPeakMinutes}分 · 純賃金差 ${cost} · 変更 ${input.scheduleChangeCount}件 · レビュー ${input.warningCount}件`;
      case "es": return `Brecha punta ${input.uncoveredPeakMinutes} min · Impacto salarial neto ${cost} · ${input.scheduleChangeCount} cambio${input.scheduleChangeCount === 1 ? "" : "s"} · ${input.warningCount} revisión${input.warningCount === 1 ? "" : "es"}`;
      case "zh-CN": return `高峰缺口 ${input.uncoveredPeakMinutes} 分钟 · 净工资影响 ${cost} · ${input.scheduleChangeCount} 项变更 · ${input.warningCount} 项待复核`;
      default: return `Peak gap ${input.uncoveredPeakMinutes} min · Net wage impact ${cost} · ${input.scheduleChangeCount} change${input.scheduleChangeCount === 1 ? "" : "s"} · ${input.warningCount} review item${input.warningCount === 1 ? "" : "s"}`;
    }
  }

  if (input.activityState === "applied") {
    switch (locale) {
      case "ko": return `피크 공백 ${input.uncoveredPeakMinutes}분 · 검토 ${input.warningCount}건 · 계획 확정`;
      case "ja": return `ピーク不足 ${input.uncoveredPeakMinutes}分 · レビュー ${input.warningCount}件 · プラン確定`;
      case "es": return `Brecha punta ${input.uncoveredPeakMinutes} min · ${input.warningCount} revisión${input.warningCount === 1 ? "" : "es"} · Plan confirmado`;
      case "zh-CN": return `高峰缺口 ${input.uncoveredPeakMinutes} 分钟 · ${input.warningCount} 项待复核 · 方案已提交`;
      default: return `Peak gap ${input.uncoveredPeakMinutes} min · ${input.warningCount} review item${input.warningCount === 1 ? "" : "s"} · Plan committed`;
    }
  }

  switch (locale) {
    case "ko": return `피크 공백 ${input.uncoveredPeakMinutes}분 · 검토 ${input.warningCount}건`;
    case "ja": return `ピーク不足 ${input.uncoveredPeakMinutes}分 · レビュー ${input.warningCount}件`;
    case "es": return `Brecha punta ${input.uncoveredPeakMinutes} min · ${input.warningCount} revisión${input.warningCount === 1 ? "" : "es"}`;
    case "zh-CN": return `高峰缺口 ${input.uncoveredPeakMinutes} 分钟 · ${input.warningCount} 项待复核`;
    default: return `Peak gap ${input.uncoveredPeakMinutes} min · ${input.warningCount} review item${input.warningCount === 1 ? "" : "s"}`;
  }
}

export function liveOperatingSummary(locale: UiLocale, input: LiveOperatingSummaryInput): LiveOperatingSummary {
  const metrics = metricDetail(locale, input);

  if (input.activityState === "error") {
    switch (locale) {
      case "ko": return { headline: "에이전트 연결을 확인해야 합니다.", detail: "수동 스케줄 편집은 계속 사용할 수 있습니다.", tone: "error" };
      case "ja": return { headline: "エージェント接続を確認してください。", detail: "手動のスケジュール編集は引き続き利用できます。", tone: "error" };
      case "es": return { headline: "Hay que revisar la conexión del agente.", detail: "La edición manual del horario sigue disponible.", tone: "error" };
      case "zh-CN": return { headline: "需要检查智能体连接。", detail: "仍可继续手动编辑排班。", tone: "error" };
      default: return { headline: "Agent connection needs attention.", detail: "Manual scheduling remains available.", tone: "error" };
    }
  }

  if (input.activityState === "reviewNeeded") {
    switch (locale) {
      case "ko": return { headline: "사람이 수정한 후보를 에이전트가 다시 검토해야 합니다.", detail: `${metrics} · 아직 확정되지 않았습니다.`, tone: "review" };
      case "ja": return { headline: "人が編集した候補をエージェントが再確認する必要があります。", detail: `${metrics} · まだ確定されていません。`, tone: "review" };
      case "es": return { headline: "El agente debe revisar de nuevo la edición humana.", detail: `${metrics} · Aún no se ha confirmado nada.`, tone: "review" };
      case "zh-CN": return { headline: "人工修改后的方案需要智能体重新复核。", detail: `${metrics} · 尚未提交。`, tone: "review" };
      default: return { headline: "The human edit needs agent review.", detail: `${metrics} · Nothing is committed yet.`, tone: "review" };
    }
  }

  if (input.activityState === "reviewed") {
    switch (locale) {
      case "ko": return { headline: "검토된 계획을 적용할 준비가 됐습니다.", detail: `${metrics} · 승인 전까지 확정되지 않습니다.`, tone: "review" };
      case "ja": return { headline: "確認済みのプランを適用できます。", detail: `${metrics} · 承認するまで確定されません。`, tone: "review" };
      case "es": return { headline: "El plan revisado está listo para aplicarse.", detail: `${metrics} · No se confirma hasta recibir aprobación.`, tone: "review" };
      case "zh-CN": return { headline: "已复核方案可以应用。", detail: `${metrics} · 获得批准前不会提交。`, tone: "review" };
      default: return { headline: "The reviewed plan is ready to apply.", detail: `${metrics} · Nothing commits until approval.`, tone: "review" };
    }
  }

  if (input.activityState === "applied") {
    const restored = input.uncoveredPeakMinutes === 0;
    switch (locale) {
      case "ko": return { headline: restored ? "계획을 적용했고 피크 커버리지가 복구됐습니다." : "계획을 적용했습니다. 남은 커버리지 공백을 확인하세요.", detail: metrics, tone: "applied" };
      case "ja": return { headline: restored ? "プランを適用し、ピーク時間のカバレッジが回復しました。" : "プランを適用しました。残っているカバレッジ不足を確認してください。", detail: metrics, tone: "applied" };
      case "es": return { headline: restored ? "Plan aplicado. La cobertura punta se ha recuperado." : "Plan aplicado. Revisa las brechas de cobertura restantes.", detail: metrics, tone: "applied" };
      case "zh-CN": return { headline: restored ? "方案已应用，高峰时段覆盖已恢复。" : "方案已应用，请检查剩余的覆盖缺口。", detail: metrics, tone: "applied" };
      default: return { headline: restored ? "Plan applied. Peak coverage is restored." : "Plan applied. Review the remaining coverage gaps.", detail: metrics, tone: "applied" };
    }
  }

  if (input.hasPreview) {
    switch (locale) {
      case "ko": return { headline: "에이전트 제안을 미리보고 있습니다.", detail: `${metrics} · 확정 스케줄은 그대로입니다.`, tone: "proposal" };
      case "ja": return { headline: "エージェント案をプレビューしています。", detail: `${metrics} · 確定済みのスケジュールは変更されていません。`, tone: "proposal" };
      case "es": return { headline: "Se está previsualizando la propuesta del agente.", detail: `${metrics} · El horario confirmado no ha cambiado.`, tone: "proposal" };
      case "zh-CN": return { headline: "正在预览智能体方案。", detail: `${metrics} · 已确认排班保持不变。`, tone: "proposal" };
      default: return { headline: "The agent proposal is being previewed.", detail: `${metrics} · The committed schedule is unchanged.`, tone: "proposal" };
    }
  }

  if (input.activityState === "proposalReady" && input.optionCount > 0) {
    switch (locale) {
      case "ko": return { headline: `${input.optionCount}가지 대응안을 비교할 준비가 됐습니다.`, detail: metrics, tone: "proposal" };
      case "ja": return { headline: `${input.optionCount}つの対応案を比較できます。`, detail: metrics, tone: "proposal" };
      case "es": return { headline: `Hay ${input.optionCount} opciones de recuperación listas para comparar.`, detail: metrics, tone: "proposal" };
      case "zh-CN": return { headline: `${input.optionCount} 个恢复方案已准备好进行比较。`, detail: metrics, tone: "proposal" };
      default: return { headline: `${input.optionCount} recovery options are ready to compare.`, detail: metrics, tone: "proposal" };
    }
  }

  if (input.hasIncident || input.uncoveredPeakMinutes > 0) {
    switch (locale) {
      case "ko": return { headline: `${input.incidentWindow}에 인력 공백이 발생했습니다.`, detail: metrics, tone: "warning" };
      case "ja": return { headline: `${input.incidentWindow}に人員不足が発生しています。`, detail: metrics, tone: "warning" };
      case "es": return { headline: `Hay una brecha de personal en ${input.incidentWindow}.`, detail: metrics, tone: "warning" };
      case "zh-CN": return { headline: `${input.incidentWindow}出现人员缺口。`, detail: metrics, tone: "warning" };
      default: return { headline: `${input.incidentWindow} has a staffing gap.`, detail: metrics, tone: "warning" };
    }
  }

  if (input.activityState === "checking") {
    switch (locale) {
      case "ko": return { headline: "현재 스케줄을 실시간으로 분석하고 있습니다.", detail: metrics, tone: "stable" };
      case "ja": return { headline: "現在のスケジュールをリアルタイムで分析しています。", detail: metrics, tone: "stable" };
      case "es": return { headline: "Analizando el horario actual en tiempo real.", detail: metrics, tone: "stable" };
      case "zh-CN": return { headline: "正在实时分析当前排班。", detail: metrics, tone: "stable" };
      default: return { headline: "Analyzing the current schedule in real time.", detail: metrics, tone: "stable" };
    }
  }

  switch (locale) {
    case "ko": return { headline: "피크 시간 커버리지가 유지되고 있습니다.", detail: metrics, tone: "stable" };
    case "ja": return { headline: "ピーク時間のカバレッジは確保されています。", detail: metrics, tone: "stable" };
    case "es": return { headline: "La cobertura de horas punta está asegurada.", detail: metrics, tone: "stable" };
    case "zh-CN": return { headline: "高峰时段覆盖正常。", detail: metrics, tone: "stable" };
    default: return { headline: "Peak coverage is intact.", detail: metrics, tone: "stable" };
  }
}

export function getOutreachCopy(locale: UiLocale) {
  switch (locale) {
    case "ko": return { prepare: "연락 준비", title: "대체 근무 연락 초안", demoContact: "예제 연락처", shiftPay: "대체근무 임금", originalPay: "원래 근무 임금", hourlyRate: "시급", copy: "문자 초안 복사", copied: "복사됨", draftOnly: "데모 초안만 생성됩니다. 실제 문자나 전화는 전송되지 않습니다.", wageBasis: "순 임금 영향은 이 데모에서 결근 시간을 무급으로 가정하고 원래 배정자 임금과 비교합니다." };
    case "ja": return { prepare: "連絡を準備", title: "代替勤務の連絡下書き", demoContact: "デモ連絡先", shiftPay: "代替シフト賃金", originalPay: "元のシフト賃金", hourlyRate: "時給", copy: "メッセージ下書きをコピー", copied: "コピー済み", draftOnly: "デモ用の下書きのみ作成します。実際のSMSや電話は送信されません。", wageBasis: "純賃金差は、このデモでは欠勤時間を無給として元の担当者の賃金と比較します。" };
    case "es": return { prepare: "Preparar contacto", title: "Borrador para cubrir el turno", demoContact: "Contacto de demo", shiftPay: "Coste del turno sustituto", originalPay: "Coste del turno original", hourlyRate: "Tarifa por hora", copy: "Copiar borrador", copied: "Copiado", draftOnly: "Solo se prepara un borrador de demo. No se envía ningún SMS ni llamada real.", wageBasis: "El impacto salarial neto supone, solo para esta demo, que las horas de ausencia no se pagan y se compara con el coste original." };
    case "zh-CN": return { prepare: "准备联系", title: "替班联系草稿", demoContact: "演示联系方式", shiftPay: "替班工资", originalPay: "原排班工资", hourlyRate: "时薪", copy: "复制短信草稿", copied: "已复制", draftOnly: "仅生成演示草稿，不会实际发送短信或拨打电话。", wageBasis: "净工资影响在本演示中假设缺勤时段不计薪，并与原排班员工工资进行比较。" };
    default: return { prepare: "Prepare contact", title: "Coverage outreach draft", demoContact: "Demo contact", shiftPay: "Replacement shift pay", originalPay: "Original shift pay", hourlyRate: "Hourly rate", copy: "Copy message draft", copied: "Copied", draftOnly: "Demo draft only. No real SMS or phone call is sent.", wageBasis: "Net wage impact assumes unpaid call-out hours in this demo and compares against the originally assigned worker." };
  }
}

export function outreachDraft(locale: UiLocale, businessName: string, workerName: string, dayLabel: string, start: string, end: string): string {
  switch (locale) {
    case "ko": return `${workerName}님, ${businessName}입니다. ${dayLabel} ${start}–${end} 대체 근무 가능하신가요? 가능 여부를 알려주세요.`;
    case "ja": return `${workerName}さん、${businessName}です。${dayLabel} ${start}–${end} の代替シフトに入れますか？対応可能か教えてください。`;
    case "es": return `Hola ${workerName}, soy de ${businessName}. ¿Puedes cubrir el turno del ${dayLabel}, de ${start} a ${end}? Confírmame si estás disponible.`;
    case "zh-CN": return `${workerName}，这里是${businessName}。你能否顶替 ${dayLabel} ${start}–${end} 的班次？请回复是否有空。`;
    default: return `Hi ${workerName}, this is ${businessName}. Can you cover the ${dayLabel} shift from ${start}–${end}? Please let me know if you're available.`;
  }
}

export function unavailableLabel(locale: UiLocale, name: string): string {
  switch (locale) {
    case "ko": return `${name} 결근`;
    case "ja": return `${name}が欠勤`;
    case "es": return `${name} no está disponible`;
    case "zh-CN": return `${name}无法出勤`;
    default: return `${name} unavailable`;
  }
}

export function markUnavailableLabel(locale: UiLocale, name: string): string {
  switch (locale) {
    case "ko": return `${name} 결근 처리`;
    case "ja": return `${name}を欠勤にする`;
    case "es": return `Marcar a ${name} como no disponible`;
    case "zh-CN": return `将 ${name} 标记为无法出勤`;
    default: return `Mark ${name} unavailable`;
  }
}

export function disruptionBody(locale: UiLocale, name: string): string {
  switch (locale) {
    case "ko": return `${name}은 현재 금요일 18:00–22:00 근무로 배정되어 있습니다. 결근 처리 후 제한된 대응안을 비교할 수 있습니다.`;
    case "ja": return `${name}は現在、金曜日18:00–22:00のシフトに入っています。欠勤にすると、限定された対応案を比較できます。`;
    case "es": return `${name} está asignado actualmente al turno del viernes de 18:00 a 22:00. Marca la ausencia para comparar opciones de cobertura acotadas.`;
    case "zh-CN": return `${name}目前被安排在周五18:00–22:00的班次。标记缺勤后即可比较有限的补班方案。`;
    default: return `${name} is currently assigned 18:00–22:00 on Friday. Mark the call-out to compare the bounded recovery choices.`;
  }
}

export function suggestedIncidentPrompt(locale: UiLocale, name: string, peakLabel: string): string {
  switch (locale) {
    case "ko": return `${name}이 ${peakLabel} 전에 결근했어. 세 가지 대응안을 보여주되 아직 적용하지 마.`;
    case "ja": return `${name}が${peakLabel}の前に欠勤しました。3つの対応案を見せて、まだ適用しないでください。`;
    case "es": return `${name} faltó antes de ${peakLabel}. Muéstrame tres opciones, pero no apliques nada todavía.`;
    case "zh-CN": return `${name}在${peakLabel}前请假了。给我三个方案，但先不要应用。`;
    default: return `${name} called out before ${peakLabel}. Show me three options, but don't apply anything yet.`;
  }
}

export function marketScheduleContext(_locale: UiLocale, baseContext: string, location: string): string {
  const prefix = baseContext.split(" · ")[0];
  return `${prefix} · ${location}`;
}

export function minimumWageLabel(locale: UiLocale): string {
  switch (locale) {
    case "ko": return "공식 임금 기준";
    case "ja": return "公的賃金基準";
    case "es": return "Referencia salarial oficial";
    case "zh-CN": return "官方工资基准";
    default: return "Official wage reference";
  }
}
