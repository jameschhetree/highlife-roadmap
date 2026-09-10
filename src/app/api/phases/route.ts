import { requirePrisma } from "@/lib/db";

/** The 12-month plan: four phases, their tasks, and each task's steps. */
export async function GET() {
  const phases = await requirePrisma().phase.findMany({
    orderBy: { number: "asc" },
    include: {
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: { steps: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  return Response.json(phases);
}
