import { NextResponse } from "next/server";
import { loadSession, saveSession } from "@/lib/server/storage";
import { generateQuiz } from "@/lib/server/geminiService";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = loadSession(id);
  if (!session) return NextResponse.json({ detail: "Session not found" }, { status: 404 });

  if (!session.quiz || session.quiz.length === 0) {
    try {
      const questions = await generateQuiz(
        session.raw_text,
        session.concepts || []
      );
      session.quiz = questions;
      saveSession(session);
    } catch (e: any) {
      return NextResponse.json(
        { detail: e.message || "Quiz generation failed" },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({ questions: session.quiz });
}
