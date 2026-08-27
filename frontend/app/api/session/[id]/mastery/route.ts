import { NextResponse } from "next/server";
import { loadSession } from "@/lib/server/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = loadSession(id);

  if (!session) {
    return NextResponse.json({ detail: "Session not found" }, { status: 404 });
  }

  const concepts = session.concepts || [];
  const cardMastery = session.card_mastery || {};
  const feynmanScores = session.feynman_scores || {};

  let totalScore = 0;
  const topics = concepts.map((c: any) => {
    const flashcardScore = Math.min(100, cardMastery[c.id] || 20);
    const feynmanScore = feynmanScores[c.id] || 0;
    const masteryScore = feynmanScore > 0 ? Math.round((flashcardScore + feynmanScore) / 2) : flashcardScore;
    totalScore += masteryScore;

    return {
      concept_id: c.id,
      title: c.title,
      mastery_percentage: masteryScore,
      status: masteryScore >= 80 ? "mastered" : masteryScore >= 50 ? "learning" : "needs_review",
    };
  });

  const overallMastery = concepts.length > 0 ? Math.round(totalScore / concepts.length) : 0;
  const weakTopics = topics.filter((t: any) => t.mastery_percentage < 60).map((t: any) => t.title);

  return NextResponse.json({
    overall_mastery: overallMastery,
    topics,
    weak_topics: weakTopics,
  });
}
