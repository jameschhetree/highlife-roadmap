import { expect, test } from "bun:test";
import { rollUp, monthUnderReview, coveredWeekEnd, collectedByMonth, type WeeklyCard } from "./rollup";

const card = (date: string, over: Partial<WeeklyCard> = {}): WeeklyCard => ({
  date, cashCollected: null, podcastRevenue: null, podcastMrr: null,
  musicRevenue: null, leads: null, toursBooked: null, toursShowed: null,
  tourCloseRate: null, recurringConversion: null, roomHours: null,
  editTurnaround: null, roadmapCompletion: null, ...over,
});

test("a Monday card reports the week that ended the day before", () => {
  expect(coveredWeekEnd("2026-08-17T00:00:00.000Z").toISOString().slice(0, 10)).toBe("2026-08-16");
});

test("the first Monday of September reviews August", () => {
  // James starts in September, so the first review is Mon 7 Sep on August.
  expect(monthUnderReview("2026-09-07T00:00:00.000Z").label).toBe("August 2026");
});

test("money and counts are summed, rates are averaged", () => {
  const r = rollUp("2026-09-07T00:00:00.000Z", [
    card("2026-08-17T00:00:00.000Z", { cashCollected: 1000, leads: 10, tourCloseRate: 20 }),
    card("2026-08-24T00:00:00.000Z", { cashCollected: 1500, leads: 14, tourCloseRate: 40 }),
  ]);
  expect(r.weeks).toBe(2);
  expect(r.totals.cashCollected).toBe(2500);
  expect(r.totals.leads).toBe(24);
  expect(r.averages.tourCloseRate).toBe(30);
});

test("a month nobody filled in reads unknown, not zero", () => {
  const r = rollUp("2026-09-07T00:00:00.000Z", [card("2026-08-17T00:00:00.000Z")]);
  expect(r.weeks).toBe(1);
  expect(r.totals.cashCollected).toBe(null);
  expect(r.averages.tourCloseRate).toBe(null);
});

test("weeks outside the month under review are excluded", () => {
  const r = rollUp("2026-09-07T00:00:00.000Z", [
    card("2026-08-17T00:00:00.000Z", { cashCollected: 1000 }),  // week ends Aug 16
    card("2026-09-07T00:00:00.000Z", { cashCollected: 9999 }),  // week ends Sep 6
  ]);
  expect(r.totals.cashCollected).toBe(1000);
});

test("a week straddling the month end counts once, in the month it ended", () => {
  // Card dated Mon 7 Sep covers Aug 31 - Sep 6, so it belongs to September.
  const r = rollUp("2026-10-05T00:00:00.000Z", [
    card("2026-09-07T00:00:00.000Z", { cashCollected: 500 }),
  ]);
  expect(r.monthLabel).toBe("September 2026");
  expect(r.totals.cashCollected).toBe(500);
});

test("cash collected is bucketed into the month each week ended in", () => {
  const c = collectedByMonth([
    card("2026-08-17T00:00:00.000Z", { cashCollected: 1000 }), // ends Aug 16
    card("2026-08-24T00:00:00.000Z", { cashCollected: 1200 }), // ends Aug 23
    card("2026-09-07T00:00:00.000Z", { cashCollected: 800 }),  // ends Sep 6
  ]);
  expect(c["2026-08"]).toBe(2200);
  expect(c["2026-09"]).toBe(800);
});

test("a month with cards but no figures is unknown, not zero", () => {
  const c = collectedByMonth([card("2026-08-17T00:00:00.000Z")]);
  expect(c["2026-08"]).toBe(null);
});
