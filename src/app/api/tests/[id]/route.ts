import { requirePrisma } from "@/lib/db";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json()) as { passed?: boolean };
  const test = await requirePrisma().ninetyDayTest.update({
    where: { id },
    data: { passed: Boolean(body.passed) },
  });
  return Response.json(test);
}
