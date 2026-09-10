import { NextRequest } from "next/server";
import { requirePrisma } from "@/lib/db";

/**
 * Tick a step off.
 *
 * A task counts as done when every one of its steps is done, so ticking the
 * last step closes the task and un-ticking any step reopens it. Otherwise the
 * headline count and the steps underneath it drift apart.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const prisma = requirePrisma();

  const data: Record<string, unknown> = {};
  if (typeof body.done === "boolean") data.done = body.done;
  if (typeof body.owner === "string") data.owner = body.owner || null;

  if (!Object.keys(data).length) {
    return Response.json({ error: "Nothing to change." }, { status: 400 });
  }

  const step = await prisma.taskStep.update({ where: { id }, data });

  const siblings = await prisma.taskStep.findMany({ where: { taskId: step.taskId } });
  const allDone = siblings.length > 0 && siblings.every((s) => s.done);
  await prisma.phaseTask.update({ where: { id: step.taskId }, data: { done: allDone } });

  return Response.json({ step, taskDone: allDone });
}
