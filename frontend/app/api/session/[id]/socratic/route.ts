import { NextResponse } from "next/server";
import { loadSession, saveSession } from "@/lib/server/storage";
import { callGeminiRest } from "@/lib/server/gemini";

const SOCRATIC_SYSTEM = `You are Sharda, a Socratic AI tutor. You have been given study material and your job is to help the student TRULY understand it — not just give them answers.

CORE RULES:
1. NEVER directly answer a question the student can figure out themselves. Instead, ask a guiding question that leads them toward the answer.
2. If the student gives a partial answer, acknowledge what's right and probe deeper with another question.
3. Only give a direct explanation if the student has tried at least twice and is clearly stuck.
4. Keep responses concise — 2-4 sentences max plus one question.
5. Be warm and encouraging, never condescending.`;

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
  const userMessage = body.message || "";
  const history = session.chat_history || [];

  const historyText = history
    .slice(-8)
    .map((m: any) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const prompt = `STUDY MATERIAL:
${session.raw_text.slice(0, 8000)}

CONVERSATION HISTORY:
${historyText}

STUDENT: ${userMessage}

Respond as Sharda the Socratic Tutor:`;

  try {
    const aiResponse = await callGeminiRest(prompt, SOCRATIC_SYSTEM, false);

    session.chat_history = [
      ...history,
      { role: "user", content: userMessage },
      { role: "assistant", content: aiResponse },
    ];
    saveSession(session);

    return NextResponse.json({ response: aiResponse });
  } catch (e: any) {
    return NextResponse.json(
      { detail: e.message || "Socratic tutor error" },
      { status: 502 }
    );
  }
}
