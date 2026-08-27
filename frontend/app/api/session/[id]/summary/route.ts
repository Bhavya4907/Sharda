import { NextResponse } from "next/server";
import { loadSession, saveSession } from "@/lib/server/storage";
import { generateSummary } from "@/lib/server/geminiService";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = loadSession(id);
  if (!session) return NextResponse.json({ detail: "Session not found" }, { status: 404 });

  if (!session.summary || !session.concepts || session.concepts.length === 0) {
    try {
      const result = await generateSummary(session.raw_text);
      session.summary = result.summary;
      session.tldr = result.tldr;
      session.concepts = result.concepts;
      saveSession(session);
    } catch (e: any) {
      return NextResponse.json({ detail: e.message || "Summary generation failed" }, { status: 502 });
    }
  }

  return NextResponse.json({
    summary: session.summary,
    tldr: session.tldr,
    concepts: session.concepts,
  });
}
