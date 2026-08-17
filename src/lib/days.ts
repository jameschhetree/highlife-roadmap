/**
 * Calendar days, counted where Jaco is.
 *
 * setHours(0,0,0,0) uses whatever zone the machine is in, and Vercel runs in
 * UTC — so a task due at 11pm Eastern was already counted as tomorrow, and
 * anything due "today" showed as due tomorrow every evening.
 *
 * This lives on its own because two different features now need it. Copied into
 * the second one it would have been fixed in one place and left wrong in the
 * other, which is how the bug comes back.
 */

const TZ = "America/New_York";

/** "2026-08-17" for a moment, in Eastern. */
export const dayKey = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);

/** Days since the epoch, by Eastern calendar day. Comparable and subtractable. */
export const dayNumber = (d: Date) => {
  const [y, m, day] = dayKey(d).split("-").map(Number);
  return Date.UTC(y, m - 1, day) / 86400000;
};

/** Days from today. Negative is in the past. */
export const daysBetween = (from: Date, to: Date) => dayNumber(to) - dayNumber(from);

/**
 * The calendar day meant by a stored date, read back in UTC.
 *
 * Due dates come from an <input type="date"> as "2026-08-21" and are stored as
 * 2026-08-21T00:00:00Z — a calendar date, not a moment. Read back in Eastern
 * that instant is 8pm on the 20th, so every due date on the board rendered a day
 * early: a task due Friday said Thursday, to everybody, all the time.
 *
 * `dayNumber` above is for real instants, like now. This is for the dates we
 * store ourselves, and the two must not be mixed up.
 */
export const storedDayNumber = (d: Date) =>
  Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86400000;

/** A stored date, written the way it was meant: "Aug 21". */
export const formatStoredDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric" });
