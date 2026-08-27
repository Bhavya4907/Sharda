import { NextResponse } from "next/server";
import { loadSession, saveSession } from "@/lib/server/storage";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; cardId: string }> }
) {
  const { id, cardId } = await params;
  const session = loadSession(id);
  if (!session) return NextResponse.json({ detail: "Session not found" }, { status: 404 });

  const body = await req.json();
  const ratingStr = (body.rating || "good").toLowerCase();

  const card = (session.flashcards || []).find((c: any) => c.id === cardId);
  if (!card) return NextResponse.json({ detail: "Card not found" }, { status: 404 });

  let { interval = 1, repetitions = 0, ease_factor = 2.5 } = card;

  if (ratingStr === "again") {
    repetitions = 0;
    interval = 1;
    ease_factor = Math.max(1.3, ease_factor - 0.2);
  } else if (ratingStr === "hard") {
    interval = Math.max(1, Math.round(interval * 1.2));
    ease_factor = Math.max(1.3, ease_factor - 0.15);
  } else if (ratingStr === "good") {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 6;
    else interval = Math.round(interval * ease_factor);
    repetitions += 1;
  } else if (ratingStr === "easy") {
    if (repetitions === 0) interval = 4;
    else interval = Math.round(interval * ease_factor * 1.3);
    repetitions += 1;
    ease_factor += 0.15;
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);

  card.interval = interval;
  card.repetitions = repetitions;
  card.ease_factor = ease_factor;
  card.due_date = dueDate.toISOString().split("T")[0];

  session.mastery = session.mastery || {};
  const current = session.mastery[card.topic] || 0.3;
  const delta = ratingStr === "again" ? -0.1 : ratingStr === "hard" ? 0.05 : ratingStr === "good" ? 0.15 : 0.25;
  session.mastery[card.topic] = Math.max(0.0, Math.min(1.0, round(current + delta, 2)));

  saveSession(session);

  return NextResponse.json({
    card,
    mastery: session.mastery,
  });
}

function round(n: number, decimals: number) {
  return Number(Math.round(Number(n + "e" + decimals)) + "e-" + decimals);
}
