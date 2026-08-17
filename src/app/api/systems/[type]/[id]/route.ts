import { requirePrisma } from "@/lib/db";

const ALLOWED: Record<string, string[]> = {
  trigger: ["firing", "notes"],
  offer: ["costStudied", "price", "scope"],
  risk: ["mitigated", "owner"],
};

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await ctx.params;
  const fields = ALLOWED[type];
  if (!fields) return Response.json({ error: "Unknown record type." }, { status: 404 });

  const body = (await request.json()) as Record<string, unknown>;
  const data: Record<string, unknown> = {};
  for (const k of fields) {
    if (!(k in body)) continue;
    const v = body[k];
    // Only the listed fields are writable. The signal, condition and mitigation
    // text comes from the plan; changing those belongs in the plan itself, on
    // /plan, not in a side edit here.
    if (typeof v === "boolean" || typeof v === "string") data[k] = v;
  }
  if (Object.keys(data).length === 0) {
    return Response.json({ error: "Nothing to update." }, { status: 400 });
  }

  const prisma = requirePrisma();
  const row =
    type === "trigger" ? await prisma.trigger.update({ where: { id }, data })
    : type === "offer" ? await prisma.offer.update({ where: { id }, data })
    : await prisma.risk.update({ where: { id }, data });

  return Response.json(row);
}
