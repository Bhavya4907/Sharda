"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { uploadPDF, uploadText } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();
  const [tab, setTab] = useState<"pdf" | "text">("pdf");
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError("");
      try {
        const res = await uploadPDF(file);
        router.push(`/study/${res.session_id}`);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Upload failed");
        setLoading(false);
      }
    },
    [router]
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") handleFile(file);
    else setError("Please drop a PDF file");
  };

  const handleTextSubmit = async () => {
    if (text.trim().length < 100) {
      setError("Please enter at least 100 characters");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await uploadText(text);
      router.push(`/study/${res.session_id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-sm font-bold">
          P
        </div>
        <span className="font-semibold text-lg tracking-tight">Prometheus</span>
        <span className="ml-2 text-xs text-gray-500 border border-gray-700 rounded-full px-2 py-0.5">
          AI Study Companion
        </span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-2xl w-full text-center space-y-4 mb-12">
          <h1 className="text-5xl font-bold tracking-tight">
            Upload your notes.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">
              Let AI teach you back.
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Prometheus uses spaced repetition, Socratic questioning, and the
            Feynman technique — proven learning science that NotebookLM ignores.
          </p>
        </div>

        {/* Feature Pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {[
            "🧠 AI Knowledge Graph",
            "🃏 Spaced Repetition",
            "💬 Socratic Tutor",
            "🔬 Feynman Mode",
            "📊 Mastery Tracking",
          ].map((f) => (
            <span
              key={f}
              className="text-sm bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-gray-300"
            >
              {f}
            </span>
          ))}
        </div>

        {/* Upload Card */}
        <div className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-2xl">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-gray-800 rounded-xl mb-6">
            {(["pdf", "text"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === t
                    ? "bg-gray-950 text-white shadow"
                    : "text-gray-400 hover:text-gray-200"
                }`}
              >
                {t === "pdf" ? "📄 Upload PDF" : "✍️ Paste Text"}
              </button>
            ))}
          </div>

          {tab === "pdf" ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
                dragging
                  ? "border-orange-500 bg-orange-500/10"
                  : "border-gray-700 hover:border-gray-500"
              }`}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <div className="text-4xl mb-3">📄</div>
              <p className="text-gray-300 font-medium">
                Drop your PDF here, or click to browse
              </p>
              <p className="text-gray-500 text-sm mt-1">Max 20 MB</p>
              <input
                id="file-input"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Paste your study notes, lecture text, or any content you want to learn..."
                rows={8}
                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-gray-200 placeholder-gray-500 resize-none focus:outline-none focus:border-orange-500 transition-colors text-sm"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  {text.length} characters {text.length < 100 && "(min 100)"}
                </span>
                <button
                  onClick={handleTextSubmit}
                  disabled={loading || text.length < 100}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition-all text-sm"
                >
                  {loading ? "Analyzing..." : "Start Learning →"}
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-orange-400 text-sm">
              <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              AI is analyzing your material...
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>

        <p className="mt-8 text-gray-600 text-sm">
          No account needed · Sessions are anonymous · Powered by Gemini 2.5 Flash
        </p>
      </main>
    </div>
  );
}
