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
