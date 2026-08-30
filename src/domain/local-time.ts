/** Business-wall-clock helpers. DB timestamptz offsets are transport metadata here. */
const PARTS = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2})(?::(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?)?)?/;

function parse(value: string) {
  const match = PARTS.exec(value);
  if (!match) return null;
  const [, year, month, day, hour = "0", minute = "0", second = "0", millis = "0"] = match;
  return { year: Number(year), month: Number(month), day: Number(day), hour: Number(hour), minute: Number(minute), second: Number(second), millis: Number(millis.padEnd(3, "0")) };
}

export function businessTimestamp(value: string): number {
  const p = parse(value);
  return p ? Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.millis) : Number.NaN;
}

export function businessHoursBetween(start: string, end: string): number {
  return (businessTimestamp(end) - businessTimestamp(start)) / 3_600_000;
}

export function businessOverlaps(startA: string, endA: string, startB: string, endB: string): boolean {
  return businessTimestamp(startA) < businessTimestamp(endB) && businessTimestamp(endA) > businessTimestamp(startB);
}

export function businessWeekday(value: string): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const p = parse(value);
  return (p ? new Date(Date.UTC(p.year, p.month - 1, p.day, 12)).getUTCDay() : 0) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

export function addBusinessDays(date: string, days: number): string {
  const p = parse(date);
  if (!p) return date.slice(0, 10);
  const value = new Date(Date.UTC(p.year, p.month - 1, p.day + days, 12));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
}
