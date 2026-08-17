import { requirePrisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * What this week should be about, read out of the plan rather than counted.
 *
 * The deterministic list this replaces was hygiene — unowned items, blocked
 * items, overdue items. All true, none of it what the plan says the week is for.
 * This asks the model to read the current quarter's objectives, the execution
 * week and the live ownership, and name the three to five things that actually
 * move the plan. It cites a plan section for each, so a suggestion can be
 * checked rather than trusted.
 */
async function state() {
  const prisma = requirePrisma();
  const [quarter, weeks, items, triggers, sections, meetings] = await Promise.all([
    prisma.quarter.findFirst({
      where: { isCurrent: true },
      include: { objectives: { include: { keyResults: true } } },
    }),
    prisma.executionWeek.findMany({ orderBy: { week: "asc" } }),
    prisma.item.findMany(),
    prisma.trigger.findMany({ where: { firing: true } }),
    prisma.planSection.findMany({ orderBy: { number: "asc" } }),
    prisma.meeting.findMany({ orderBy: { date: "desc" }, take: 8 }),
  ]);

  const now = Date.now();
  const dated = weeks.filter((w) => w.startsOn);
  const started = dated.filter((w) => (w.startsOn as Date).getTime() <= now);
  const currentWeek = started.length ? started[started.length - 1] : dated[0];

  return { quarter, currentWeek, items, triggers, sections, meetings };
}

function fingerprint(s: Awaited<ReturnType<typeof state>>) {
  // Ownership, status and week are what a reading depends on. Not updatedAt,
  // which would invalidate the focus every time anything at all was touched.
  return JSON.stringify({
    week: s.currentWeek?.week,
    items: s.items.map((i) => [i.id, i.owner, i.status, i.view]).sort(),
    firing: s.triggers.map((t) => t.signal).sort(),
  });
}

export async function GET() {
  const prisma = requirePrisma();
  const s = await state();
  const latest = await prisma.weeklyFocus.findFirst({ orderBy: { createdAt: "desc" } });
  if (!latest) return Response.json({ focus: [], stale: true, generatedAt: null });
  return Response.json({
    focus: JSON.parse(latest.body),
    stale: latest.basis !== fingerprint(s),
    generatedAt: latest.createdAt,
  });
}

export async function POST() {
  const prisma = requirePrisma();
  const s = await state();

  const brief = {
    today: new Date().toISOString().slice(0, 10),
    quarter: s.quarter && {
      name: s.quarter.name, dates: s.quarter.dates,
      target: s.quarter.revenueTarget, focus: s.quarter.focus,
      objectives: s.quarter.objectives.map((o) => ({
        kind: o.kind, title: o.title,
        keyResults: o.keyResults.map((k) => ({ text: k.text, score: k.score })),
      })),
    },
    executionWeek: s.currentWeek && {
      week: s.currentWeek.week, objective: s.currentWeek.objective,
      deliverable: s.currentWeek.deliverable,
    },
    whoOwnsWhat: Object.entries(
      s.items.reduce<Record<string, string[]>>((acc, i) => {
        (acc[i.owner] ??= []).push(`${i.title} [${i.view}, ${i.status}]`);
        return acc;
      }, {})
    ),
    firingTriggers: s.triggers.map((t) => ({ signal: t.signal, action: t.action })),
    recentScorecards: s.meetings.map((m) => ({
      date: m.date, kind: m.kind, cash: m.cashCollected,
      toursBooked: m.toursBooked, toursShowed: m.toursShowed,
      closeRate: m.tourCloseRate, turnaround: m.editTurnaround,
    })),
    plan: s.sections.map((x) => `## ${x.number} ${x.title}\n${x.body}`).join("\n\n").slice(0, 70000),
  };

  const prompt = `You are reading HighLife Studios' operating plan and their live roadmap, and naming what THIS WEEK should be about.

${JSON.stringify(brief, null, 1)}

Rules:
- Three to five items. The plan caps each owner at 3-5 commitments a week, so do not produce a backlog.
- Every item must serve the current quarter's objectives or this week's execution deliverable. If it serves neither, leave it out — the plan says new ideas wait unless they support an OKR.
- Name a real owner from whoOwnsWhat. If the right owner is genuinely unclear, say "Needs an owner" rather than guessing.
- Cite the plan section number your reasoning comes from.
- Be specific to their actual state. "Improve sales" is useless; "JoJo has one commitment and four undated SOPs while podcast delivery is the Q4 constraint" is the kind of observation worth having.
- Do not repeat pure hygiene (unowned, blocked, overdue counts) — the app already shows those separately.

Return raw JSON only, every string on a single line:
{"focus":[{"text":"...","why":"...","owner":"...","section":"NN"}]}`;

  try {
    // A forced tool call instead of parsing prose. Asking for "raw JSON only"
    // worked two times in three: the model would add a sentence after the object,
    // or open with one, and the parse failed. A tool schema removes the guesswork
    // — the shape is enforced by the API rather than hoped for.
    const r = await anthropic.messages.create({
      model: "claude-fable-5",
      max_tokens: 2000,
      tools: [
        {
          name: "set_weekly_focus",
          description: "Record the three to five things this week should be about.",
          input_schema: {
            type: "object",
            properties: {
              focus: {
                type: "array",
                minItems: 3,
                maxItems: 5,
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string", description: "What to do, specific to their state. One line." },
                    why: { type: "string", description: "Why it matters this week, citing the plan's reasoning." },
                    owner: { type: "string", description: "One real owner, or 'Needs an owner'." },
                    section: { type: "string", description: "Plan section number, e.g. 05." },
                  },
                  required: ["text", "why", "owner", "section"],
                },
              },
            },
            required: ["focus"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "set_weekly_focus" },
      messages: [{ role: "user", content: prompt }],
    });

    const call = r.content.find((c) => c.type === "tool_use");
    if (!call || call.type !== "tool_use") {
      console.error("[focus] no tool call in reply");
      return Response.json({ error: "Nothing came back. Try again." }, { status: 502 });
    }
    const focus = ((call.input as { focus?: unknown[] }).focus ?? []).slice(0, 5);
    if (focus.length === 0) {
      return Response.json({ error: "Nothing came back." }, { status: 502 });
    }

    await prisma.weeklyFocus.create({
      data: { basis: fingerprint(s), body: JSON.stringify(focus) },
    });
    return Response.json({ focus, stale: false, generatedAt: new Date() });
  } catch (e) {
    console.error("[focus]", e);
    return Response.json({ error: "Could not work it out." }, { status: 500 });
  }
}
