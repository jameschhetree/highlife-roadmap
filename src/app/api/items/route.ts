import { requirePrisma } from "@/lib/db";
import { validate, toData, type ItemInput } from "@/lib/items";

export async function POST(request: Request) {
  const prisma = requirePrisma();
  const body = (await request.json()) as ItemInput;

  const problem = validate(body);
  if (problem) return Response.json({ error: problem }, { status: 400 });

  const max = await prisma.item.aggregate({
    where: { view: toData(body).view },
    _max: { sortOrder: true },
  });

  const item = await prisma.item.create({
    data: { ...toData(body), sortOrder: (max._max.sortOrder ?? -1) + 1 } as never,
  });
  return Response.json(item, { status: 201 });
}
