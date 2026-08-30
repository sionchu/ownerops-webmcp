import type { Shift, Worker } from "./model";
import { businessOverlaps, businessWeekday } from "./local-time";

function minutes(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

export function workerAvailableForInterval(worker: Worker, start: string, end: string): boolean {
  const exceptionUnavailable = worker.availabilityExceptions?.some((item) => !item.available && businessOverlaps(start, end, item.start, item.end));
  if (exceptionUnavailable) return false;
  const legacyUnavailable = worker.availability?.some((item) => !item.available && businessOverlaps(start, end, item.start, item.end));
  if (legacyUnavailable) return false;
  const rules = worker.regularAvailability;
  if (!rules || rules.length === 0) return true;
  if (start.slice(0, 10) !== end.slice(0, 10)) return false;
  const weekday = businessWeekday(start);
  const shiftStart = minutes(start.slice(11, 16));
  const shiftEnd = minutes(end.slice(11, 16));
  const sameDayRules = rules.filter((rule) => rule.weekday === weekday);
  if (sameDayRules.some((rule) => !rule.available && shiftStart < minutes(rule.end) && shiftEnd > minutes(rule.start))) return false;
  return sameDayRules.some((rule) => rule.available && shiftStart >= minutes(rule.start) && shiftEnd <= minutes(rule.end));
}

export function workerEligibleForShift(worker: Worker, shift: Shift): boolean {
  const roleEligible = worker.role === shift.role || (worker.role === "manager" && shift.role === "barista");
  if (!roleEligible || !workerAvailableForInterval(worker, shift.start, shift.end)) return false;
  const requiredSkills = shift.requiredSkills ?? [];
  return requiredSkills.length === 0 || requiredSkills.every((skill) => worker.skills?.includes(skill));
}
