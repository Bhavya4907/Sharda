import { NextResponse } from "next/server";
import { loadSession } from "@/lib/server/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = loadSession(id);

  if (!session) {
    return NextResponse.json({ detail: "Session not found" }, { status: 404 });
  }

  const { raw_text, chat_history, ...sessionSummary } = session;
  return NextResponse.json(sessionSummary);
}
