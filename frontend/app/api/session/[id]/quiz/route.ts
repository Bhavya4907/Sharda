import { NextResponse } from "next/server";
import { loadSession, saveSession } from "@/lib/server/storage";
import { generateJson } from "@/lib/server/gemini";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = loadSession(id);

  if (!session) {
    return NextResponse.json({ detail: "Session not found" }, { status: 404 });
  }

  if (!session.quiz || session.quiz.length === 0) {
    try {
      const prompt = `Generate 5 high-yield quiz questions (3 MCQ and 2 Short Answer) from this study material.
Return JSON array:
[
  {
    "id": "q1",
    "type": "mcq",
    "question": "...",
    "options": ["A", "B", "C", "D"],
    "correct_answer": "...",
    "explanation": "..."
  },
  {
    "id": "q4",
    "type": "short_answer",
    "question": "...",
    "explanation": "Key points required: ..."
  }
]

STUDY MATERIAL:
${session.raw_text.slice(0, 10000)}`;

      const quiz = await generateJson<any[]>(prompt, "You are Sharda, an expert quiz creator.");
      session.quiz = quiz;
      saveSession(session);
    } catch (e: any) {
      return NextResponse.json(
        { detail: e.message || "Quiz generation failed" },
        { status: 502 }
      );
    }
  }

  return NextResponse.json(session.quiz);
}
