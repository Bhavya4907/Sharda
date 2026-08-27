import { NextResponse } from "next/server";
import { loadSession, saveSession } from "@/lib/server/storage";
import { gradeQuiz } from "@/lib/server/geminiService";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = loadSession(id);
  if (!session) return NextResponse.json({ detail: "Session not found" }, { status: 404 });

  const body = await req.json();
  const answers = body.answers || {};

  if (!session.quiz || session.quiz.length === 0) {
    return NextResponse.json({ detail: "No quiz generated yet" }, { status: 400 });
  }

  const results = await gradeQuiz(session.quiz, answers);

  session.mastery = session.mastery || {};
  for (const q of session.quiz) {
    const res = results[q.id];
    if (res) {
      const current = session.mastery[q.topic] || 0.5;
      session.mastery[q.topic] = Math.round((current * 0.6 + res.score * 0.4) * 100) / 100;
    }
  }

  saveSession(session);

  return NextResponse.json({
    results,
    mastery: session.mastery,
  });
}
