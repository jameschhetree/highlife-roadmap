import { requirePrisma } from "@/lib/db";

const FIELDS = [
  "purpose", "trigger", "inputs", "steps",
  "qualityCheck", "sla", "escalation", "version",
] as const;

export async function GET(_r: Request, ctx: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await ctx.params;
  const doc = await requirePrisma().sopDoc.findUnique({ where: { itemId } });
  return Response.json(doc);
}

export async function PUT(request: Request, ctx: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await ctx.params;
  const prisma = requirePrisma();
  const body = (await request.json()) as Record<string, unknown>;

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return Response.json({ error: "No such item." }, { status: 404 });
  if (item.view !== "SOP") {
    return Response.json({ error: "Only an SOP can carry a procedure." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  for (const f of FIELDS) if (typeof body[f] === "string") data[f] = body[f];
  if (typeof body.published === "boolean") {
    // Publishing is what Launch Sprint O2 KR3 counts, so it should mean the
    // procedure is actually written, not that someone ticked a box on a blank.
    if (body.published) {
      const merged = { ...(await prisma.sopDoc.findUnique({ where: { itemId } })), ...data } as Record<string, string>;
      const missing = ["purpose", "trigger", "steps"].filter((f) => !(merged[f] ?? "").trim());
      if (missing.length) {
        return Response.json(
          { error: `Cannot publish without ${missing.join(", ")}.` },
          { status: 400 }
        );
      }
    }
    data.published = body.published;
  }

  const doc = await prisma.sopDoc.upsert({
    where: { itemId },
    create: { itemId, ...data },
    update: data,
  });
  return Response.json(doc);
}
