import { requirePrisma } from "@/lib/db";

const NUMERIC = [
  "cashCollected", "podcastRevenue", "podcastMrr", "musicRevenue", "leads",
  "toursBooked", "toursShowed", "tourCloseRate", "recurringConversion",
  "roomHours", "editTurnaround", "roadmapCompletion",
] as const;

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await request.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};

  for (const k of NUMERIC) {
    if (!(k in body)) continue;
    const raw = body[k];
    // Blank means "not filled in", which is different from zero. Storing 0 for an
    // empty box would put a false number on the scoreboard.
    if (raw === "" || raw === null) { data[k] = null; continue; }
    const n = Number(raw);
    if (Number.isNaN(n)) return Response.json({ error: `${k} must be a number.` }, { status: 400 });
    data[k] = n;
  }
  for (const k of ["prep", "decisions", "notes"]) {
    if (typeof body[k] === "string") data[k] = body[k];
  }
  if (typeof body.held === "boolean") data.held = body.held;

  const meeting = await requirePrisma().meeting.update({ where: { id }, data });
  return Response.json(meeting);
}

export async function DELETE(_r: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await requirePrisma().meeting.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
