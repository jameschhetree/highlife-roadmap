/**
 * What the plan says to do today.
 *
 * The document is a weekly rhythm, not a set of pages: Monday is the scoreboard
 * and the commitments, Wednesday is the team, Sunday is the brand and the
 * content batch. The app knew all of that and made James work out which bit
 * applied on any given morning. This turns the rhythm into an answer.
 */

export type DayGuide = {
  weekday: string;
  headline: string;
  detail: string;
  /** The tab to send him to, if today has one obvious home. */
  goTo?: string;
  goToLabel?: string;
  meetingKind?: string;
};

const GUIDES: Record<number, DayGuide> = {
  1: {
    weekday: "Monday",
    headline: "Business meeting, 10:00 AM",
    detail:
      "Fill in the scorecard first — cash collected, podcast revenue and MRR, music, leads, tours booked and showed, room hours, turnaround. The cards grade themselves against your thresholds. Then leave with three to five commitments, each with one owner and a date.",
    goTo: "Meetings",
    goToLabel: "Open the Monday scorecard",
    meetingKind: "MondayBusiness",
  },
  2: {
    weekday: "Tuesday",
    headline: "Execution day",
    detail:
      "No meeting. Outbound, tours, proposals, follow-up, client sessions and editing. Repurpose Sunday's content.",
    goTo: "ThisWeek",
    goToLabel: "This week's commitments",
  },
  3: {
    weekday: "Wednesday",
    headline: "Team meeting, 5:30 PM",
    detail:
      "Write the prep brief before you sit down: bookings this week and next, any client or technical issue worth teaching from, the training topic, intern assignments. The meeting is for those, not for a status recap.",
    goTo: "Meetings",
    goToLabel: "Write the Wednesday brief",
    meetingKind: "WednesdayTeam",
  },
  4: {
    weekday: "Thursday",
    headline: "Execution day",
    detail:
      "Pipeline conversion, partnerships, the stale-lead blitz, production. Publish or repurpose.",
    goTo: "ThisWeek",
    goToLabel: "This week's commitments",
  },
  5: {
    weekday: "Friday",
    headline: "Close the loop",
    detail:
      "Collections, final proposals, delivery QA, next week's bookings, capture the metrics you will need on Monday. Event prep if one is coming.",
    goTo: "Money",
    goToLabel: "Check the monthly pace",
  },
  6: {
    weekday: "Saturday",
    headline: "Monthly activation",
    detail:
      "HL Freestyle once a month, event when one is scheduled. Music and community capture.",
    goTo: "ContentCalendar",
    goToLabel: "Content cadence",
  },
  0: {
    weekday: "Sunday",
    headline: "Brand meeting, 4:00 PM — content first",
    detail:
      "Shoot before you meet: the weekly podcast and any commercial batches. Then rank Music, Media and Merch for the week and decide what is next. Write the prep brief first so the room starts on decisions.",
    goTo: "Meetings",
    goToLabel: "Write the Sunday brief",
    meetingKind: "SundayBrand",
  },
};

export function guideFor(date: Date, timeZone = "America/New_York"): DayGuide {
  // The weekday must be James's, not the server's. A Sunday-evening request from
  // a machine already in Monday would otherwise show him the wrong day's job.
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(date);
  const index = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(weekday);
  return GUIDES[index] ?? GUIDES[1];
}
