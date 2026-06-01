import { requirePrisma } from "@/lib/db";

export async function POST(request: Request) {
  const prisma = requirePrisma();
  const body = await request.json();

  // Get max sortOrder for this phase
  const maxSort = await prisma.task.aggregate({
    where: { phaseId: body.phaseId },
    _max: { sortOrder: true },
  });

  const task = await prisma.task.create({
    data: {
      phaseId: body.phaseId,
      title: body.title || "New Task",
      dueLabel: body.dueLabel || "",
      category: body.category || "Operations",
      owner: body.owner || "Unassigned",
      done: false,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
    include: { steps: true },
  });

  return Response.json(task, { status: 201 });
}
