/**
 * What this week should probably be about.
 *
 * Not a guess: every suggestion below is the plan applying its own rules to the
 * current state. Guardrail 2 says new ideas wait unless they serve an OKR;
 * section 09 says an item without an owner is not a task; section 08 says the
 * action follows the trigger. So the app can name the week's priorities without
 * inventing anything — it just has to notice.
 *
 * Ordered by what the plan would interrupt you for, most urgent first.
 */

export type Suggestion = { text: string; why: string; goTo?: string };

type Input = {
  weekNumber: number | null;
  weekObjective: string | null;
  weekLoaded: boolean;
  unowned: number;
  blocked: number;
  overdue: number;
  firingTriggers: { signal: string; action: string }[];
  uncostedPackages: number;
  unmitigatedRisks: number;
  sopsOutstanding: number;
  monthLabel: string | null;
  monthTarget: number | null;
  collected: number | null;
};

export function suggest(i: Input): Suggestion[] {
  const out: Suggestion[] = [];

  // A fired trigger is the plan telling you to act. Nothing outranks it.
  for (const t of i.firingTriggers) {
    out.push({
      text: t.action,
      why: `${t.signal} is firing. The plan's rule is that the action follows the trigger.`,
      goTo: "Systems",
    });
  }

  if (i.blocked > 0) {
    out.push({
      text: `Clear ${i.blocked} blocked ${i.blocked === 1 ? "item" : "items"}`,
      why: "Monday is for decisions and blockers. Blocked work does not unblock itself.",
      goTo: "Blocked",
    });
  }

  if (i.overdue > 0) {
    out.push({
      text: `${i.overdue} commitment${i.overdue === 1 ? " is" : "s are"} past its due date`,
      why: "Roadmap completion is on the weekly scoreboard. Below 70% is a red card.",
      goTo: "ThisWeek",
    });
  }

  if (i.unowned > 0) {
    out.push({
      text: `Give ${i.unowned} ${i.unowned === 1 ? "item" : "items"} an owner`,
      why: "An item with no owner is an idea, not a task.",
      goTo: "ThisWeek",
    });
  }

  if (i.weekNumber && !i.weekLoaded && i.weekObjective) {
    out.push({
      text: `Pull week ${i.weekNumber} in: ${i.weekObjective.toLowerCase()}`,
      why: "The 90-day plan only works if the week's deliverable becomes owned commitments.",
      goTo: "ThisWeek",
    });
  }

  if (i.sopsOutstanding > 0) {
    out.push({
      text: `Publish ${i.sopsOutstanding} of the seven core SOPs`,
      why: "Launch Sprint O2 KR3 — required before Q4.",
      goTo: "SOP",
    });
  }

  if (i.uncostedPackages > 0) {
    out.push({
      text: `Cost-check ${i.uncostedPackages} recurring package${i.uncostedPackages === 1 ? "" : "s"}`,
      why: "Prices are not final until editor hours, labour, revisions, commission and fees are measured.",
      goTo: "Systems",
    });
  }

  if (i.monthTarget && i.collected != null && i.collected < i.monthTarget * 0.9) {
    out.push({
      text: `${i.monthLabel} is behind pace`,
      why: "Under 90% of the monthly target is a red card on the scoreboard.",
      goTo: "Money",
    });
  }

  if (i.unmitigatedRisks > 0 && out.length < 5) {
    out.push({
      text: `Put a mitigation in place for ${i.unmitigatedRisks} open risk${i.unmitigatedRisks === 1 ? "" : "s"}`,
      why: "The register only helps if the mitigation exists rather than being written down.",
      goTo: "Systems",
    });
  }

  // Five is the plan's own ceiling for weekly commitments. A longer list is a
  // backlog, and section 09 puts the backlog somewhere else on purpose.
  return out.slice(0, 5);
}
