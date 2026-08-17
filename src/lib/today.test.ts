import { expect, test } from "bun:test";
import { guideFor } from "./today";

test("each weekday maps to the job the plan gives it", () => {
  // Noon UTC keeps every case inside the same Eastern day.
  const at = (iso: string) => guideFor(new Date(iso)).weekday;
  expect(at("2026-08-17T16:00:00Z")).toBe("Monday");
  expect(at("2026-08-18T16:00:00Z")).toBe("Tuesday");
  expect(at("2026-08-19T16:00:00Z")).toBe("Wednesday");
  expect(at("2026-08-20T16:00:00Z")).toBe("Thursday");
  expect(at("2026-08-21T16:00:00Z")).toBe("Friday");
  expect(at("2026-08-22T16:00:00Z")).toBe("Saturday");
  expect(at("2026-08-23T16:00:00Z")).toBe("Sunday");
});

test("the weekday is James's, not the server's", () => {
  // 01:00 UTC Monday is still Sunday evening in New York, and Sunday is when
  // the brand meeting and the content shoot happen.
  const g = guideFor(new Date("2026-08-17T01:00:00Z"));
  expect(g.weekday).toBe("Sunday");
  expect(g.meetingKind).toBe("SundayBrand");
});

test("meeting days point at a meeting, execution days do not", () => {
  expect(guideFor(new Date("2026-08-17T16:00:00Z")).meetingKind).toBe("MondayBusiness");
  expect(guideFor(new Date("2026-08-19T16:00:00Z")).meetingKind).toBe("WednesdayTeam");
  expect(guideFor(new Date("2026-08-18T16:00:00Z")).meetingKind).toBeUndefined();
});
