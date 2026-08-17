import { requirePrisma } from "@/lib/db";

/** Edit a section of the plan. The document is meant to move when strategy does. */
export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json()) as { title?: string; body?: string };

  const data: { title?: string; body?: string } = {};
  if (typeof body.title === "string") {
    if (!body.title.trim()) return Response.json({ error: "A section needs a title." }, { status: 400 });
    data.title = body.title.trim();
  }
  if (typeof body.body === "string") data.body = body.body;

  const section = await requirePrisma().planSection.update({ where: { id }, data });
  return Response.json(section);
}
