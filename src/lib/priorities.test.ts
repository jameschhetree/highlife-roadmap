import { expect, test } from "bun:test";
import { suggest } from "./priorities";

const base = {
  weekNumber: 2, weekObjective: "Finalize offer ladder", weekLoaded: true,
  unowned: 0, blocked: 0, overdue: 0, firingTriggers: [],
  uncostedPackages: 0, unmitigatedRisks: 0, sopsOutstanding: 0,
  monthLabel: null, monthTarget: null, collected: null,
};

test("a quiet week suggests nothing rather than inventing work", () => {
  expect(suggest(base)).toEqual([]);
});

test("a firing trigger outranks everything else", () => {
  const s = suggest({
    ...base, blocked: 3, unowned: 2,
    firingTriggers: [{ signal: "Editing backlog", action: "Add contract editor capacity." }],
  });
  expect(s[0].text).toBe("Add contract editor capacity.");
});

test("never more than five — the plan's own ceiling for weekly commitments", () => {
  const s = suggest({
    ...base, weekLoaded: false, blocked: 4, overdue: 3, unowned: 6,
    sopsOutstanding: 7, uncostedPackages: 4, unmitigatedRisks: 7,
    firingTriggers: [
      { signal: "a", action: "A" }, { signal: "b", action: "B" },
      { signal: "c", action: "C" },
    ],
  });
  expect(s.length).toBe(5);
});

test("behind pace only fires under 90% of target, not merely under target", () => {
  const at = (collected: number) =>
    suggest({ ...base, monthLabel: "Sep 2026", monthTarget: 10000, collected })
      .some((x) => x.text.includes("behind pace"));
  expect(at(9500)).toBe(false); // 95% — yellow, not worth interrupting for
  expect(at(8000)).toBe(true);  // 80% — red
});

test("singular and plural read correctly", () => {
  expect(suggest({ ...base, unowned: 1 })[0].text).toBe("Give 1 item an owner");
  expect(suggest({ ...base, unowned: 3 })[0].text).toBe("Give 3 items an owner");
});
