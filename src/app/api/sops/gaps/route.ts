import { requirePrisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Read a linked Google Doc and draft only the sections it is missing.
 *
 * Jaco's SOPs live in Docs and look better there than they ever would here, so
 * the app should not ask him to retype them — it should tell him what the
 * document does not cover and give him the words to paste at the bottom.
 *
 * It cannot write to the Doc: this app has read-only calendar access and nothing
 * else, and asking for write access to Drive to append a paragraph would be a
 * wildly disproportionate permission. So it drafts, he pastes.
 */
const FIELDS: [string, string][] = [
  ["Purpose", "why this process exists"],
  ["Trigger", "what starts it"],
  ["Inputs", "what is needed before you begin"],
  ["Steps", "the actions in order"],
  ["Quality check", "what must be true before it counts as done"],
  ["SLA", "how long it should take"],
  ["Escalation", "what happens when something goes wrong"],
];

export async function POST(request: Request) {
  const prisma = requirePrisma();
  const { itemId } = (await request.json()) as { itemId?: string };
  if (!itemId) return Response.json({ error: "Which SOP?" }, { status: 400 });

  const item = await prisma.item.findUnique({ where: { id: itemId }, include: { sop: true } });
  const url = item?.sop?.docUrl?.trim();
  if (!item || !url) return Response.json({ error: "No linked document." }, { status: 400 });

  const id = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (!id) return Response.json({ error: "That is not a Google Doc link." }, { status: 400 });

  let text: string;
  try {
    const r = await fetch(`https://docs.google.com/document/d/${id}/export?format=txt`);
    if (!r.ok) throw new Error(String(r.status));
    text = (await r.text()).replace(/﻿/g, "").trim();
    // A restricted doc returns Google's sign-in page rather than an error.
    if (!text || /<!DOCTYPE html|Sign in|Request access/i.test(text.slice(0, 400))) {
      return Response.json(
        { error: "I cannot read that doc. Set it to anyone with the link can view." },
        { status: 403 }
      );
    }
  } catch {
    return Response.json({ error: "Could not fetch that document." }, { status: 502 });
  }

  try {
    const r = await anthropic.messages.create({
      model: "claude-fable-5",
      max_tokens: 2000,
      tools: [
        {
          name: "report_gaps",
          description: "Say which SOP sections the document is missing and draft them.",
          input_schema: {
            type: "object",
            properties: {
              covered: { type: "array", items: { type: "string" }, description: "Sections the document already covers." },
              gaps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    section: { type: "string" },
                    draft: { type: "string", description: "Wording to append, in the document's own voice. Concrete, based on what the document already says." },
                    assumption: { type: "string", description: "Anything you had to assume, or empty if the document implies it clearly." },
                  },
                  required: ["section", "draft", "assumption"],
                },
              },
            },
            required: ["covered", "gaps"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "report_gaps" },
      messages: [
        {
          role: "user",
          content:
`Here is a Standard Operating Procedure. The house format requires: ${FIELDS.map(([n, d]) => `${n} (${d})`).join("; ")}.

Say which of those the document already covers, and for each one it does not, draft the wording to add at the bottom — in the document's own voice, specific to this process, based on what it already says.

Where you have to assume something the document does not state, put it in "assumption" so it can be checked. Do not invent a timing or an escalation path and present it as settled; those are decisions, and someone will follow whatever is written.

---
${text.slice(0, 30000)}`,
        },
      ],
    });

    const call = r.content.find((c) => c.type === "tool_use");
    if (!call || call.type !== "tool_use") {
      return Response.json({ error: "Nothing came back. Try again." }, { status: 502 });
    }
    return Response.json(call.input);
  } catch (e) {
    console.error("[sop gaps]", e);
    return Response.json({ error: "Could not read that document." }, { status: 500 });
  }
}
