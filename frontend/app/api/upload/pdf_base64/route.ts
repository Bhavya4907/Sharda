import { NextResponse } from "next/server";
import { saveSession } from "@/lib/server/storage";
import { extractTextFromPdfBase64 } from "@/lib/server/gemini";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawB64 = body.base64_data || "";
    const filename = body.filename || "document.pdf";

    if (!rawB64 || rawB64.length < 50) {
      return NextResponse.json(
        { detail: "No valid PDF data received" },
        { status: 400 }
      );
    }

    // Use Gemini's multimodal PDF understanding to extract clean, rich Markdown
    const extractedText = await extractTextFromPdfBase64(rawB64);

    if (!extractedText || extractedText.length < 20) {
      return NextResponse.json(
        { detail: "Could not extract text from this PDF (it may be empty or unreadable)" },
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
      { detail: e.message || "PDF processing failed" },
      { status: 500 }
    );
  }
}
