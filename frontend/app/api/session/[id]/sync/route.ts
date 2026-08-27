import { NextResponse } from "next/server";
import { saveSession } from "@/lib/server/storage";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const session = { ...body, id: body.id || id };
    saveSession(session);
    return NextResponse.json({ status: "synced", id: session.id });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message || "Sync failed" }, { status: 500 });
  }
}
