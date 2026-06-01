import { requirePrisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = requirePrisma();
  const { id } = await params;
  const body = await request.json();

  // Build update data, only include fields that were sent
  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.dueLabel !== undefined) data.dueLabel = body.dueLabel;
  if (body.category !== undefined) data.category = body.category;
  if (body.owner !== undefined) data.owner = body.owner;
  if (body.done !== undefined) data.done = body.done;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  const task = await prisma.task.update({
    where: { id },
    data,
    include: { steps: true },
  });

  return Response.json(task);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = requirePrisma();
  const { id } = await params;

  await prisma.task.delete({ where: { id } });
  return Response.json({ ok: true });
}
