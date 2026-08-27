import { NextResponse } from "next/server";
import { loadSession, saveSession } from "@/lib/server/storage";
import { gradeExamPaper } from "@/lib/server/geminiService";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = loadSession(id);
  if (!session) return NextResponse.json({ detail: "Session not found" }, { status: 404 });

  const body = await req.json();
  const answers = body.answers || {};
  const violationsCount = body.violations_count ?? body.tab_switch_violations ?? 0;
  const exam = session.active_exam;

  if (!exam) {
    return NextResponse.json({ detail: "No active exam found to grade" }, { status: 400 });
  }

  try {
    const results = await gradeExamPaper(
      exam.questions,
      answers,
      violationsCount
    );

    session.mastery = session.mastery || {};
    for (const q of exam.questions) {
      const qResult = results.graded_questions?.[q.id];
      if (qResult) {
        const earned = qResult.earned_marks || 0;
        const maxM = qResult.max_marks || 1;
        const ratio = earned / maxM;
        const current = session.mastery[q.topic] || 0.5;
        session.mastery[q.topic] = Math.round((current * 0.5 + ratio * 0.5) * 100) / 100;
      }
    }

    saveSession(session);

    return NextResponse.json(results);
  } catch (e: any) {
    return NextResponse.json(
      { detail: e.message || "Exam grading failed" },
      { status: 502 }
    );
  }
}
