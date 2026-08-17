import { requirePrisma } from "@/lib/db";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json()) as { role?: string; owns?: string; active?: boolean };
  const data: Record<string, unknown> = {};
  for (const k of ["role", "owns"] as const) if (typeof body[k] === "string") data[k] = body[k];
  if (typeof body.active === "boolean") data.active = body.active;
  const person = await requirePrisma().person.update({ where: { id }, data });
  return Response.json(person);
}

export async function DELETE(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const prisma = requirePrisma();
  const person = await prisma.person.findUnique({ where: { id } });
  if (!person) return new Response(null, { status: 404 });

  // Removing someone who owns work would orphan it silently. Say so instead.
  const owned = await prisma.item.count({ where: { owner: person.name } });
  if (owned > 0) {
    return Response.json(
      { error: `${person.name} owns ${owned} item${owned === 1 ? "" : "s"}. Reassign those first.` },
      { status: 409 }
    );
  }
  await prisma.person.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
