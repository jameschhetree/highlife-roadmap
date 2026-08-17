import { requirePrisma } from "@/lib/db";

/** Everything the board needs, in one request. */
export async function GET() {
  const prisma = requirePrisma();
  const [quarters, items, weeks, months, thresholds, tests] = await Promise.all([
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
    prisma.monthTarget.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.threshold.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.ninetyDayTest.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return Response.json({ quarters, items, weeks, months, thresholds, tests });
}
