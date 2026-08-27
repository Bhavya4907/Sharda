import { NextResponse } from "next/server";
import { saveSession } from "@/lib/server/storage";
import { extractTextFromPdfBase64 } from "@/lib/server/gemini";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const filename = file?.name || "document.pdf";

    if (!file) {
      return NextResponse.json({ detail: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // Use Gemini's multimodal PDF understanding to extract clean, rich Markdown
    const extractedText = await extractTextFromPdfBase64(base64);

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
      { detail: e.message || "PDF upload failed" },
      { status: 500 }
    );
  }
}
