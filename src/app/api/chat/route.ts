import { requirePrisma } from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 30;

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ActionParam {
  type: string;
  params: Record<string, unknown>;
}

export async function GET() {
  const prisma = requirePrisma();
  const logs = await prisma.chatLog.findMany({
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

  // Save user message
  await prisma.chatLog.create({
    data: { role: "user", content: message },
  });

  // Get current roadmap state
  const phases = await prisma.phase.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: { steps: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  const stateJson = JSON.stringify(
    phases.map((p) => ({
      id: p.id,
      number: p.number,
      name: p.name,
      tasks: p.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueLabel: t.dueLabel,
        category: t.category,
        owner: t.owner,
        done: t.done,
        steps: t.steps.map((s) => ({
          id: s.id,
          title: s.title,
          owner: s.owner,
          done: s.done,
        })),
      })),
    })),
    null,
    1
  );

  const systemPrompt = `You are the HighLife Studios Roadmap assistant. You help manage a 12-month business roadmap for a recording/podcast studio in Washington DC.

CURRENT ROADMAP STATE:
${stateJson}

VALID OWNERS: JoJo, Jaco, Both, Unassigned
VALID CATEGORIES: Legal, Finance, Operations, Marketing, Brand, Pricing, Revenue, Hiring

You can perform actions on the roadmap. Return a JSON object with:
- "reply": a short, human-readable response
- "actions": an array of action objects

Available actions:
- {"type":"add_task","params":{"phaseId":"<id>","title":"...","category":"...","dueLabel":"...","owner":"..."}}
- {"type":"add_step","params":{"taskId":"<id>","title":"...","owner":"..."}}
- {"type":"update_task","params":{"id":"<id>","title":"...","done":true/false,"owner":"...","category":"...","dueLabel":"..."}}
- {"type":"update_step","params":{"id":"<id>","title":"...","done":true/false,"owner":"..."}}
- {"type":"delete_task","params":{"id":"<id>"}}
- {"type":"delete_step","params":{"id":"<id>"}}
- {"type":"mark_done","params":{"type":"task"|"step","id":"<id>","done":true/false}}
- {"type":"assign_owner","params":{"type":"task"|"step","id":"<id>","owner":"..."}}

If the user asks a question (like "what's left for JoJo?"), return actions: [] and provide the answer in reply.

IMPORTANT: Always respond with valid JSON only. No markdown wrapping. Just the raw JSON object.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    let parsed: { reply: string; actions: ActionParam[] };
    try {
      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : { reply: text, actions: [] };
    } catch {
      parsed = { reply: text, actions: [] };
    }

    // Apply actions
    const applied: string[] = [];
    for (const action of parsed.actions || []) {
      try {
        switch (action.type) {
          case "add_task": {
            const p = action.params;
            const maxSort = await prisma.task.aggregate({
              where: { phaseId: p.phaseId as string },
              _max: { sortOrder: true },
            });
            await prisma.task.create({
              data: {
                phaseId: p.phaseId as string,
                title: (p.title as string) || "New Task",
                dueLabel: (p.dueLabel as string) || "",
                category: (p.category as string as "Operations") || "Operations",
                owner: (p.owner as string as "Unassigned") || "Unassigned",
                done: false,
                sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
              },
            });
            applied.push(`Added task: ${p.title}`);
            break;
          }
          case "add_step": {
            const p = action.params;
            const maxSort = await prisma.step.aggregate({
              where: { taskId: p.taskId as string },
              _max: { sortOrder: true },
            });
            await prisma.step.create({
              data: {
                taskId: p.taskId as string,
                title: (p.title as string) || "New Step",
                owner: (p.owner as string as "Unassigned") || "Unassigned",
                done: false,
                sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
              },
            });
            applied.push(`Added step: ${p.title}`);
            break;
          }
          case "update_task": {
            const p = action.params;
            const data: Record<string, unknown> = {};
            if (p.title !== undefined) data.title = p.title;
            if (p.done !== undefined) data.done = p.done;
            if (p.owner !== undefined) data.owner = p.owner;
            if (p.category !== undefined) data.category = p.category;
            if (p.dueLabel !== undefined) data.dueLabel = p.dueLabel;
            await prisma.task.update({
              where: { id: p.id as string },
              data,
            });
            applied.push(`Updated task ${p.id}`);
            break;
          }
          case "update_step": {
            const p = action.params;
            const data: Record<string, unknown> = {};
            if (p.title !== undefined) data.title = p.title;
            if (p.done !== undefined) data.done = p.done;
            if (p.owner !== undefined) data.owner = p.owner;
            await prisma.step.update({
              where: { id: p.id as string },
              data,
            });
            applied.push(`Updated step ${p.id}`);
            break;
          }
          case "delete_task": {
            await prisma.task.delete({
              where: { id: action.params.id as string },
            });
            applied.push(`Deleted task ${action.params.id}`);
            break;
          }
          case "delete_step": {
            await prisma.step.delete({
              where: { id: action.params.id as string },
            });
            applied.push(`Deleted step ${action.params.id}`);
            break;
          }
          case "mark_done": {
            const p = action.params;
            if (p.type === "task") {
              await prisma.task.update({
                where: { id: p.id as string },
                data: { done: p.done as boolean },
              });
            } else {
              await prisma.step.update({
                where: { id: p.id as string },
                data: { done: p.done as boolean },
              });
            }
            applied.push(
              `Marked ${p.type} ${p.id} as ${p.done ? "done" : "not done"}`
            );
            break;
          }
          case "assign_owner": {
            const p = action.params;
            if (p.type === "task") {
              await prisma.task.update({
                where: { id: p.id as string },
                data: { owner: p.owner as string as "Unassigned" },
              });
            } else {
              await prisma.step.update({
                where: { id: p.id as string },
                data: { owner: p.owner as string as "Unassigned" },
              });
            }
            applied.push(
              `Assigned ${p.type} ${p.id} to ${p.owner}`
            );
            break;
          }
        }
      } catch (err) {
        applied.push(
          `Failed: ${action.type} - ${err instanceof Error ? err.message : "unknown error"}`
        );
      }
    }

    const assistantContent =
      parsed.reply +
      (applied.length > 0 ? `\n\nActions applied: ${applied.join(", ")}` : "");

    // Save assistant message
    await prisma.chatLog.create({
      data: { role: "assistant", content: assistantContent },
    });

    return Response.json({
      reply: assistantContent,
      actions: parsed.actions || [],
      applied,
    });
  } catch (err) {
    const errMsg =
      err instanceof Error ? err.message : "Claude API error";
    return Response.json({ error: errMsg }, { status: 500 });
  }
}
