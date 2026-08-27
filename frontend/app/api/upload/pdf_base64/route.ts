import { NextResponse } from "next/server";
import { saveSession } from "@/lib/server/storage";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawB64 = body.base64_data || "";
    const filename = body.filename || "document.pdf";

    // Clean base64 prefix
    const cleanB64 = rawB64.includes(",") ? rawB64.split(",")[1] : rawB64;
    const buffer = Buffer.from(cleanB64, "base64");
    const rawText = buffer.toString("latin1");

    // Extract printable text characters
    const textMatches = rawText.replace(/[^\x20-\x7E\n\r]/g, " ");
    const words = textMatches
      .split(/\s+/)
      .filter((w) => w.length >= 2 && /^[a-zA-Z0-9.,!?'"-]+$/.test(w));
    const extractedText = words.join(" ");

    if (extractedText.length < 20) {
      return NextResponse.json(
        { detail: "Could not extract text from this PDF (it may be image-only or scanned)" },
        { status: 422 }
      );
    }

    const sessionId = randomUUID();
    const session = {
      id: sessionId,
      filename,
      raw_text: extractedText,
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
