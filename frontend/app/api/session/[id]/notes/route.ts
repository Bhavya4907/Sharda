import { NextResponse } from "next/server";
import { loadSession, saveSession } from "@/lib/server/storage";
import { generateCustomNotes } from "@/lib/server/geminiService";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = loadSession(id);
  if (!session) return NextResponse.json({ detail: "Session not found" }, { status: 404 });

  const body = await req.json();
  const config = {
    style: body.style || "short",
    detail_level: body.detail_level || "standard",
    focus_topics: body.focus_topics || [],
  };

  try {
    const notesData = await generateCustomNotes(
      session.raw_text,
      session.concepts || [],
      config
    );

    session.generated_notes = session.generated_notes || {};
    session.generated_notes[config.style] = notesData;
    saveSession(session);

    return NextResponse.json({ notes: notesData });
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
  if (!session) return NextResponse.json({ detail: "Session not found" }, { status: 404 });

  const url = new URL(req.url);
  const style = url.searchParams.get("style") || "short";

  const notes = session.generated_notes?.[style] || null;
  return NextResponse.json({ notes });
}
