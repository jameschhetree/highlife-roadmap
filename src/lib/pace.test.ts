import { test, expect } from "bun:test";
import { pace, monthWindow, monthKeyOf, funnel } from "./pace";

const PLAN_START = "2026-08-10T04:00:00.000Z"; // midnight Eastern, Aug 10
const at = (iso: string) => new Date(iso);

test("a full month runs from the first to the last day", () => {
  const w = monthWindow("2026-09");
  expect(w.days).toBe(30);
  const feb = monthWindow("2028-02"); // leap year
  expect(feb.days).toBe(29);
});

test("the first month starts when the plan starts, not on the 1st", () => {
  // Aug 10-31 is 22 days. Charging it 31 would report us behind on day one.
  expect(monthWindow("2026-08", PLAN_START).days).toBe(22);
});

test("a plan start in another month does not shorten this one", () => {
  expect(monthWindow("2026-10", PLAN_START).days).toBe(31);
});

test("halfway through the window expects half the target", () => {
  // Aug 10-31, day 11 of 22 is Aug 20.
  const p = pace({ key: "2026-08", target: 6000, collected: 3000, planStart: PLAN_START, now: at("2026-08-20T12:00:00-04:00") })!;
  expect(p.daysGone).toBe(11);
  expect(p.daysTotal).toBe(22);
  expect(p.expected).toBe(3000);
  expect(p.delta).toBe(0);
  expect(p.pct).toBe(100);
});

test("the real August position: behind", () => {
  // Aug 17 is day 8 of 22. 8/22 of $6,000 is $2,182. We have $1,275.
  const p = pace({ key: "2026-08", target: 6000, collected: 1275, planStart: PLAN_START, now: at("2026-08-17T09:00:00-04:00") })!;
  expect(p.daysGone).toBe(8);
  expect(Math.round(p.expected)).toBe(2182);
  expect(Math.round(p.delta)).toBe(-907);
  expect(p.pct).toBeLessThan(60);
});

test("late Eastern evening is still the same day", () => {
  // 11pm Eastern on the 17th is the 18th in UTC. Counted in UTC this would
  // silently advance the expectation by a day every night.
  const evening = pace({ key: "2026-08", target: 6000, collected: 1275, planStart: PLAN_START, now: at("2026-08-17T23:30:00-04:00") })!;
  const morning = pace({ key: "2026-08", target: 6000, collected: 1275, planStart: PLAN_START, now: at("2026-08-17T09:00:00-04:00") })!;
  expect(evening.daysGone).toBe(morning.daysGone);
});

test("nothing collected on the first day is behind by one day, not by a month", () => {
  const p = pace({ key: "2026-08", target: 6000, collected: null, planStart: PLAN_START, now: at("2026-08-10T09:00:00-04:00") })!;
  expect(p.daysGone).toBe(1);
  expect(Math.round(p.expected)).toBe(273);
  expect(p.collected).toBe(0);
});

test("a month that has not started expects nothing and does not divide by zero", () => {
  const p = pace({ key: "2026-10", target: 11000, collected: null, now: at("2026-08-17T09:00:00-04:00") })!;
  expect(p.daysGone).toBe(0);
  expect(p.expected).toBe(0);
  expect(Number.isFinite(p.pct)).toBe(true);
});

test("a finished month expects the whole target, never more", () => {
  const p = pace({ key: "2026-08", target: 6000, collected: 6000, planStart: PLAN_START, now: at("2026-12-01T09:00:00-05:00") })!;
  expect(p.through).toBe(1);
  expect(p.expected).toBe(6000);
});

test("no target means no pace, not a pace of zero", () => {
  expect(pace({ key: "2026-08", target: null, collected: 500 })).toBeNull();
  expect(pace({ key: "2026-08", target: 0, collected: 500 })).toBeNull();
});

test("the month key is read in Eastern", () => {
  // 8pm Eastern on Aug 31 is already September in UTC.
  expect(monthKeyOf(at("2026-08-31T20:00:00-04:00"))).toBe("2026-08");
});

test("the funnel shows the drop between stages", () => {
  const f = funnel({ leads: 20, toursBooked: 12, toursShowed: 5 });
  expect(f[1].rate).toBe(60);
  expect(Math.round(f[2].rate!)).toBe(42);
});

test("a missing stage does not invent a rate", () => {
  const f = funnel({ leads: null, toursBooked: 12, toursShowed: 5 });
  expect(f[1].rate).toBeNull();
  expect(f[2].rate).not.toBeNull();
});
