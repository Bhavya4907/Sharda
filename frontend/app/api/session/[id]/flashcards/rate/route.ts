import { NextResponse } from "next/server";
import { loadSession, saveSession } from "@/lib/server/storage";

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
  const { card_id, rating } = body; // rating 1..4 (1=again, 2=hard, 3=good, 4=easy)

  const card = (session.flashcards || []).find((c: any) => c.id === card_id);
  if (card) {
    let { interval, repetition, ease_factor } = card;

    if (rating >= 3) {
      if (repetition === 0) interval = 1;
      else if (repetition === 1) interval = 6;
      else interval = Math.round(interval * ease_factor);
      repetition += 1;
    } else {
      repetition = 0;
      interval = 1;
    }

    ease_factor = Math.max(
      1.3,
      ease_factor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
    );

    card.interval = interval;
    card.repetition = repetition;
    card.ease_factor = ease_factor;
    session.card_mastery[card.concept_id] = (session.card_mastery[card.concept_id] || 0) + 10;
    saveSession(session);
  }

  return NextResponse.json({ status: "ok", card });
}
