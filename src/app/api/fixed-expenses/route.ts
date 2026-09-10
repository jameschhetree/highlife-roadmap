import { requirePrisma } from "@/lib/db";

export async function GET() {
  const fixed = await requirePrisma().fixedExpense.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return Response.json(fixed);
}

export async function POST(request: Request) {
  const prisma = requirePrisma();
  const body = (await request.json()) as { label?: string; amount?: unknown };
  const label = (body.label ?? "").trim();
  if (!label) return Response.json({ error: "Name the expense." }, { status: 400 });

  const amount = Number(body.amount);
  if (Number.isNaN(amount) || amount < 0) {
    return Response.json({ error: "The monthly amount must be a number." }, { status: 400 });
  }

  const max = await prisma.fixedExpense.aggregate({ _max: { sortOrder: true } });
  const fixed = await prisma.fixedExpense.create({
    data: { label, amount, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
  return Response.json(fixed, { status: 201 });
}
