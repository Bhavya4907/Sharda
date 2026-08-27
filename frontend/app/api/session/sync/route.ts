import { NextResponse } from "next/server";
import { saveSession } from "@/lib/server/storage";

export async function POST(req: Request) {
  try {
    const session = await req.json();
    if (!session || !session.id) {
      return NextResponse.json({ detail: "Invalid session data" }, { status: 400 });
    }
    saveSession(session);
    return NextResponse.json({ status: "synced", id: session.id });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || "Sync failed" }, { status: 500 });
  }
}
