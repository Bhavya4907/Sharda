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
  const totalMarks = body.total_marks || 25;
  const durationMinutes = body.duration_minutes || 20;

  const prompt = `Create a custom Revision Exam Paper worth ${totalMarks} total marks based on this study material.
Return JSON:
{
  "title": "Revision Exam Paper",
  "total_marks": ${totalMarks},
  "duration_minutes": ${durationMinutes},
  "questions": [
    {
      "id": "q1",
      "type": "mcq",
      "marks": 2,
      "question": "...",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "...",
      "explanation": "..."
    },
    {
      "id": "q2",
      "type": "short_answer",
      "marks": 5,
      "question": "...",
      "explanation": "Key points..."
    }
  ]
}

STUDY MATERIAL:
${session.raw_text.slice(0, 10000)}`;

  try {
    const examPaper = await generateJson<any>(prompt, "You are Sharda, an expert exam creator.");
    session.active_exam = examPaper;
    saveSession(session);

    return NextResponse.json(examPaper);
  } catch (e: any) {
    return NextResponse.json(
      { detail: e.message || "Exam generation failed" },
      { status: 502 }
    );
  }
}
