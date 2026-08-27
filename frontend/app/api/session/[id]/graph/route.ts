import { NextResponse } from "next/server";
import { loadSession } from "@/lib/server/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = loadSession(id);
  if (!session) return NextResponse.json({ detail: "Session not found" }, { status: 404 });

  const concepts = session.concepts || [];
  const masteryMap = session.mastery || {};

  const nodes = concepts.map((c: any) => ({
    id: c.id,
    label: c.name,
    description: c.description || "",
    mastery: masteryMap[c.name] ?? 0.3,
  }));

  const edges: { source: string; target: string }[] = [];
  const seen = new Set<string>();

  for (const c of concepts) {
    for (const relatedId of c.related || []) {
      const key = [c.id, relatedId].sort().join("-");
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({ source: c.id, target: relatedId });
      }
    }
  }

  return NextResponse.json({ nodes, edges });
}
