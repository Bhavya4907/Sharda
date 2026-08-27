"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Concept, NotesData, generateNotes, getNotes } from "@/lib/api";

interface Props {
  sessionId: string;
  concepts: Concept[];
}

type NoteStyle = "short" | "long" | "outline" | "glossary";

const STYLES: { id: NoteStyle; label: string; emoji: string; desc: string }[] = [
  {
    id: "short",
    label: "Short & High-Yield",
    emoji: "⚡",
    desc: "Concise bullet points, formulas & key facts for quick review",
  },
  {
    id: "long",
    label: "Detailed Long Notes",
    emoji: "📖",
    desc: "Comprehensive textbook-style notes with in-depth explanations & tables",
  },
  {
    id: "outline",
    label: "Mind-Map Outline",
    emoji: "📁",
    desc: "Hierarchical tree structure with nested concept relationships",
  },
  {
    id: "glossary",
    label: "Glossary & Formulas",
    emoji: "💡",
    desc: "Key definitions, terms, equations & core principles cheat-sheet",
  },
];

export default function NotesMaker({ sessionId, concepts }: Props) {
  const [selectedStyle, setSelectedStyle] = useState<NoteStyle>("short");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [notes, setNotes] = useState<NotesData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Load existing notes for current style if present
  useEffect(() => {
    getNotes(sessionId, selectedStyle)
      .then((res) => {
        if (res.notes) setNotes(res.notes);
        else setNotes(null);
      })
      .catch(() => {});
  }, [sessionId, selectedStyle]);

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await generateNotes(sessionId, selectedStyle, selectedTopics);
      setNotes(res.notes);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate notes");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!notes) return;
    navigator.clipboard.writeText(notes.markdown_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!notes) return;
    const blob = new Blob([notes.markdown_content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${notes.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-orange-950/40 to-red-950/30 border border-orange-800/50 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">📚</span>
          <div>
            <h2 className="text-xl font-bold text-gray-100">AI Notes Generator</h2>
            <p className="text-sm text-gray-400">
              Transform your study material into custom short summaries, detailed textbook notes, outlines, or formula cheat-sheets.
            </p>
          </div>
        </div>
      </div>

      {/* Note Style Selection Cards */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block">
          Choose Note Format / Length
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STYLES.map((st) => {
            const active = selectedStyle === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setSelectedStyle(st.id)}
                className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  active
                    ? "border-orange-500 bg-orange-900/20 text-gray-100 shadow-md"
                    : "border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700 hover:text-gray-200"
                }`}
              >
                <span className="text-2xl">{st.emoji}</span>
                <div>
                  <h4 className={`text-sm font-bold ${active ? "text-orange-400" : "text-gray-200"}`}>
                    {st.label}
                  </h4>
                  <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{st.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Topic Filter */}
      {concepts.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
          <label className="text-xs text-gray-400 font-medium block">
            📌 Focus Topics (Optional - leave blank to cover all)
          </label>
          <div className="flex flex-wrap gap-2">
            {concepts.map((c) => {
              const selected = selectedTopics.includes(c.name);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedTopics((prev) =>
                      selected ? prev.filter((t) => t !== c.name) : [...prev, c.name]
                    );
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

      {/* Generate Action Button */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 disabled:opacity-40 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm"
      >
        {loading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
        {loading
          ? `Generating ${selectedStyle.toUpperCase()} Notes with Gemini AI...`
          : `✨ Generate ${STYLES.find((s) => s.id === selectedStyle)?.label}`}
      </button>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-xl px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Notes Display */}
      {notes && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Action Bar */}
          <div className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3">
            <h3 className="font-bold text-gray-200 text-sm truncate">{notes.title}</h3>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleCopy}
                className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
              >
                <span>{copied ? "✅" : "📋"}</span>
                <span>{copied ? "Copied!" : "Copy Text"}</span>
              </button>
              <button
                onClick={handleDownload}
                className="text-xs bg-orange-950 hover:bg-orange-900 border border-orange-800/60 text-orange-300 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5"
              >
                <span>📥</span>
                <span>Download .md</span>
              </button>
            </div>
          </div>

          {/* Key Takeaways */}
          {((notes.key_takeaways?.length ?? 0) > 0) && (
            <div className="bg-gradient-to-r from-orange-950/30 to-amber-950/20 border border-orange-800/40 rounded-xl p-4 space-y-2">
              <h4 className="text-xs font-bold text-orange-400 uppercase tracking-wider">
                💡 Key Takeaways
              </h4>
              <ul className="space-y-1 text-sm text-orange-200/90 list-disc list-inside">
                {(notes.key_takeaways || []).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Markdown Content Box */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 prose prose-invert prose-sm max-w-none leading-relaxed shadow-lg">
            <ReactMarkdown>{notes.markdown_content}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
