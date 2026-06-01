import { requirePrisma } from "@/lib/db";

export async function POST(request: Request) {
  const prisma = requirePrisma();
  const body = await request.json();

  const maxSort = await prisma.step.aggregate({
    where: { taskId: body.taskId },
    _max: { sortOrder: true },
  });

  const step = await prisma.step.create({
    data: {
      taskId: body.taskId,
      title: body.title || "New Step",
      owner: body.owner || "Unassigned",
      done: false,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return Response.json(step, { status: 201 });
}
