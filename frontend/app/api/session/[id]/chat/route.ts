import { NextResponse } from "next/server";
import { loadSession, saveSession } from "@/lib/server/storage";
import { socraticChat } from "@/lib/server/geminiService";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = loadSession(id);
  if (!session) return NextResponse.json({ detail: "Session not found" }, { status: 404 });

  const body = await req.json();
  const userMessage = body.message || "";
  const history = session.chat_history || [];

  try {
    const aiResponse = await socraticChat(
      session.raw_text,
      history,
      userMessage
    );

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
