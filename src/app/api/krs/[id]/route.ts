import { requirePrisma } from "@/lib/db";

/** Score a key result 0.0-1.0 at quarter end (section 13). */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json()) as { score?: unknown };

  let score: number | null = null;
  if (body.score !== null && body.score !== undefined && body.score !== "") {
    const n = Number(body.score);
    if (Number.isNaN(n) || n < 0 || n > 1) {
      return Response.json({ error: "Score must be between 0.0 and 1.0." }, { status: 400 });
    }
    score = n;
  }

  const kr = await requirePrisma().keyResult.update({ where: { id }, data: { score } });
  return Response.json(kr);
}
