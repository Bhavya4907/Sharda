"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Concept,
  ExamConfig,
  ExamPaper,
  ExamGradedResult,
  generateExam,
  gradeExam,
  getActiveExam,
} from "@/lib/api";

interface Props {
  sessionId: string;
  concepts: Concept[];
}

export default function ReviseExamMode({ sessionId, concepts }: Props) {
  // State: "config" | "active" | "results"
  const [stage, setStage] = useState<"config" | "active" | "results">("config");

  // Config state
  const [config, setConfig] = useState<ExamConfig>({
    total_marks: 25,
    duration_minutes: 20,
    mcq_count: 5,
    short_count: 4,
    long_count: 1,
    selected_topics: [],
  });

  // Active Exam state
  const [exam, setExam] = useState<ExamPaper | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [violations, setViolations] = useState<number>(0);
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string>("");

  // Results state
  const [results, setResults] = useState<ExamGradedResult | null>(null);

  // Status states
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const answersRef = useRef(answers);
  answersRef.current = answers;

  const violationsRef = useRef(violations);
  violationsRef.current = violations;

  // Check for pre-existing active exam on mount
  useEffect(() => {
    getActiveExam(sessionId)
      .then((res) => {
        if (res.exam) {
          setExam(res.exam);
          // Default stage to config unless user starts it
        }
      })
      .catch(() => {});
  }, [sessionId]);

  // Submit Exam helper
  const handleSubmitExam = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const graded = await gradeExam(sessionId, answersRef.current, violationsRef.current);
      setResults(graded);
      setStage("results");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to grade exam");
    } finally {
      setSubmitting(false);
    }
  }, [sessionId, submitting]);

  // Timer countdown
  useEffect(() => {
    if (stage !== "active" || secondsRemaining <= 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [stage, secondsRemaining, handleSubmitExam]);

  // Anti-cheating / Tab-switch restriction handler
  useEffect(() => {
    if (stage !== "active") return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolations((v) => {
          const nextV = v + 1;
          setWarningMessage(
            `⚠️ Tab switch / window blur detected! (Violation #${nextV}). Please stay on this page until your exam is completed.`
          );
          setShowWarningModal(true);
          return nextV;
        });
      }
    };

    const handleBlur = () => {
      // Window lost focus
      setViolations((v) => {
        const nextV = v + 1;
        setWarningMessage(
          `⚠️ Window focus lost! (Violation #${nextV}). Keep Sharda active during your timed exam.`
        );
        setShowWarningModal(true);
        return nextV;
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [stage]);

  // Start exam from config
  const handleStartExam = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await generateExam(sessionId, config);
      setExam(res.exam);
      setAnswers({});
      setViolations(0);
      setSecondsRemaining(res.exam.duration_minutes * 60);
      setStage("active");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate exam paper");
    } finally {
      setLoading(false);
    }
  };

  // Presets
  const applyPreset = (type: "quick" | "standard" | "full") => {
    if (type === "quick") {
      setConfig({
        total_marks: 10,
        duration_minutes: 10,
        mcq_count: 5,
        short_count: 1,
        long_count: 0,
        selected_topics: [],
      });
    } else if (type === "standard") {
      setConfig({
        total_marks: 25,
        duration_minutes: 20,
        mcq_count: 5,
        short_count: 4,
        long_count: 1,
        selected_topics: [],
      });
    } else {
      setConfig({
        total_marks: 50,
        duration_minutes: 45,
        mcq_count: 10,
        short_count: 5,
        long_count: 3,
        selected_topics: [],
      });
    }
  };

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate filled answers count
  const answeredCount = exam
    ? exam.questions.filter((q) => !!answers[q.id]?.trim()).length
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Tab Switch Warning Modal */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border-2 border-red-600 rounded-2xl p-6 max-w-md w-full text-center space-y-4 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="text-4xl">🚨</div>
            <h3 className="text-xl font-bold text-red-500">Exam Integrity Warning</h3>
            <p className="text-sm text-gray-300 leading-relaxed">{warningMessage}</p>
            <div className="bg-red-950/50 border border-red-800/50 rounded-xl p-3 text-xs text-red-300">
              Total Focus Violations Recorded: <strong>{violations}</strong>
            </div>
            <button
              onClick={() => setShowWarningModal(false)}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-2.5 rounded-xl transition-all text-sm"
            >
              I Understand — Return to Exam
            </button>
          </div>
        </div>
      )}

      {/* ──────────────── STAGE 1: CONFIGURATION ──────────────── */}
      {stage === "config" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-orange-950/40 to-red-950/30 border border-orange-800/50 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">📝</span>
              <div>
                <h2 className="text-xl font-bold text-gray-100">Revision Exam Generator</h2>
                <p className="text-sm text-gray-400">
                  Customise your exam paper, total marks, time limit, and test your knowledge under timed conditions.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="space-y-3">
            <label className="text-sm text-gray-400 font-semibold uppercase tracking-wider block">
              Quick Exam Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => applyPreset("quick")}
                className="bg-gray-900 border border-gray-800 hover:border-orange-500/50 p-4 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-orange-400">⚡ Quick Practice</span>
                  <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">10 Mins</span>
                </div>
                <p className="text-xs text-gray-400">10 Marks (5 MCQs, 1 Short)</p>
              </button>

              <button
                onClick={() => applyPreset("standard")}
                className="bg-gray-900 border border-gray-800 hover:border-orange-500/50 p-4 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-orange-400">📄 Standard Exam</span>
                  <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">20 Mins</span>
                </div>
                <p className="text-xs text-gray-400">25 Marks (MCQ + Short + Long)</p>
              </button>

              <button
                onClick={() => applyPreset("full")}
                className="bg-gray-900 border border-gray-800 hover:border-orange-500/50 p-4 rounded-xl text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-orange-400">🏋️ Full Revision Paper</span>
                  <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400">45 Mins</span>
                </div>
                <p className="text-xs text-gray-400">50 Marks Comprehensive</p>
              </button>
            </div>
          </div>

          {/* Custom Controls */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
            <h3 className="text-base font-semibold text-gray-200 border-b border-gray-800 pb-3">
              ⚙️ Custom Exam Pattern
            </h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1.5">
                  ⏱️ Exam Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={120}
                  value={config.duration_minutes}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, duration_minutes: Math.max(5, parseInt(e.target.value) || 10) }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 font-medium block mb-1.5">
                  🎯 Target Marks Goal
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={config.total_marks}
                  onChange={(e) =>
                    setConfig((c) => ({ ...c, total_marks: Math.max(5, parseInt(e.target.value) || 20) }))
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-200 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-xs text-gray-400 font-medium block">
                📋 Question Type Breakdown
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 text-center">
                  <span className="text-xs text-gray-400 block mb-1">MCQs (1 Mark ea)</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={config.mcq_count}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, mcq_count: Math.max(0, parseInt(e.target.value) || 0) }))
                    }
                    className="w-full bg-gray-900 text-center font-bold text-orange-400 rounded-lg py-1 text-sm focus:outline-none"
                  />
                </div>

                <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 text-center">
                  <span className="text-xs text-gray-400 block mb-1">Short (3 Marks ea)</span>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={config.short_count}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, short_count: Math.max(0, parseInt(e.target.value) || 0) }))
                    }
                    className="w-full bg-gray-900 text-center font-bold text-orange-400 rounded-lg py-1 text-sm focus:outline-none"
                  />
                </div>

                <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 text-center">
                  <span className="text-xs text-gray-400 block mb-1">Long (5 Marks ea)</span>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={config.long_count}
                    onChange={(e) =>
                      setConfig((c) => ({ ...c, long_count: Math.max(0, parseInt(e.target.value) || 0) }))
                    }
                    className="w-full bg-gray-900 text-center font-bold text-orange-400 rounded-lg py-1 text-sm focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Topic Filter */}
            {concepts.length > 0 && (
              <div className="pt-2">
                <label className="text-xs text-gray-400 font-medium block mb-2">
                  📌 Topic Scope (Leave empty to cover all)
                </label>
                <div className="flex flex-wrap gap-2">
                  {concepts.map((c) => {
                    const selected = config.selected_topics.includes(c.name);
                    return (
                      <button
                        key={c.id}
                        onClick={() => {
                          setConfig((prev) => ({
                            ...prev,
                            selected_topics: selected
                              ? prev.selected_topics.filter((t) => t !== c.name)
                              : [...prev.selected_topics, c.name],
                          }));
                        }}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          selected
                            ? "bg-orange-600 border-orange-500 text-white font-medium"
                            : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"
                        }`}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-amber-950/30 border border-amber-800/40 rounded-xl p-3.5 text-xs text-amber-300/80 flex items-start gap-2">
              <span className="text-base">🔒</span>
              <div>
                <strong>Anti-Cheating Mode Active:</strong> During the exam, switching tabs or losing window focus will record violations and show warnings. Stay focused until completion!
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleStartExam}
            disabled={loading}
            className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-base"
          >
            {loading && <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {loading ? "Generating Exam Paper with Gemini AI..." : "🚀 Generate & Start Exam"}
          </button>
        </div>
      )}

      {/* ──────────────── STAGE 2: ACTIVE EXAM ──────────────── */}
      {stage === "active" && exam && (
        <div className="space-y-6">
          {/* Floating Exam Header Bar */}
          <div className="sticky top-16 bg-gray-950/95 backdrop-blur border border-gray-800 rounded-2xl p-4 flex items-center justify-between shadow-xl z-20">
            <div>
              <h3 className="font-bold text-gray-100 text-base">{exam.title}</h3>
              <p className="text-xs text-gray-400">
                {answeredCount} / {exam.questions.length} answered · Total Marks: {exam.total_marks}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Anti Cheat Badge */}
              <div className={`text-xs px-2.5 py-1 rounded-full border ${
                violations > 0
                  ? "bg-red-950 border-red-700 text-red-400 font-bold animate-pulse"
                  : "bg-gray-900 border-gray-800 text-gray-400"
              }`}>
                🛡️ Violations: {violations}
              </div>

              {/* Timer */}
              <div className={`text-xl font-mono font-bold px-3 py-1 rounded-xl border ${
                secondsRemaining < 120
                  ? "bg-red-950 border-red-700 text-red-400 animate-bounce"
                  : "bg-gray-900 border-gray-800 text-orange-400"
              }`}>
                ⏱️ {formatTimer(secondsRemaining)}
              </div>
            </div>
          </div>

          {/* Question List */}
          <div className="space-y-6">
            {exam.questions.map((q, idx) => (
              <div key={q.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-gray-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                        Question {idx + 1}
                      </span>
                      <span className="text-xs bg-gray-800 border border-gray-700 rounded-md px-2 py-0.5 text-gray-300">
                        {q.marks} {q.marks === 1 ? "Mark" : "Marks"}
                      </span>
                      <span className="text-xs bg-orange-950 border border-orange-800/50 rounded-md px-2 py-0.5 text-orange-300">
                        {q.topic}
                      </span>
                    </div>
                    <h4 className="text-base font-semibold text-gray-100 leading-relaxed">
                      {q.question}
                    </h4>
                  </div>
                </div>

                {/* Question Input Types */}
                {q.type === "mcq" && q.options ? (
                  <div className="space-y-2">
                    {q.options.map((opt) => {
                      const selected = answers[q.id] === opt;
                      return (
                        <button
                          key={opt}
                          onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                          className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all flex items-center gap-3 ${
                            selected
                              ? "border-orange-500 bg-orange-900/20 text-orange-200 font-medium"
                              : "border-gray-800 bg-gray-800/40 text-gray-300 hover:border-gray-700"
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            selected ? "border-orange-500 bg-orange-500" : "border-gray-600"
                          }`}>
                            {selected && <div className="w-1.5 h-1.5 bg-black rounded-full" />}
                          </div>
                          <span>{opt}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={answers[q.id] || ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      rows={q.type === "long_answer" ? 6 : 3}
                      placeholder={
                        q.type === "long_answer"
                          ? "Write a detailed explanation addressing all parts of the question..."
                          : "Type your concise answer here..."
                      }
                      className="w-full bg-gray-800/60 border border-gray-700 rounded-xl p-4 text-sm text-gray-100 placeholder-gray-500 resize-none focus:outline-none focus:border-orange-500 transition-colors"
                    />
                    <div className="text-xs text-gray-500 flex justify-between">
                      <span>Rubric hint: {q.rubric}</span>
                      <span>{(answers[q.id] || "").length} characters</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Submission Bar */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
            <span className="text-sm text-gray-400">
              Ready to submit? Make sure to review all answers.
            </span>

            <button
              onClick={handleSubmitExam}
              disabled={submitting}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 disabled:opacity-40 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-md flex items-center gap-2 text-sm"
            >
              {submitting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? "Grading Paper..." : "Finish & Submit Exam →"}
            </button>
          </div>
        </div>
      )}

      {/* ──────────────── STAGE 3: GRADED RESULTS ──────────────── */}
      {stage === "results" && results && exam && (
        <div className="space-y-6">
          {/* Header Scorecard */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center space-y-3 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-red-600/10 pointer-events-none" />
            <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
              Revision Exam Results
            </p>
            <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
              {results.score_earned} / {results.total_marks} Marks
            </div>
            <div className="text-lg font-bold text-gray-300">
              Grade: {results.percentage}%
            </div>

            <div className="max-w-md mx-auto bg-gray-800/80 rounded-xl p-3 border border-gray-700 text-xs text-gray-300 leading-relaxed">
              {results.overall_feedback}
            </div>

            {results.violations_count > 0 && (
              <div className="inline-block bg-red-950/60 border border-red-800 text-red-400 text-xs px-3 py-1 rounded-full">
                ⚠️ {results.violations_count} focus / tab-switch warnings recorded during test
              </div>
            )}
          </div>

          {/* Weak Topics Identification */}
          {((results.topic_gaps?.length ?? 0) > 0) && (
            <div className="bg-red-950/20 border border-red-800/50 rounded-2xl p-5 space-y-2">
              <h4 className="text-sm font-bold text-red-400 flex items-center gap-2">
                <span>🎯 Topics Needing Immediate Revision</span>
              </h4>
              <p className="text-xs text-gray-400">
                You scored low on questions related to these concepts. Review them using Flashcards or Feynman Mode!
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                {(results.topic_gaps || []).map((topic) => (
                  <span
                    key={topic}
                    className="bg-red-900/40 border border-red-700/60 text-red-300 text-xs px-2.5 py-1 rounded-lg font-medium"
                  >
                    ⚠️ {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Detailed Question Review */}
          <div className="space-y-4">
            <h4 className="text-base font-bold text-gray-200">Detailed Answer Analysis</h4>
            {exam.questions.map((q, idx) => {
              const graded = results.graded_questions[q.id];
              if (!graded) return null;

              const isFull = graded.earned_marks === graded.max_marks;
              const isPartial = graded.earned_marks > 0 && !isFull;

              return (
                <div
                  key={q.id}
                  className={`bg-gray-900 border rounded-2xl p-5 space-y-3 ${
                    isFull
                      ? "border-green-800/60"
                      : isPartial
                      ? "border-amber-800/60"
                      : "border-red-800/60"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 border-b border-gray-800 pb-2">
                    <span className="text-xs font-bold text-gray-400">
                      Q{idx + 1}. {q.topic} ({q.type})
                    </span>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      isFull
                        ? "bg-green-950 border border-green-700 text-green-400"
                        : isPartial
                        ? "bg-amber-950 border border-amber-700 text-amber-400"
                        : "bg-red-950 border border-red-700 text-red-400"
                    }`}>
                      {graded.earned_marks} / {graded.max_marks} Marks
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-gray-200">{q.question}</p>

                  <div className="space-y-2 text-xs">
                    <div className="bg-gray-800/50 rounded-xl p-3 text-gray-300">
                      <span className="font-bold text-gray-400 block mb-0.5">Your Answer:</span>
                      {graded.user_answer ? (
                        <p className="whitespace-pre-wrap">{graded.user_answer}</p>
                      ) : (
                        <span className="italic text-gray-500">Unanswered</span>
                      )}
                    </div>

                    <div className="bg-gray-800/30 rounded-xl p-3 text-gray-300 border border-gray-800">
                      <span className="font-bold text-gray-400 block mb-0.5">Model Answer & Rubric:</span>
                      <p className="text-green-400/90 whitespace-pre-wrap">{graded.correct_answer}</p>
                      <span className="text-gray-500 text-[11px] block mt-1">Rubric: {graded.rubric}</span>
                    </div>

                    <div className={`rounded-xl p-3 ${
                      isFull ? "bg-green-950/30 text-green-300" : isPartial ? "bg-amber-950/30 text-amber-300" : "bg-red-950/30 text-red-300"
                    }`}>
                      <span className="font-bold block mb-0.5">AI Feedback:</span>
                      <p>{graded.feedback}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => {
              setStage("config");
              setResults(null);
              setExam(null);
            }}
            className="w-full border border-orange-600 text-orange-400 hover:bg-orange-600/10 font-bold py-3.5 rounded-xl transition-all text-sm"
          >
            🔄 Take Another Revision Exam
          </button>
        </div>
      )}
    </div>
  );
}
