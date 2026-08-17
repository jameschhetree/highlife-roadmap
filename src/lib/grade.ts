/**
 * The red / yellow / green card system from section 15.
 *
 * The thresholds are stored as text ("&gt;=70%", "60%-69%", "&lt;60%") because the plan
 * says to recalibrate them after 60-90 days and Jaco should be able to edit
 * them. Text cannot be compared against, so the comparison lives here, keyed by
 * metric, and the stored strings stay the display copy. The two must agree —
 * grade.test.ts checks each rule against the wording it claims to implement.
 *
 * Two metrics are computed rather than typed: show rate comes from tours
 * showed over tours booked, and revenue pace from cash collected against the
 * month's target. Asking someone to key in a percentage they could get wrong,
 * when both inputs are already on the card, invites a wrong number on the board.
 */

export type Card = "green" | "yellow" | "red" | null;

export type ScorecardValues = {
  cashCollected: number | null;
  toursBooked: number | null;
  toursShowed: number | null;
  tourCloseRate: number | null;
  recurringConversion: number | null;
  editTurnaround: number | null;
  roadmapCompletion: number | null;
};

/** Higher is better: green at or above `g`, yellow at or above `y`, else red. */
const above = (g: number, y: number) => (v: number): Card =>
  v >= g ? "green" : v >= y ? "yellow" : "red";

/** Lower is better: green at or below `g`, yellow at or below `y`, else red. */
const below = (g: number, y: number) => (v: number): Card =>
  v <= g ? "green" : v <= y ? "yellow" : "red";

export const RULES: Record<string, (v: number) => Card> = {
  "Revenue vs monthly pace": above(100, 90),
  "Tour show rate": above(70, 60),
  "Tour close rate": above(30, 20),
  "Recurring conversion": above(40, 25),
  "Standard edit turnaround": below(7, 9),
  "Roadmap commitments": above(85, 70),
};

/**
 * What each metric is worth this week, or null where the numbers needed are
 * not on the card yet. Null means unknown and is shown as unknown — a missing
 * number must never render as a red or a green.
 */
export function gradeAll(
  v: ScorecardValues,
  monthTarget: number | null
): Record<string, { card: Card; value: number | null; display: string }> {
  const out: Record<string, { card: Card; value: number | null; display: string }> = {};

  const pace =
    v.cashCollected != null && monthTarget && monthTarget > 0
      ? (v.cashCollected / monthTarget) * 100
      : null;

  const showRate =
    v.toursBooked != null && v.toursShowed != null && v.toursBooked > 0
      ? (v.toursShowed / v.toursBooked) * 100
      : null;

  const pairs: [string, number | null, string][] = [
    ["Revenue vs monthly pace", pace, pace == null ? "—" : `${Math.round(pace)}% of target`],
    ["Tour show rate", showRate, showRate == null ? "—" : `${Math.round(showRate)}%`],
    ["Tour close rate", v.tourCloseRate, v.tourCloseRate == null ? "—" : `${v.tourCloseRate}%`],
    ["Recurring conversion", v.recurringConversion, v.recurringConversion == null ? "—" : `${v.recurringConversion}%`],
    ["Standard edit turnaround", v.editTurnaround, v.editTurnaround == null ? "—" : `${v.editTurnaround} days`],
    ["Roadmap commitments", v.roadmapCompletion, v.roadmapCompletion == null ? "—" : `${v.roadmapCompletion}%`],
  ];

  for (const [metric, value, display] of pairs) {
    out[metric] = {
      card: value == null ? null : RULES[metric](value),
      value,
      display,
    };
  }
  return out;
}
