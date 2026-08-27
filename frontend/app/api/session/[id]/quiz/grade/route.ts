import { NextResponse } from "next/server";
import { loadSession } from "@/lib/server/storage";
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
  const { question_id, user_answer } = body;

  const question = (session.quiz || []).find((q: any) => q.id === question_id);
  if (!question) {
    return NextResponse.json({ detail: "Question not found" }, { status: 404 });
  }

  if (question.type === "mcq") {
    const isCorrect = user_answer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
    return NextResponse.json({
      score: isCorrect ? 100 : 0,
      feedback: isCorrect ? "Correct!" : `Incorrect. Correct answer is: ${question.correct_answer}`,
      model_answer: question.correct_answer,
    });
  }

  try {
    const prompt = `Grade this student's short answer response.
QUESTION: ${question.question}
EXPECTED KEY POINTS: ${question.explanation || ""}
STUDENT ANSWER: ${user_answer}

Return JSON: {"score": 0..100, "feedback": "...", "model_answer": "..."}`;

    const res = await generateJson<any>(prompt, "You are Sharda, a constructive AI grader.");
    return NextResponse.json(res);
  } catch {
    return NextResponse.json({
      score: 70,
      feedback: "Answer received and recorded.",
      model_answer: question.explanation || "",
    });
  }
}
