import type { UiLocale } from "@/i18n";

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
