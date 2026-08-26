"use client";

import { MasteryEntry } from "@/lib/api";

interface Props {
  mastery: Record<string, MasteryEntry>;
  weakTopics: string[];
}

const levelColors = {
  strong: { bar: "bg-green-500", badge: "bg-green-900/40 text-green-400 border-green-800" },
  learning: { bar: "bg-amber-500", badge: "bg-amber-900/40 text-amber-400 border-amber-800" },
  weak: { bar: "bg-red-500", badge: "bg-red-900/40 text-red-400 border-red-800" },
};

export default function MasteryTracker({ mastery, weakTopics }: Props) {
  const entries = Object.values(mastery).sort((a, b) => a.score - b.score);

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Complete some flashcards or quizzes to track your mastery.</p>
      </div>
    );
  }

  const overall = entries.reduce((acc, e) => acc + e.score, 0) / entries.length;

  return (
    <div className="space-y-6">
      {/* Overall */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center">
        <p className="text-sm text-gray-500 mb-1 uppercase tracking-wider font-medium">Overall Mastery</p>
        <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
          {Math.round(overall * 100)}%
        </div>
        <div className="mt-3 w-full bg-gray-800 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-700"
            style={{ width: `${overall * 100}%` }}
          />
        </div>
      </div>

      {/* Weak topics alert */}
      {weakTopics.length > 0 && (
        <div className="bg-red-900/20 border border-red-800/60 rounded-xl p-4">
          <p className="text-red-400 font-semibold text-sm mb-2">🎯 Focus on these topics</p>
          <div className="flex flex-wrap gap-2">
            {weakTopics.map((t) => (
              <span key={t} className="text-xs bg-red-900/40 border border-red-800 text-red-300 rounded-full px-3 py-1">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Per-topic bars */}
      <div className="space-y-3">
        {entries.map((entry) => {
          const colors = levelColors[entry.level];
          return (
            <div key={entry.name} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-300 font-medium">{entry.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs border rounded-full px-2 py-0.5 font-medium ${colors.badge}`}>
                    {entry.level}
                  </span>
                  <span className="text-sm text-gray-400 w-10 text-right">
                    {Math.round(entry.score * 100)}%
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-700 ${colors.bar}`}
                  style={{ width: `${entry.score * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
