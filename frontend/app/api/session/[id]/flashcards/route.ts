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

  if (!session.flashcards || session.flashcards.length === 0) {
    try {
      const prompt = `Generate 8-12 spaced repetition flashcards from this study material.
Return JSON array of objects: [{"id": "fc1", "concept_id": "c1", "front": "Question...", "back": "Answer..."}].

STUDY MATERIAL:
${session.raw_text.slice(0, 10000)}`;

      const cards = await generateJson<any[]>(prompt, "You are Sharda, an expert flashcard generator.");

      session.flashcards = cards.map((c: any, i: number) => ({
        id: c.id || `fc_${i + 1}`,
        concept_id: c.concept_id || `c${(i % 3) + 1}`,
        front: c.front,
        back: c.back,
        interval: 1,
        repetition: 0,
        ease_factor: 2.5,
        due_date: new Date().toISOString().split("T")[0],
      }));
      saveSession(session);
    } catch (e: any) {
      return NextResponse.json(
        { detail: e.message || "Flashcard generation failed" },
        { status: 502 }
      );
    }
  }

  return NextResponse.json(session.flashcards);
}
