import type { Counts } from "./measure";

/**
 * The non-scorecard numbers a key result can be measured against.
 *
 * This lived inside the OKRs view. The Monday flow needs the same figures to
 * say what a week's answers did to the quarter, and two copies of "what counts
 * as a meeting we expected" is how the two screens start disagreeing.
 */
export type CountableItem = {
  view: string;
  owner: string;
  dueDate: string | null;
  sop?: { published?: boolean } | null;
};

/** The sprint began on 10 August 2026 and the plan schedules three meetings a week. */
const SPRINT_START = Date.parse("2026-08-10T00:00:00-04:00");

export function countsFrom(
  items: CountableItem[],
  meetingCount: number,
  now: number = Date.now()
): Counts {
  const sops = items.filter((i) => i.view === "SOP");
  const thisWeek = items.filter((i) => i.view === "ThisWeek");

  return {
    sopsPublished: sops.filter((i) => i.sop?.published).length,
    sopsRequired: 7,
    meetingsHeld: meetingCount,
    meetingsExpected: Math.max(
      1,
      Math.ceil((now - SPRINT_START) / (7 * 86_400_000)) * 3
    ),
    commitmentsOwnedAndDated: thisWeek.filter((i) => i.owner !== "Unassigned" && i.dueDate).length,
    commitmentsTotal: thisWeek.length,
  };
}

/** The Monday cards, in the shape measureKr wants. Shared for the same reason. */
export function cardsFor(
  meetings: {
    kind: string; date: string;
    toursBooked: number | null; toursShowed: number | null;
    tourCloseRate: number | null; podcastMrr: number | null;
  }[]
) {
  return meetings
    .filter((m) => m.kind === "MondayBusiness" || m.kind === "MondayMonthly")
    .map((m) => ({
      date: m.date,
      toursBooked: m.toursBooked,
      toursShowed: m.toursShowed,
      tourCloseRate: m.tourCloseRate,
      podcastMrr: m.podcastMrr,
    }));
}
