import { requirePrisma } from "@/lib/db";
import { validate, toData, type ItemInput } from "@/lib/items";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface Action {
  type: string;
  params: Record<string, unknown>;
}

export async function GET() {
  const logs = await requirePrisma().chatLog.findMany({
    orderBy: { createdAt: "asc" },
    take: 50,
  });
  return Response.json(logs);
}

export async function POST(request: Request) {
  const prisma = requirePrisma();
  const { message } = await request.json();

  if (!message || typeof message !== "string") {
    return Response.json({ error: "Message required" }, { status: 400 });
  }

  await prisma.chatLog.create({ data: { role: "user", content: message } });

  const [quarters, items] = await Promise.all([
    prisma.quarter.findMany({
      orderBy: { sortOrder: "asc" },
      include: { objectives: { include: { keyResults: true } } },
    }),
    prisma.item.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const state = JSON.stringify(
    {
      quarters: quarters.map((q) => ({
        id: q.id, name: q.name, dates: q.dates, target: q.revenueTarget,
        current: q.isCurrent,
        objectives: q.objectives.map((o) => ({
          id: o.id, kind: o.kind, title: o.title,
          keyResults: o.keyResults.map((k) => ({ id: k.id, label: k.label, text: k.text, score: k.score })),
        })),
      })),
      items: items.map((i) => ({
        id: i.id, title: i.title, owner: i.owner, view: i.view, pillar: i.pillar,
        priority: i.priority, status: i.status, due: i.dueDate, kpi: i.kpi,
        dependency: i.dependency, quarterId: i.quarterId,
      })),
    },
    null,
    1
  );

  const systemPrompt = `You manage the HighLife Studios Roadmap — the operating layer for a DC recording and podcast studio, defined by the HighLife Operating System 2026-2027 plan.

CURRENT STATE:
${state}

RULES FROM THE PLAN — these are not optional:
- Every item has exactly one owner. An item with no owner is an idea, not a task. Never create one without an owner; if the user does not say who owns it, ask rather than guessing.
- The Roadmap tracks the company. HighLevel tracks customers. Refuse to add leads, contacts or individual client bookings — say they belong in HighLevel.
- Three company objectives per quarter, maximum. Do not invent a fourth.
- Podcast is the cash engine through 2027; 65% of growth attention goes there.

VALID VALUES
view: ThisWeek, QuarterlyOKR, RevenueProject, ContentCalendar, Event, SOP, DecisionLog
pillar: Revenue, Podcast, Music, Media, Merch, Events, Operations, Finance
priority: Critical, Standard, Backlog
status: NotStarted, InProgress, Blocked, Done

Reply with raw JSON only, no markdown fence:
{"reply":"<short human answer>","actions":[...]}

Actions:
- {"type":"add_item","params":{"title":"...","owner":"...","view":"...","pillar":"...","priority":"...","dueDate":"YYYY-MM-DD","kpi":"...","quarterId":"<id>"}}
- {"type":"update_item","params":{"id":"<id>","title":"...","owner":"...","status":"...","priority":"...","dueDate":"YYYY-MM-DD","dependency":"...","notes":"..."}}
- {"type":"delete_item","params":{"id":"<id>"}}
- {"type":"score_kr","params":{"id":"<id>","score":0.0-1.0}}

For questions ("what is blocked?", "what does JoJo owe this week?") return actions: [] and answer in reply.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-fable-5",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    // Take the first text block, not block zero. This model returns an empty
    // leading block and puts the answer in the one after it, so indexing at
    // zero produced a 200 with an empty reply and no error anywhere — the
    // assistant looked broken in a way nothing logged.
    const text = response.content
      .flatMap((c) => (c.type === "text" ? [c.text] : []))
      .join("")
      .trim();

    if (!text) {
      console.error("[chat] model returned no text", JSON.stringify(response.content).slice(0, 200));
      return Response.json({ error: "The assistant returned nothing. Try again." }, { status: 502 });
    }

    let parsed: { reply: string; actions: Action[] };
    try {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { reply: text, actions: [] };
    } catch {
      parsed = { reply: text, actions: [] };
    }

    const rejected: string[] = [];

    for (const action of parsed.actions ?? []) {
      const p = action.params as ItemInput & { id?: string; score?: number };
      try {
        switch (action.type) {
          case "add_item": {
            // The same validation the UI goes through. The model is told the
            // owner rule, but told is not enforced.
            const problem = validate(p);
            if (problem) { rejected.push(problem); break; }
            await prisma.item.create({ data: toData(p) as never });
            break;
          }
          case "update_item": {
            if (!p.id) break;
            const problem = validate(p, { partial: true });
            if (problem) { rejected.push(problem); break; }
            await prisma.item.update({ where: { id: p.id }, data: toData(p) as never });
            break;
          }
          case "delete_item":
            if (p.id) await prisma.item.delete({ where: { id: p.id } });
            break;
          case "score_kr": {
            const n = Number(p.score);
            if (!p.id || Number.isNaN(n) || n < 0 || n > 1) {
              rejected.push("A key result score must be between 0.0 and 1.0.");
              break;
            }
            await prisma.keyResult.update({ where: { id: p.id }, data: { score: n } });
            break;
          }
        }
      } catch (e) {
        rejected.push(`Could not apply ${action.type}.`);
        console.error("[chat] action failed", action.type, e);
      }
    }

    // Say so rather than reporting success for work that was refused.
    const reply = rejected.length
      ? `${parsed.reply}\n\nNot applied: ${[...new Set(rejected)].join(" ")}`
      : parsed.reply;

    await prisma.chatLog.create({ data: { role: "assistant", content: reply } });
    return Response.json({ reply, applied: (parsed.actions ?? []).length - rejected.length });
  } catch (e) {
    console.error("[chat]", e);
    return Response.json({ error: "Chat failed" }, { status: 500 });
  }
}
