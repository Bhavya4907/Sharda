"use client";

import { useState } from "react";
import { Flashcard, rateFlashcard } from "@/lib/api";

interface Props {
  sessionId: string;
  cards: Flashcard[];
  onUpdate: (card: Flashcard, mastery: Record<string, number>) => void;
}

type Rating = "again" | "hard" | "good" | "easy";

const RATING_CONFIG: Record<Rating, { label: string; color: string; emoji: string }> = {
  again: { label: "Again", color: "bg-red-900 border-red-700 hover:bg-red-800 text-red-300", emoji: "🔁" },
  hard: { label: "Hard", color: "bg-orange-900 border-orange-700 hover:bg-orange-800 text-orange-300", emoji: "😓" },
  good: { label: "Good", color: "bg-blue-900 border-blue-700 hover:bg-blue-800 text-blue-300", emoji: "👍" },
  easy: { label: "Easy", color: "bg-green-900 border-green-700 hover:bg-green-800 text-green-300", emoji: "✨" },
};

export default function FlashcardDeck({ sessionId, cards, onUpdate }: Props) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [rating, setRating] = useState<Rating | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const card = cards[index];

  if (done || cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
        <div className="text-5xl">🎉</div>
        <h3 className="text-xl font-semibold">Session complete!</h3>
        <p className="text-gray-400">You reviewed all {cards.length} cards. Come back tomorrow for the next set.</p>
      </div>
    );
  }

  const handleRate = async (r: Rating) => {
    setRating(r);
    setLoading(true);
    try {
      const res = await rateFlashcard(sessionId, card.id, r);
      onUpdate(res.card, res.mastery);
      setTimeout(() => {
        setLoading(false);
        setRating(null);
        setRevealed(false);
        if (index + 1 >= cards.length) setDone(true);
        else setIndex((i) => i + 1);
      }, 400);
    } catch {
      setLoading(false);
      setRating(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm text-gray-400">
        <span>{index + 1} / {cards.length} cards</span>
        <span className="text-xs bg-gray-800 rounded-full px-3 py-1">📚 {card.topic}</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-1.5">
        <div
          className="bg-gradient-to-r from-orange-500 to-red-500 h-1.5 rounded-full transition-all"
          style={{ width: `${((index + 1) / cards.length) * 100}%` }}
        />
      </div>

      {/* Card */}
      <div
        className="bg-gray-900 border border-gray-800 rounded-2xl p-8 min-h-[220px] cursor-pointer hover:border-gray-700 transition-all"
        onClick={() => !revealed && setRevealed(true)}
      >
        <div className="text-xs text-gray-500 uppercase tracking-wider mb-4 font-medium">
          {revealed ? "Answer" : "Question — click to reveal"}
        </div>
        <p className={`text-lg leading-relaxed ${revealed ? "text-green-300" : "text-gray-100"}`}>
          {revealed ? card.answer : card.question}
        </p>
        {!revealed && (
          <div className="mt-6 text-gray-600 text-sm italic">Tap to reveal answer</div>
        )}
      </div>

      {/* Show question under answer */}
      {revealed && (
        <div className="bg-gray-800/50 rounded-xl p-4 text-sm text-gray-400">
          <span className="font-medium text-gray-300">Q: </span>{card.question}
        </div>
      )}

      {/* Rating buttons */}
      {revealed && (
        <div className="grid grid-cols-4 gap-2">
          {(["again", "hard", "good", "easy"] as Rating[]).map((r) => {
            const cfg = RATING_CONFIG[r];
            return (
              <button
                key={r}
                onClick={() => handleRate(r)}
                disabled={loading}
                className={`border rounded-xl py-3 text-sm font-semibold flex flex-col items-center gap-1 transition-all disabled:opacity-50 ${cfg.color} ${rating === r ? "scale-95" : ""}`}
              >
                <span className="text-lg">{cfg.emoji}</span>
                {cfg.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
