/**
 * Which date a meeting belongs to.
 *
 * The Meetings tab showed "Mondays, 10:00 AM · 1 logged" and no dates at all, so
 * Jaco could not tell when the logged one was, and had no way to see what
 * happens next Monday. Each meeting type has a weekday; these work out the
 * occurrence being logged and the one coming up.
 *
 * All in Eastern, because a Sunday-evening session on a machine already in
 * Monday would otherwise log the wrong day.
 */

const TZ = "America/New_York";

const WEEKDAY: Record<string, number> = {
  MondayBusiness: 1,
  MondayMonthly: 1,
  WednesdayTeam: 3,
  SundayBrand: 0,
};

/** Today's date in Eastern, as YYYY-MM-DD. */
export function localToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
}

function weekdayOf(ymd: string): number {
  // Parsed at noon UTC so the weekday cannot shift with the offset.
  return new Date(`${ymd}T12:00:00Z`).getUTCDay();
}

function shift(ymd: string, days: number): string {
  return new Date(Date.parse(`${ymd}T12:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
}

/**
 * The occurrence to log now: today if today is that weekday, otherwise the most
 * recent one that has passed. Logging Monday's numbers on a Tuesday should
 * attach them to Monday, not to Tuesday.
 */
export function occurrenceToLog(kind: string, today = localToday()): string {
  const target = WEEKDAY[kind] ?? 1;
  const cur = weekdayOf(today);
  const back = (cur - target + 7) % 7;
  return shift(today, -back);
}

/** The next time this meeting happens after the one being logged. */
export function nextOccurrence(kind: string, today = localToday()): string {
  const target = WEEKDAY[kind] ?? 1;
  const cur = weekdayOf(today);
  const ahead = (target - cur + 7) % 7 || 7;
  return shift(today, ahead);
}

/** "Mon 24 Aug" */
export function pretty(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC", weekday: "short", month: "short", day: "numeric",
  });
}

/** Whether a monthly review is due: the first occurrence of that weekday in the month. */
export function isFirstOfMonth(ymd: string): boolean {
  return Number(ymd.slice(8, 10)) <= 7;
}
