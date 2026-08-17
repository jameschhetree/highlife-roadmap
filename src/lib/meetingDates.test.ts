import { expect, test } from "bun:test";
import { occurrenceToLog, nextOccurrence, pretty, isFirstOfMonth } from "./meetingDates";

test("on a Monday, the Monday meeting logs today", () => {
  expect(occurrenceToLog("MondayBusiness", "2026-08-17")).toBe("2026-08-17");
});

test("on a Wednesday, the Monday meeting still logs Monday", () => {
  // Filling Monday's numbers in on Wednesday must attach them to Monday.
  expect(occurrenceToLog("MondayBusiness", "2026-08-19")).toBe("2026-08-17");
});

test("on a Monday, the Sunday brand meeting logs the day before", () => {
  expect(occurrenceToLog("SundayBrand", "2026-08-17")).toBe("2026-08-16");
});

test("next Monday is a week on, not today", () => {
  expect(nextOccurrence("MondayBusiness", "2026-08-17")).toBe("2026-08-24");
});

test("next Wednesday from a Monday is two days later", () => {
  expect(nextOccurrence("WednesdayTeam", "2026-08-17")).toBe("2026-08-19");
});

test("dates read as a person would say them", () => {
  expect(pretty("2026-08-24")).toBe("Mon, Aug 24");
});

test("the first Monday of a month is the monthly review", () => {
  expect(isFirstOfMonth("2026-09-07")).toBe(true);
  expect(isFirstOfMonth("2026-09-14")).toBe(false);
});
