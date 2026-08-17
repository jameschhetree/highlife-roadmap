import { requirePrisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Turn an SOP written elsewhere into section 18's format.
 *
 * HighLife already has working intern SOPs. Retyping them into nine boxes is
 * the kind of task that never gets done, so this takes the text as written and
 * maps it onto the plan's structure.
 *
 * It does not invent. If the source does not state an SLA, the SLA comes back
 * empty and the app shows it as missing — a plausible-looking invented SLA is
 * worse than a visible gap, because someone will follow it.
 */
export async function POST(request: Request) {
  const prisma = requirePrisma();
  const body = (await request.json()) as { text?: string; title?: string; owner?: string };
  const text = (body.text ?? "").trim();

  if (text.length < 40) {
    return Response.json({ error: "Paste the SOP text and I will structure it." }, { status: 400 });
  }
  if (text.length > 40000) {
    return Response.json({ error: "That is too long for one SOP. Split it." }, { status: 413 });
  }

  try {
    const r = await anthropic.messages.create({
      model: "claude-fable-5",
      max_tokens: 2000,
      tools: [
        {
          name: "structure_sop",
          description: "Map an existing SOP onto the HighLife format.",
          input_schema: {
            type: "object",
            properties: {
              title: { type: "string", description: "Short name for the procedure, verb first." },
              owner: { type: "string", description: "The one accountable role named in the text, or 'Unassigned' if it names none." },
              purpose: { type: "string", description: "Why the process exists. Empty if the text does not say." },
              trigger: { type: "string", description: "What starts it. Empty if not stated." },
              inputs: { type: "string", description: "What is needed before starting. Empty if not stated." },
              steps: { type: "string", description: "The actions, one per line, in order. No numbering." },
              qualityCheck: { type: "string", description: "What must be true before it is done. Empty if not stated." },
              sla: { type: "string", description: "Expected timing. Empty if the text gives none — do not estimate." },
              escalation: { type: "string", description: "What happens when it goes wrong. Empty if not stated." },
              missing: {
                type: "array",
                items: { type: "string" },
                description: "Which of the nine fields the source does not cover.",
              },
            },
            required: ["title", "owner", "steps", "missing"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "structure_sop" },
      messages: [
        {
          role: "user",
          content:
            `Map this existing SOP onto the HighLife format. Use only what the text says — leave a field empty and list it under "missing" rather than inventing content for it. Especially do not invent an SLA or an escalation path; someone will follow whatever you write.\n\n---\n${text}`,
        },
      ],
    });

    const call = r.content.find((c) => c.type === "tool_use");
    if (!call || call.type !== "tool_use") {
      return Response.json({ error: "Could not read that. Try again." }, { status: 502 });
    }
    const d = call.input as Record<string, string> & { missing?: string[] };

    const max = await prisma.item.aggregate({
      where: { view: "SOP" },
      _max: { sortOrder: true },
    });

    const item = await prisma.item.create({
      data: {
        title: body.title?.trim() || d.title || "Imported SOP",
        owner: body.owner?.trim() || d.owner || "Unassigned",
        view: "SOP",
        pillar: "Operations",
        priority: "Standard",
        sortOrder: (max._max.sortOrder ?? 0) + 1,
        kpi: "Roadmap commitments completed",
        notes: "Imported from an existing document.",
        sop: {
          create: {
            purpose: d.purpose ?? "",
            trigger: d.trigger ?? "",
            inputs: d.inputs ?? "",
            steps: d.steps ?? "",
            qualityCheck: d.qualityCheck ?? "",
            sla: d.sla ?? "",
            escalation: d.escalation ?? "",
            version: "v1",
            // Never auto-publish. An import is a draft until someone reads it.
            published: false,
          },
        },
      },
      include: { sop: true },
    });

    return Response.json({ item, missing: d.missing ?? [] }, { status: 201 });
  } catch (e) {
    console.error("[sop import]", e);
    return Response.json({ error: "Could not import that." }, { status: 500 });
  }
}
