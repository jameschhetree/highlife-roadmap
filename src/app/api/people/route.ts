import { requirePrisma } from "@/lib/db";

export async function GET() {
  const people = await requirePrisma().person.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return Response.json(people);
}

export async function POST(request: Request) {
  const prisma = requirePrisma();
  const body = (await request.json()) as { name?: string; role?: string; owns?: string };
  const name = (body.name ?? "").trim();
  if (!name) return Response.json({ error: "A name is required." }, { status: 400 });

  const existing = await prisma.person.findUnique({ where: { name } });
  if (existing) return Response.json({ error: `${name} is already on the roster.` }, { status: 409 });

  const max = await prisma.person.aggregate({ _max: { sortOrder: true } });
  const person = await prisma.person.create({
    data: {
      name,
      role: (body.role ?? "").trim(),
      owns: (body.owns ?? "").trim(),
      sortOrder: (max._max.sortOrder ?? 0) + 1,
    },
  });
  return Response.json(person, { status: 201 });
}
