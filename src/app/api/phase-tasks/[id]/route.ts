import { NextRequest } from "next/server";
import { requirePrisma } from "@/lib/db";

/** Tick a task off, or hand it to an owner. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};

  if (typeof body.done === "boolean") data.done = body.done;
  if (typeof body.owner === "string") data.owner = body.owner || null;
  if (typeof body.title === "string" && body.title.trim()) data.title = body.title.trim();

  if (!Object.keys(data).length) {
    return Response.json({ error: "Nothing to change." }, { status: 400 });
  }

  const task = await requirePrisma().phaseTask.update({ where: { id }, data });
  return Response.json(task);
}
