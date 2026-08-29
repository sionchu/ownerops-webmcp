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

export function marketScheduleContext(locale: UiLocale, baseContext: string, location: string): string {
  const prefix = baseContext.split(" · ")[0];
  switch (locale) {
    case "ko": return `${prefix} · ${location}`;
    case "ja": return `${prefix} · ${location}`;
    case "es": return `${prefix} · ${location}`;
    case "zh-CN": return `${prefix} · ${location}`;
    default: return `${prefix} · ${location}`;
  }
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
