import { requirePrisma } from "@/lib/db";

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json()) as { label?: string; amount?: unknown };
  const data: Record<string, unknown> = {};

  if (typeof body.label === "string") {
    const label = body.label.trim();
    if (!label) return Response.json({ error: "Name the expense." }, { status: 400 });
    data.label = label;
  }
  if ("amount" in body) {
    const amount = Number(body.amount);
    if (Number.isNaN(amount) || amount < 0) {
      return Response.json({ error: "The monthly amount must be a number." }, { status: 400 });
    }
    data.amount = amount;
  }

  const fixed = await requirePrisma().fixedExpense.update({ where: { id }, data });
  return Response.json(fixed);
}

export async function DELETE(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await requirePrisma().fixedExpense.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
