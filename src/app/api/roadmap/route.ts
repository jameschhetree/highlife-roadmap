import { requirePrisma } from "@/lib/db";

/** Everything the board needs, in one request. */
export async function GET() {
  const prisma = requirePrisma();
  const [quarters, items, weeks] = await Promise.all([
    prisma.quarter.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        objectives: {
          orderBy: { sortOrder: "asc" },
          include: { keyResults: { orderBy: { sortOrder: "asc" } } },
        },
      },
    }),
    prisma.item.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.executionWeek.findMany({ orderBy: { week: "asc" } }),
  ]);
  return Response.json({ quarters, items, weeks });
}
