"use client";

import { useState } from "react";
import { Concept, FeynmanResult, submitFeynman } from "@/lib/api";

interface Props {
  sessionId: string;
  concepts: Concept[];
}

export default function FeynmanMode({ sessionId, concepts }: Props) {
  const [selectedId, setSelectedId] = useState(concepts[0]?.id || "");
  const [explanation, setExplanation] = useState("");
  const [result, setResult] = useState<FeynmanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (explanation.trim().length < 20) {
      setError("Write at least 20 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await submitFeynman(sessionId, selectedId, explanation);
      setResult(res);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setExplanation("");
    setError("");
  };

  const scoreColor =
    !result ? ""
    : result.score >= 75 ? "text-green-400"
    : result.score >= 50 ? "text-amber-400"
    : "text-red-400";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Concept picker */}
      <div>
        <label className="text-sm text-gray-400 font-medium mb-2 block">
          Choose a concept to explain
        </label>
        <div className="flex flex-wrap gap-2">
          {concepts.map((c) => (
            <button
              key={c.id}
              onClick={() => { setSelectedId(c.id); setResult(null); }}
              className={`text-sm px-3 py-1.5 rounded-full border transition-all ${
                selectedId === c.id
                  ? "bg-orange-600 border-orange-500 text-white"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-orange-900/20 border border-orange-800/50 rounded-xl p-4 text-sm text-orange-300">
        <p className="font-medium mb-1">🔬 The Feynman Technique</p>
        <p className="text-orange-200/70">
          Explain <strong>{concepts.find((c) => c.id === selectedId)?.name}</strong> in your own words, as if you were teaching a 12-year-old. Don&apos;t look at your notes. If you can&apos;t explain it simply, you don&apos;t understand it yet.
        </p>
      </div>

      {/* Text area */}
      <textarea
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
        disabled={!!result}
        placeholder="Explain this concept in simple terms..."
        rows={6}
        className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-500 text-sm resize-none focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-60"
      />

      {!result ? (
        <>
          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? "Grading your explanation..." : "Submit Explanation →"}
          </button>
        </>
      ) : (
        <div className="space-y-4">
          {/* Score */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center space-y-2">
            <div className={`text-5xl font-bold ${scoreColor}`}>{result.score}/100</div>
            <p className="text-gray-300 italic">&ldquo;{result.encouragement}&rdquo;</p>
          </div>

          {/* Breakdown */}
          <div className="grid gap-3">
            {result.what_was_right.length > 0 && (
              <div className="bg-green-900/20 border border-green-800/50 rounded-xl p-4">
                <p className="text-green-400 font-semibold text-sm mb-2">✅ What you got right</p>
                <ul className="text-sm text-green-300 space-y-1 list-disc list-inside">
                  {result.what_was_right.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            )}
            {result.what_was_missing.length > 0 && (
              <div className="bg-amber-900/20 border border-amber-800/50 rounded-xl p-4">
                <p className="text-amber-400 font-semibold text-sm mb-2">⚠️ What was missing</p>
                <ul className="text-sm text-amber-300 space-y-1 list-disc list-inside">
                  {result.what_was_missing.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            )}
            {result.what_was_wrong.length > 0 && (
              <div className="bg-red-900/20 border border-red-800/50 rounded-xl p-4">
                <p className="text-red-400 font-semibold text-sm mb-2">❌ Misconceptions</p>
                <ul className="text-sm text-red-300 space-y-1 list-disc list-inside">
                  {result.what_was_wrong.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            )}
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
              <p className="text-gray-300 font-semibold text-sm mb-2">📖 Model Explanation</p>
              <p className="text-sm text-gray-400 leading-relaxed">{result.improved_explanation}</p>
            </div>
          </div>

          <button
            onClick={handleReset}
            className="w-full border border-orange-600 text-orange-400 hover:bg-orange-600/10 font-semibold py-3 rounded-xl transition-all text-sm"
          >
            Try Again →
          </button>
        </div>
      )}
    </div>
  );
}
