import type { UiLocale } from "@/i18n";

const COPY: Record<UiLocale, { month: string; monthTitle: (label: string) => string; weekSummary: string; noSchedule: string; startTime: string; endTime: string; invalidTime: string }> = {
  en: { month: "Month", monthTitle: (label) => `${label} · weekly overview`, weekSummary: "Week", noSchedule: "No DB schedule", startTime: "Start", endTime: "End", invalidTime: "End time must be after start time." },
  ko: { month: "월간", monthTitle: (label) => `${label} · 주간 현황`, weekSummary: "주간", noSchedule: "DB 스케줄 없음", startTime: "시작", endTime: "종료", invalidTime: "종료 시간은 시작 시간보다 늦어야 합니다." },
  ja: { month: "月間", monthTitle: (label) => `${label} · 週間概要`, weekSummary: "週", noSchedule: "DBスケジュールなし", startTime: "開始", endTime: "終了", invalidTime: "終了時刻は開始時刻より後にしてください。" },
  es: { month: "Mes", monthTitle: (label) => `${label} · resumen semanal`, weekSummary: "Semana", noSchedule: "Sin horario DB", startTime: "Inicio", endTime: "Fin", invalidTime: "La hora de fin debe ser posterior al inicio." },
  "zh-CN": { month: "月", monthTitle: (label) => `${label} · 周概览`, weekSummary: "周", noSchedule: "无 DB 排班", startTime: "开始", endTime: "结束", invalidTime: "结束时间必须晚于开始时间。" },
};

export function getScheduleHierarchyCopy(locale: UiLocale) {
  return COPY[locale];
}
