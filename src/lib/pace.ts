/**
 * Are we ahead or behind, today.
 *
 * The board had four numbers on it and not one of them answered that. "$1,275
 * collected of $6,000" is a fact; whether it is good depends entirely on what
 * day it is, and the reader was left to do that arithmetic in their head.
 *
 * Pace does it: how far through the month's earning window we are, what that
 * fraction of the target comes to, and the difference in dollars.
 *
 * This also corrects the Monday card. `gradeAll` was handed one week's cash and
 * the whole month's target, so "Revenue vs monthly pace" graded red unless a
 * single week paid for the month — a red that carried no information because it
 * could not have been anything else. The comparison it wanted was always this
 * one: everything collected so far this month against what the calendar says
 * should be in by now.
 */

import { dayNumber } from "./days";

export type Pace = {
  /** Dollars the calendar says should be in by the end of today. */
  expected: number;
  /** Dollars actually in, month to date. */
  collected: number;
  /** collected − expected. Negative is behind. */
  delta: number;
  /** collected as a percentage of expected. 100 is exactly on pace. */
  pct: number;
  /** How far through the earning window we are, 0–1. */
  through: number;
  daysGone: number;
  daysTotal: number;
};

/** First and last day of a month's earning window, as day numbers. */
export function monthWindow(key: string, planStart?: string | null) {
  const [y, m] = key.split("-").map(Number);
  let start = Date.UTC(y, m - 1, 1) / 86400000;
  const end = Date.UTC(y, m, 0) / 86400000; // day 0 of next month is the last of this

  // The first month is short: the plan starts on the 10th, so charging it a
  // full month's worth of elapsed days would report us behind on day one.
  if (planStart) {
    const s = dayNumber(new Date(planStart));
    if (s > start && s <= end) start = s;
  }
  return { start, end, days: end - start + 1 };
}

/**
 * Pace for a month. Returns null when there is no target to measure against —
 * an unknown is shown as unknown rather than as zero.
 */
export function pace({
  key, target, collected, planStart, now = new Date(),
}: {
  key: string;
  target: number | null;
  collected: number | null;
  planStart?: string | null;
  now?: Date;
}): Pace | null {
  if (!target || target <= 0) return null;

  const { start, end, days } = monthWindow(key, planStart);
  const today = dayNumber(now);

  // Today counts: by the end of it, a day's worth is due.
  const daysGone = Math.max(0, Math.min(days, today - start + 1));
  const through = daysGone / days;
  const expected = target * through;
  const got = collected ?? 0;

  return {
    expected,
    collected: got,
    delta: got - expected,
    // Before the window opens nothing is expected yet, and dividing by it would
    // report Infinity% ahead on a month that has not started.
    pct: expected > 0 ? (got / expected) * 100 : got > 0 ? 100 : 0,
    through,
    daysGone,
    daysTotal: days,
  };
}

/** Which month contains a given day, as a "2026-08" key. */
export function monthKeyOf(d: Date): string {
  const [y, m] = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit",
  }).format(d).split("-");
  return `${y}-${m}`;
}

/**
 * Tours as a funnel rather than as three separate counts.
 *
 * "Booked 12" and "Showed 5" sat in different boxes on the card, so the number
 * that matters — that seven of them did not turn up — was never on the screen.
 */
export function funnel(v: { leads: number | null; toursBooked: number | null; toursShowed: number | null }) {
  const { leads, toursBooked: booked, toursShowed: showed } = v;
  const rate = (a: number | null, b: number | null) =>
    a != null && b != null && b > 0 ? (a / b) * 100 : null;

  return [
    { label: "Leads", value: leads, rate: null as number | null, of: null as string | null },
    { label: "Tours booked", value: booked, rate: rate(booked, leads), of: "of leads" },
    { label: "Tours showed", value: showed, rate: rate(showed, booked), of: "of booked" },
  ];
}
