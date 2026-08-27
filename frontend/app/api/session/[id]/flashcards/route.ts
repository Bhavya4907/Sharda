import { NextResponse } from "next/server";
import { loadSession, saveSession } from "@/lib/server/storage";
import { generateFlashcards } from "@/lib/server/geminiService";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = loadSession(id);
  if (!session) return NextResponse.json({ detail: "Session not found" }, { status: 404 });

  if (!session.flashcards || session.flashcards.length === 0) {
    try {
      const cards = await generateFlashcards(
        session.raw_text,
        session.concepts || []
      );
      session.flashcards = cards;
      saveSession(session);
    } catch (e: any) {
      return NextResponse.json(
        { detail: e.message || "Flashcard generation failed" },
        { status: 502 }
      );
    }
  }

  const today = new Date().toISOString().split("T")[0];
  const due = (session.flashcards || []).filter(
    (c: any) => !c.due_date || c.due_date <= today
  );
  const notDue = (session.flashcards || []).filter(
    (c: any) => c.due_date && c.due_date > today
  );

  return NextResponse.json({
    due,
    not_due: notDue,
    mastery: session.mastery || {},
  });
}
