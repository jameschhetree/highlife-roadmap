import { requirePrisma } from "@/lib/db";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json()) as { done?: boolean };
  const week = await requirePrisma().executionWeek.update({
    where: { id },
    data: { done: Boolean(body.done) },
  });
  return Response.json(week);
}
