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

  const enriched: Record<
    string,
    { name: string; score: number; level: "strong" | "learning" | "weak" }
  > = {};

  for (const c of concepts) {
    const score = masteryMap[c.name] ?? 0.3;
    enriched[c.id] = {
      name: c.name,
      score,
      level: score >= 0.75 ? "strong" : score >= 0.4 ? "learning" : "weak",
    };
  }

  const weakTopics = Object.values(enriched)
    .filter((v) => v.score < 0.4)
    .map((v) => v.name);

  return NextResponse.json({
    mastery: enriched,
    weak_topics: weakTopics,
  });
}
