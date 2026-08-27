import { NextResponse } from "next/server";
import { saveSession } from "@/lib/server/storage";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = (body.text || "").trim();
    const filename = body.filename || "pasted_notes.txt";

    if (text.length < 20) {
      return NextResponse.json(
        { detail: "Text is too short (minimum 20 characters)" },
        { status: 422 }
      );
    }

    const sessionId = randomUUID();
    const session = {
      id: sessionId,
      filename,
      raw_text: text,
      tldr: `Study session for ${filename}`,
      created_at: new Date().toISOString(),
      flashcards: [],
      quiz: [],
      chat_history: [],
      feynman_scores: {},
      card_mastery: {},
    };

    saveSession(session);

    return NextResponse.json({
      session_id: sessionId,
      filename,
      raw_text: session.raw_text,
      tldr: session.tldr,
      concept_count: 0,
    });
  } catch (e: any) {
    return NextResponse.json(
      { detail: e.message || "Upload failed" },
      { status: 500 }
    );
  }
}
