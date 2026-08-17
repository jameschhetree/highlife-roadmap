import { requirePrisma } from "@/lib/db";

export async function GET() {
  const sections = await requirePrisma().planSection.findMany({ orderBy: { number: "asc" } });
  return Response.json(sections);
}
