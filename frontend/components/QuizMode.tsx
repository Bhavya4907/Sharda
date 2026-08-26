"use client";

import { useState } from "react";
import { QuizQuestion, QuizResult, gradeQuiz } from "@/lib/api";

interface Props {
  sessionId: string;
  questions: QuizQuestion[];
}

export default function QuizMode({ sessionId, questions }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, QuizResult> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const score = results
    ? Object.values(results).filter((r) => r.correct).length
    : 0;

  const handleSubmit = async () => {
    if (Object.keys(answers).length < questions.length) {
      setError("Please answer all questions before submitting.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await gradeQuiz(sessionId, answers);
      setResults(res.results);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Grading failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setAnswers({});
    setResults(null);
    setError("");
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {results && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center space-y-2">
          <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
            {score}/{questions.length}
          </div>
          <p className="text-gray-300">
            {score === questions.length
              ? "Perfect score! 🎉"
              : score >= questions.length * 0.7
              ? "Great job! Keep it up 💪"
              : "Review the topics in red and try again 📚"}
          </p>
          <button
            onClick={handleReset}
            className="mt-2 text-sm text-orange-400 hover:text-orange-300 underline"
          >
            Retake Quiz
          </button>
        </div>
      )}

      {questions.map((q, i) => {
        const result = results?.[q.id];
        return (
          <div
            key={q.id}
            className={`bg-gray-900 border rounded-2xl p-6 space-y-4 transition-all ${
              result
                ? result.correct
                  ? "border-green-700"
                  : "border-red-700"
                : "border-gray-800"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                  {i + 1}. {q.type === "mcq" ? "Multiple Choice" : "Short Answer"} · {q.topic}
                </span>
                <p className="mt-2 text-gray-100 font-medium">{q.question}</p>
              </div>
              {result && (
                <span className="text-xl shrink-0">{result.correct ? "✅" : "❌"}</span>
              )}
            </div>

            {q.type === "mcq" ? (
              <div className="space-y-2">
                {q.options?.map((opt) => {
                  const selected = answers[q.id] === opt;
                  const isCorrect = result && opt === result.correct_answer;
                  const isWrong = result && selected && !result.correct;

                  return (
                    <button
                      key={opt}
                      onClick={() => !result && setAnswers((a) => ({ ...a, [q.id]: opt }))}
                      disabled={!!result}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                        isCorrect
                          ? "border-green-600 bg-green-900/30 text-green-300"
                          : isWrong
                          ? "border-red-600 bg-red-900/30 text-red-300"
                          : selected
                          ? "border-orange-500 bg-orange-900/20 text-orange-300"
                          : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-500"
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            ) : (
              <textarea
                value={answers[q.id] || ""}
                onChange={(e) =>
                  !result && setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                }
                disabled={!!result}
                placeholder="Type your answer..."
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-gray-200 placeholder-gray-500 text-sm resize-none focus:outline-none focus:border-orange-500 transition-colors disabled:opacity-60"
              />
            )}

            {result && (
              <div className={`rounded-xl px-4 py-3 text-sm ${result.correct ? "bg-green-900/20 text-green-300" : "bg-red-900/20 text-red-300"}`}>
                <p className="font-medium mb-1">{result.correct ? "Correct!" : `Answer: ${result.correct_answer}`}</p>
                <p className="text-gray-400">{result.feedback}</p>
              </div>
            )}
          </div>
        );
      })}

      {!results && (
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
            {loading ? "Grading..." : "Submit Quiz →"}
          </button>
        </>
      )}
    </div>
  );
}
