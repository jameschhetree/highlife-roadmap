import { requirePrisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const prisma = requirePrisma();
  const phases = await prisma.phase.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      tasks: {
        orderBy: { sortOrder: "asc" },
        include: {
          steps: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });
  return Response.json(phases);
}
