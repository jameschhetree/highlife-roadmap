import { requirePrisma } from "@/lib/db";

const FIELDS = [
  "purpose", "trigger", "inputs", "steps",
  "qualityCheck", "sla", "escalation", "version",
] as const;

/**
 * Only Google's own document hosts.
 *
 * This URL gets put in an iframe, so anything goes there would let a bad link
 * render arbitrary content inside the app. Restricting it to Docs and Drive also
 * means the preview trick below is guaranteed to work.
 */
function normaliseDocUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "";
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  if (!["docs.google.com", "drive.google.com"].includes(u.hostname)) return null;
  return u.toString();
}

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

  if (typeof body.docUrl === "string") {
    const url = normaliseDocUrl(body.docUrl);
    if (url === null) {
      return Response.json(
        { error: "That needs to be a Google Docs or Drive link." },
        { status: 400 }
      );
    }
    data.docUrl = url;
  }
  if (typeof body.published === "boolean") {
    // Publishing is what Launch Sprint O2 KR3 counts, so it should mean the
    // procedure is actually written, not that someone ticked a box on a blank.
    if (body.published) {
      const merged = { ...(await prisma.sopDoc.findUnique({ where: { itemId } })), ...data } as Record<string, string>;
      // A linked Google Doc is a written SOP. Requiring the nine fields as well
      // would mean maintaining the same procedure in two places, which is how
      // the two versions start disagreeing.
      const hasDoc = (merged.docUrl ?? "").trim().length > 0;
      if (!hasDoc) {
        const missing = ["purpose", "trigger", "steps"].filter((f) => !(merged[f] ?? "").trim());
        if (missing.length) {
          return Response.json(
            { error: `Add a Google Doc link, or fill in ${missing.join(", ")}.` },
            { status: 400 }
          );
        }
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
