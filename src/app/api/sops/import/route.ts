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
  let text = (body.text ?? "").trim();
  let docUrl = "";

  // A pasted Google Doc link is a link, not an SOP.
  //
  // Jaco pasted one in here and the model was handed the URL as if it were the
  // procedure, so it produced an SOP called <UNKNOWN> with every field missing.
  // If the box contains only a link, fetch the document behind it and keep the
  // link attached.
  const onlyLink = /^https:\/\/(docs|drive)\.google\.com\/\S+$/.test(text);
  if (onlyLink) {
    docUrl = text;
    const id = text.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)?.[1];
    if (!id) {
      return Response.json(
        { error: "That looks like a Drive link rather than a Google Doc. Paste the doc link." },
        { status: 400 }
      );
    }
    try {
      const r = await fetch(`https://docs.google.com/document/d/${id}/export?format=txt`);
      const fetched = (await r.text()).replace(/﻿/g, "").trim();
      // A restricted doc answers 200 with a sign-in page rather than an error.
      if (!r.ok || !fetched || /<!DOCTYPE html|Sign in|Request access/i.test(fetched.slice(0, 400))) {
        return Response.json(
          { error: "I cannot read that doc. Set it to anyone with the link can view, then try again." },
          { status: 403 }
        );
      }
      text = fetched;
    } catch {
      return Response.json({ error: "Could not fetch that document." }, { status: 502 });
    }
  }

  if (text.length < 40) {
    return Response.json(
      { error: "Paste the SOP text, or a Google Doc link that anyone with the link can view." },
      { status: 400 }
    );
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
        // Never <UNKNOWN>: if the model cannot name it, say where it came from.
        title: body.title?.trim() || (d.title && !/unknown/i.test(d.title) ? d.title : "Imported SOP"),
        owner: body.owner?.trim() || d.owner || "Unassigned",
        view: "SOP",
        pillar: "Operations",
        priority: "Standard",
        sortOrder: (max._max.sortOrder ?? 0) + 1,
        kpi: "Roadmap commitments completed",
        notes: "Imported from an existing document.",
        sop: {
          create: {
            docUrl,
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
