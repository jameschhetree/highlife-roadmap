import { expect, test } from "bun:test";
import { gradeAll, RULES, type ScorecardValues } from "./grade";

const blank: ScorecardValues = {
  cashCollected: null, toursBooked: null, toursShowed: null, tourCloseRate: null,
  recurringConversion: null, editTurnaround: null, roadmapCompletion: null,
};

// Each rule is checked against the exact wording stored for display, so the two
// cannot drift apart without a test failing.
test("tour show rate: >=70 green, 60-69 yellow, <60 red", () => {
  const r = RULES["Tour show rate"];
  expect(r(70)).toBe("green"); expect(r(85)).toBe("green");
  expect(r(69)).toBe("yellow"); expect(r(60)).toBe("yellow");
  expect(r(59)).toBe("red"); expect(r(0)).toBe("red");
});

test("tour close rate: >=30 green, 20-29 yellow, <20 red", () => {
  const r = RULES["Tour close rate"];
  expect(r(30)).toBe("green"); expect(r(29)).toBe("yellow");
  expect(r(20)).toBe("yellow"); expect(r(19)).toBe("red");
});

test("recurring conversion: >=40 green, 25-39 yellow, <25 red", () => {
  const r = RULES["Recurring conversion"];
  expect(r(40)).toBe("green"); expect(r(39)).toBe("yellow");
  expect(r(25)).toBe("yellow"); expect(r(24)).toBe("red");
});

test("edit turnaround is lower-is-better: <=7 green, 8-9 yellow, 10+ red", () => {
  const r = RULES["Standard edit turnaround"];
  expect(r(5)).toBe("green"); expect(r(7)).toBe("green");
  expect(r(8)).toBe("yellow"); expect(r(9)).toBe("yellow");
  expect(r(10)).toBe("red"); expect(r(21)).toBe("red");
});

test("roadmap commitments: >=85 green, 70-84 yellow, <70 red", () => {
  const r = RULES["Roadmap commitments"];
  expect(r(85)).toBe("green"); expect(r(84)).toBe("yellow");
  expect(r(70)).toBe("yellow"); expect(r(69)).toBe("red");
});

test("show rate is computed from tours, not typed", () => {
  const g = gradeAll({ ...blank, toursBooked: 10, toursShowed: 7 }, null);
  expect(g["Tour show rate"].card).toBe("green");
  expect(g["Tour show rate"].display).toBe("70%");
});

test("revenue pace is computed against the month target", () => {
  const g = gradeAll({ ...blank, cashCollected: 9000 }, 10000);
  expect(g["Revenue vs monthly pace"].card).toBe("yellow"); // 90%
  const h = gradeAll({ ...blank, cashCollected: 10000 }, 10000);
  expect(h["Revenue vs monthly pace"].card).toBe("green");
  const i = gradeAll({ ...blank, cashCollected: 8000 }, 10000);
  expect(i["Revenue vs monthly pace"].card).toBe("red");
});

test("a missing number is unknown, never a card", () => {
  const g = gradeAll(blank, null);
  for (const k of Object.keys(g)) {
    expect(g[k].card).toBe(null);
    expect(g[k].display).toBe("—");
  }
});

test("zero tours booked does not divide by zero into a red", () => {
  const g = gradeAll({ ...blank, toursBooked: 0, toursShowed: 0 }, null);
  expect(g["Tour show rate"].card).toBe(null);
});

test("a zero value is still graded — zero is a number, not a blank", () => {
  const g = gradeAll({ ...blank, tourCloseRate: 0 }, null);
  expect(g["Tour close rate"].card).toBe("red");
  expect(g["Tour close rate"].display).toBe("0%");
});
