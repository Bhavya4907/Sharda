import { NextResponse } from "next/server";
import { loadSession, saveSession } from "@/lib/server/storage";
import { generateExamPaper } from "@/lib/server/geminiService";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = loadSession(id);
  if (!session) return NextResponse.json({ detail: "Session not found" }, { status: 404 });

  const body = await req.json();
  const config = {
    total_marks: body.total_marks || 25,
    duration_minutes: body.duration_minutes || 20,
    mcq_count: body.mcq_count || 3,
    short_count: body.short_count || 2,
    long_count: body.long_count || 1,
    selected_topics: body.selected_topics || [],
  };

  try {
    const exam = await generateExamPaper(
      session.raw_text,
      session.concepts || [],
      config
    );
    session.active_exam = exam;
    saveSession(session);

    return NextResponse.json({ exam });
  } catch (e: any) {
    return NextResponse.json(
      { detail: e.message || "Exam generation failed" },
      { status: 502 }
    );
  }
}
