import { requirePrisma } from "@/lib/db";

/** Triggers, offers and risks — the parts of the plan that watch for a condition. */
export async function GET() {
  const prisma = requirePrisma();
  const [triggers, offers, risks] = await Promise.all([
    prisma.trigger.findMany({ orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] }),
    prisma.offer.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.risk.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return Response.json({ triggers, offers, risks });
}
