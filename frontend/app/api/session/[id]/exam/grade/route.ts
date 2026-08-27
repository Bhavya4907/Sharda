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
  const { answers, time_spent_seconds, tab_switch_violations } = body;
  const exam = session.active_exam;

  if (!exam) {
    return NextResponse.json({ detail: "No active exam found" }, { status: 400 });
  }

  const prompt = `Grade this student's completed exam paper based on the answer key.
EXAM PAPER:
${JSON.stringify(exam)}

STUDENT SUBMISSION ANSWERS:
${JSON.stringify(answers)}
VIOLATIONS DETECTED: ${tab_switch_violations || 0}

Return JSON:
{
  "total_score": 0..${exam.total_marks},
  "max_marks": ${exam.total_marks},
  "percentage": 0..100,
  "time_taken_formatted": "...",
  "violations_penalty": ${tab_switch_violations || 0},
  "grade_letter": "A|B|C|D|F",
  "feedback_summary": "...",
  "question_breakdown": [
    {
      "question_id": "q1",
      "marks_awarded": 2,
      "max_marks": 2,
      "user_answer": "...",
      "model_answer": "...",
      "feedback": "..."
    }
  ]
}`;

  try {
    const evalData = await generateJson<any>(prompt, "You are Sharda, a strict exam examiner.");
    return NextResponse.json(evalData);
  } catch (e: any) {
    return NextResponse.json(
      { detail: e.message || "Exam grading failed" },
      { status: 502 }
    );
  }
}
