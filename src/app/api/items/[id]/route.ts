import { requirePrisma } from "@/lib/db";
import { validate, toData, type ItemInput } from "@/lib/items";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const prisma = requirePrisma();
  const body = (await request.json()) as ItemInput;

  // Partial update, but the owner rule still applies: it can be changed, not emptied.
  const problem = validate(body, { partial: true });
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const item = await prisma.item.update({ where: { id }, data: toData(body) as never });
  return Response.json(item);
}

export async function DELETE(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await requirePrisma().item.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
