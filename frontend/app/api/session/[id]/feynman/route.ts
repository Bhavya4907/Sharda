import { NextResponse } from "next/server";
import { loadSession, saveSession } from "@/lib/server/storage";
import { generateJson } from "@/lib/server/gemini";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = loadSession(id);

  if (!session) {
    return NextResponse.json({ detail: "Session not found" }, { status: 404 });
  }

  const body = await req.json();
  const { concept_id, explanation } = body;

  const concept = (session.concepts || []).find((c: any) => c.id === concept_id) || {
    id: concept_id,
    title: concept_id,
    description: "",
  };

  const prompt = `Evaluate the student's explanation using the Feynman Technique.
CONCEPT: ${concept.title} - ${concept.description}
STUDY MATERIAL CONTEXT: ${session.raw_text.slice(0, 5000)}
STUDENT'S EXPLANATION: ${explanation}

Grade strictly:
- score: 0..100 (100 = explained simply without jargon)
- misconceptions: list of wrong statements or invalid analogies
- missing_points: key sub-concepts missed
- model_explanation: simple 2-sentence Feynman explanation

Return JSON: {"score": 0..100, "misconceptions": [...], "missing_points": [...], "model_explanation": "..."}`;

  try {
    const evalData = await generateJson<any>(prompt, "You are Sharda, a Feynman technique evaluator.");

    session.feynman_scores = session.feynman_scores || {};
    session.feynman_scores[concept_id] = evalData.score;
    saveSession(session);

    return NextResponse.json(evalData);
  } catch (e: any) {
    return NextResponse.json(
      { detail: e.message || "Feynman evaluation error" },
      { status: 502 }
    );
  }
}
