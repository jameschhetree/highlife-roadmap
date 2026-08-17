/**
 * The monthly review, built from the weekly cards.
 *
 * Section 12 makes the first Monday of the month a 90-minute Monthly Business
 * Review rather than an extra meeting, and its questions are all "what did we
 * collect" — which is the sum of what was already on the Monday cards. Asking
 * anyone to key those numbers a second time invites two versions of the same
 * month, and the plan's argument for the scoreboard is one set of definitions.
 *
 * Totals for money and counts. Averages for rates, because adding four
 * percentages together is meaningless.
 */

export type WeeklyCard = {
  date: string;
  cashCollected: number | null;
  podcastRevenue: number | null;
  podcastMrr: number | null;
  musicRevenue: number | null;
  leads: number | null;
  toursBooked: number | null;
  toursShowed: number | null;
  tourCloseRate: number | null;
  recurringConversion: number | null;
  roomHours: number | null;
  editTurnaround: number | null;
  roadmapCompletion: number | null;
};

export type Rollup = {
  monthKey: string;
  monthLabel: string;
  weeks: number;
  totals: Record<string, number | null>;
  averages: Record<string, number | null>;
};

const TOTAL_FIELDS = [
  "cashCollected", "podcastRevenue", "musicRevenue",
  "leads", "toursBooked", "toursShowed",
] as const;

const AVERAGE_FIELDS = [
  "podcastMrr", "tourCloseRate", "recurringConversion",
  "roomHours", "editTurnaround", "roadmapCompletion",
] as const;

/** The seven days a Monday card reports on: the week that ended the day before. */
export function coveredWeekEnd(meetingDate: string): Date {
  return new Date(Date.parse(meetingDate) - 86400000);
}

/** The calendar month a review held on `reviewDate` is reviewing: the one before. */
export function monthUnderReview(reviewDate: string): { key: string; label: string } {
  const d = new Date(reviewDate);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth(); // 0-based, this month
  const prev = new Date(Date.UTC(y, m - 1, 1));
  const key = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, "0")}`;
  const label = prev.toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
  return { key, label };
}

export function rollUp(reviewDate: string, weekly: WeeklyCard[]): Rollup {
  const { key, label } = monthUnderReview(reviewDate);

  // A week belongs to the month its Sunday falls in, so a week straddling the
  // month end is counted once rather than split or double-counted.
  const inMonth = weekly.filter((w) => {
    const end = coveredWeekEnd(w.date);
    const k = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}`;
    return k === key;
  });

  const totals: Record<string, number | null> = {};
  for (const f of TOTAL_FIELDS) {
    const vals = inMonth.map((w) => w[f]).filter((v): v is number => v != null);
    // No figures means unknown, not zero. A zero here would report a month of
    // no revenue when the truth is a month nobody filled in.
    totals[f] = vals.length ? vals.reduce((a, b) => a + b, 0) : null;
  }

  const averages: Record<string, number | null> = {};
  for (const f of AVERAGE_FIELDS) {
    const vals = inMonth.map((w) => w[f]).filter((v): v is number => v != null);
    averages[f] = vals.length
      ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
      : null;
  }

  return { monthKey: key, monthLabel: label, weeks: inMonth.length, totals, averages };
}


/**
 * Cash collected per calendar month, summed from the Monday cards.
 *
 * Derived rather than entered. James asked for target against actual on the
 * Money tab, and the actual already exists on the weekly cards — giving the
 * month its own input would let the two drift and produce two answers to "what
 * did we collect", which is the thing the plan's one-definition rule exists to
 * prevent.
 */
export function collectedByMonth(weekly: WeeklyCard[]): Record<string, number | null> {
  const out: Record<string, { sum: number; any: boolean }> = {};
  for (const w of weekly) {
    const end = coveredWeekEnd(w.date);
    const key = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, "0")}`;
    out[key] ??= { sum: 0, any: false };
    if (w.cashCollected != null) {
      out[key].sum += w.cashCollected;
      out[key].any = true;
    }
  }
  // A month with cards but no figures is unknown, not a month of no revenue.
  return Object.fromEntries(
    Object.entries(out).map(([k, v]) => [k, v.any ? v.sum : null])
  );
}
