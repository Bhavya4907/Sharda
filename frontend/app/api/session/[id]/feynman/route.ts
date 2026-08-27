import { NextResponse } from "next/server";
import { loadSession, saveSession } from "@/lib/server/storage";
import { gradeFeynman } from "@/lib/server/geminiService";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = loadSession(id);
  if (!session) return NextResponse.json({ detail: "Session not found" }, { status: 404 });

  const body = await req.json();
  const { concept_id, explanation } = body;

  const concept = (session.concepts || []).find((c: any) => c.id === concept_id) || {
    id: concept_id,
    name: concept_id,
    description: "",
    related: [],
  };

  try {
    const evalData = await gradeFeynman(concept, session.raw_text, explanation);

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
