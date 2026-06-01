import { requirePrisma } from "@/lib/db";
import { NextRequest } from "next/server";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = requirePrisma();
  const { id } = await params;
  const body = await request.json();

  const data: Record<string, unknown> = {};
  if (body.title !== undefined) data.title = body.title;
  if (body.owner !== undefined) data.owner = body.owner;
  if (body.done !== undefined) data.done = body.done;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

  const step = await prisma.step.update({
    where: { id },
    data,
  });

  return Response.json(step);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const prisma = requirePrisma();
  const { id } = await params;

  await prisma.step.delete({ where: { id } });
  return Response.json({ ok: true });
}
