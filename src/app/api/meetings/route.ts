import { requirePrisma } from "@/lib/db";

const KINDS = ["MondayBusiness", "MondayMonthly", "WednesdayTeam", "SundayBrand"] as const;

export async function GET() {
  const meetings = await requirePrisma().meeting.findMany({
    orderBy: { date: "desc" },
    take: 60,
  });
  return Response.json(meetings);
}

export async function POST(request: Request) {
  const prisma = requirePrisma();
  const body = (await request.json()) as { kind?: string; date?: string };

  if (!body.kind || !KINDS.includes(body.kind as never)) {
    return Response.json({ error: "Pick which meeting this is." }, { status: 400 });
  }
  if (!body.date || Number.isNaN(Date.parse(body.date))) {
    return Response.json({ error: "That date is not a real date." }, { status: 400 });
  }

  const date = new Date(body.date);
  const existing = await prisma.meeting.findFirst({ where: { kind: body.kind as never, date } });
  if (existing) return Response.json(existing);

  const meeting = await prisma.meeting.create({
    data: { kind: body.kind as never, date },
  });
  return Response.json(meeting, { status: 201 });
}
