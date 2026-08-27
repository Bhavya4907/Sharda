import { NextResponse } from "next/server";
import { loadSession, saveSession } from "@/lib/server/storage";
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
  const noteStyle = body.note_style || "both"; // short, long, mindmap, glossary, both

  const prompt = `Generate comprehensive AI Notes for this study material.
Requested Style: ${noteStyle}

Return JSON:
{
  "short_notes": "High-yield bulleted summary with core takeaways...",
  "long_notes": "Detailed in-depth notes with markdown headers, section breakdowns, and explanations...",
  "mindmap_outline": "- Root Topic\\n  - Branch 1\\n    - Subtopic",
  "key_glossary": [
    {"term": "...", "definition": "..."}
  ]
}

STUDY MATERIAL:
${session.raw_text.slice(0, 10000)}`;

  try {
    const notesData = await generateJson<any>(prompt, "You are Sharda, a master note-taker.");

    session.generated_notes = session.generated_notes || {};
    session.generated_notes[noteStyle] = notesData;
    saveSession(session);

    return NextResponse.json(notesData);
  } catch (e: any) {
    return NextResponse.json(
      { detail: e.message || "Notes generation failed" },
      { status: 502 }
    );
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = loadSession(id);

  if (!session) {
    return NextResponse.json({ detail: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(session.generated_notes || {});
}
