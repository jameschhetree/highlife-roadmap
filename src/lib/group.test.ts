import { expect, test } from "bun:test";
import { group, daysAway, type Groupable } from "./group";

const NOW = new Date("2026-08-17T12:00:00-04:00");
const it = (id: string, o: Partial<Groupable> = {}): Groupable => ({
  id, owner: "Jaco", dueDate: null, priority: "Standard", status: "NotStarted", ...o,
});

test("days away is counted in whole days, not hours", () => {
  // Due at 9am tomorrow is one day away, not zero because it is under 24 hours.
  expect(daysAway("2026-08-18T09:00:00-04:00", NOW)).toBe(1);
  expect(daysAway("2026-08-17T23:00:00-04:00", NOW)).toBe(0);
  expect(daysAway("2026-08-16T23:00:00-04:00", NOW)).toBe(-1);
});

test("the day boundary is James's, not the server's", () => {
  // Vercel runs in UTC. 11pm Eastern is already tomorrow there, so counting in
  // the server's zone would mark everything due today as due tomorrow all
  // evening.
  const lateEvening = new Date("2026-08-17T23:30:00-04:00");
  expect(daysAway("2026-08-17T14:00:00-04:00", lateEvening)).toBe(0);
  expect(daysAway("2026-08-18T09:00:00-04:00", lateEvening)).toBe(1);
});

test("due dates fall into overdue, today, this week and later", () => {
  const g = group([
    it("a", { dueDate: "2026-08-14T00:00:00-04:00" }),
    it("b", { dueDate: "2026-08-17T00:00:00-04:00" }),
    it("c", { dueDate: "2026-08-21T00:00:00-04:00" }),
    it("d", { dueDate: "2026-09-30T00:00:00-04:00" }),
    it("e"),
  ], "due", NOW);
  expect(g.map((x) => x.label)).toEqual(["Overdue", "Today", "Before next Monday", "Later", "No date"]);
});

test("done work drops to the bottom whatever its date", () => {
  // A finished task overdue by a week must not sit in the overdue group.
  const g = group([
    it("a", { dueDate: "2026-08-10T00:00:00-04:00", status: "Done" }),
    it("b", { dueDate: "2026-08-14T00:00:00-04:00" }),
  ], "due", NOW);
  expect(g[0].label).toBe("Overdue");
  expect(g[0].items).toHaveLength(1);
  expect(g[g.length - 1].label).toBe("Done");
});

test("empty groups do not appear", () => {
  const g = group([it("a", { dueDate: "2026-08-17T00:00:00-04:00" })], "due", NOW);
  expect(g).toHaveLength(1);
  expect(g[0].label).toBe("Today");
});

test("soonest first inside a group", () => {
  const g = group([
    it("later", { dueDate: "2026-08-21T00:00:00-04:00" }),
    it("sooner", { dueDate: "2026-08-19T00:00:00-04:00" }),
  ], "due", NOW);
  expect(g[0].items.map((i) => i.id)).toEqual(["sooner", "later"]);
});

test("unassigned sorts last and is flagged", () => {
  const g = group([
    it("a", { owner: "Unassigned" }),
    it("b", { owner: "JoJo" }),
    it("c", { owner: "Jaco" }),
  ], "owner");
  expect(g.map((x) => x.label)).toEqual(["Jaco", "JoJo", "Needs an owner"]);
  expect(g[2].urgent).toBe(true);
});

test("priority keeps the plan's order rather than the alphabet", () => {
  const g = group([
    it("a", { priority: "Backlog" }),
    it("b", { priority: "Critical" }),
    it("c", { priority: "Standard" }),
  ], "priority");
  expect(g.map((x) => x.label)).toEqual(["Critical", "Standard", "Backlog"]);
});
