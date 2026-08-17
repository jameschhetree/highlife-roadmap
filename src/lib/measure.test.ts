import { expect, test } from "bun:test";
import { measureKr, type Card, type Counts } from "./measure";

const card = (date: string, o: Partial<Card> = {}): Card => ({
  date, toursBooked: null, toursShowed: null, tourCloseRate: null, podcastMrr: null, ...o,
});
const counts: Counts = {
  sopsPublished: 0, sopsRequired: 7, meetingsHeld: 0, meetingsExpected: 0,
  commitmentsOwnedAndDated: 0, commitmentsTotal: 0,
};

test("tours booked add up across the sprint", () => {
  const m = measureKr("Book at least 50 podcast tours during the sprint.", [
    card("2026-08-17", { toursBooked: 12 }),
    card("2026-08-24", { toursBooked: 8 }),
  ], counts);
  expect(m?.value).toBe("20 of 50");
  expect(m?.score).toBe(0.4);
});

test("show rate is computed from the counts, not typed", () => {
  const m = measureKr("Achieve at least 65% tour show rate and 25% tour-to-first-sale close rate.", [
    card("2026-08-17", { toursBooked: 12, toursShowed: 5, tourCloseRate: 20 }),
  ], counts);
  expect(m?.value).toBe("42% show, 20% close");
  expect(m?.score).toBe(0.64); // 41.7/65
});

test("no tours booked means no measurement rather than a zero", () => {
  // A blank week must not score the quarter at zero.
  expect(measureKr("Achieve at least 65% tour show rate and 25% close rate.", [card("2026-08-17")], counts)).toBe(null);
});

test("MRR takes the most recent card, not the sum", () => {
  const m = measureKr("Exit September with at least $2.5K in podcast MRR.", [
    card("2026-08-17", { podcastMrr: 500 }),
    card("2026-08-24", { podcastMrr: 1500 }),
  ], counts);
  expect(m?.value).toBe("$1,500 of $2,500");
  expect(m?.score).toBe(0.6);
});

test("a score never exceeds 1.0", () => {
  const m = measureKr("Book at least 50 podcast tours during the sprint.", [
    card("2026-08-17", { toursBooked: 200 }),
  ], counts);
  expect(m?.score).toBe(1);
});

test("SOPs published counts against the seven the sprint names", () => {
  const m = measureKr("Publish the first 7 core SOPs: lead response, tour…", [], { ...counts, sopsPublished: 3 });
  expect(m?.value).toBe("3 of 7");
  expect(m?.score).toBe(0.43);
});

test("key results the app cannot see stay manual", () => {
  // "Every lead lives in HighLevel" is not visible from here, and inventing a
  // measurement for it would be worse than leaving it to judgement.
  expect(measureKr("Every lead and opportunity lives in HighLevel with stage, owner, source and next action.", [], counts)).toBe(null);
  expect(measureKr("Run 2 HL Freestyle activations and 2 monthly events.", [], counts)).toBe(null);
});

test("reworded key results stop matching rather than matching the wrong one", () => {
  expect(measureKr("Book lots of tours.", [card("2026-08-17", { toursBooked: 12 })], counts)).toBe(null);
});
