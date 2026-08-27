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

  if (!session.summary || !session.concepts || session.concepts.length === 0) {
    try {
      const prompt = `Analyze the following study material and produce:
1. "summary": Detailed Markdown summary with headers, bullet points, and key formulas.
2. "tldr": One crisp 1-2 sentence TL;DR.
3. "concepts": Array of key concepts, each with {"id": "c1", "title": "...", "description": "...", "importance": "high|medium|low"}.

STUDY MATERIAL:
${session.raw_text.slice(0, 12000)}`;

      const data = await generateJson<{
        summary: string;
        tldr: string;
        concepts: any[];
      }>(prompt, "You are Sharda, an expert AI study companion.");

      session.summary = data.summary || session.summary || "Summary generated.";
      session.tldr = data.tldr || session.tldr || `Study session for ${session.filename}`;
      session.concepts = data.concepts || [];
      saveSession(session);
    } catch (e: any) {
      return NextResponse.json(
        { detail: e.message || "AI summary generation failed" },
        { status: 502 }
      );
    }
  }

  return NextResponse.json({
    summary: session.summary,
    tldr: session.tldr,
    concepts: session.concepts,
  });
}
