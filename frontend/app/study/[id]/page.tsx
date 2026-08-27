"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import {
  getSummary, getFlashcards, getQuiz, getMastery, getKnowledgeGraph,
  getChatHistory,
  Concept, Flashcard, QuizQuestion, MasteryEntry, GraphNode, GraphEdge, ChatMessage,
} from "@/lib/api";
import dynamic from "next/dynamic";
import FlashcardDeck from "@/components/FlashcardDeck";
import QuizMode from "@/components/QuizMode";
import SocraticChat from "@/components/SocraticChat";
import FeynmanMode from "@/components/FeynmanMode";
import MasteryTracker from "@/components/MasteryTracker";
import ReviseExamMode from "@/components/ReviseExamMode";
import NotesMaker from "@/components/NotesMaker";

const KnowledgeGraph = dynamic(() => import("@/components/KnowledgeGraph"), { ssr: false });

type Tab = "overview" | "notes" | "flashcards" | "quiz" | "chat" | "feynman" | "mastery" | "revise";

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: "overview", label: "Overview", emoji: "🧠" },
  { id: "notes", label: "AI Notes", emoji: "📚" },
  { id: "flashcards", label: "Flashcards", emoji: "🃏" },
  { id: "quiz", label: "Quiz", emoji: "❓" },
  { id: "chat", label: "Socratic Chat", emoji: "💬" },
  { id: "feynman", label: "Feynman", emoji: "🔬" },
  { id: "mastery", label: "Mastery", emoji: "📊" },
  { id: "revise", label: "Revise Exam", emoji: "📝" },
];

export default function StudyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");

  // Data states
  const [summary, setSummary] = useState("");
  const [tldr, setTldr] = useState("");
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [mastery, setMastery] = useState<Record<string, MasteryEntry>>({});
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [graphNodes, setGraphNodes] = useState<GraphNode[]>([]);
  const [graphEdges, setGraphEdges] = useState<GraphEdge[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setLoad = (key: string, v: boolean) =>
    setLoading((l) => ({ ...l, [key]: v }));

  // Load overview data on mount
  useEffect(() => {
    if (!id) return;
    setLoad("summary", true);
    getSummary(id)
      .then((d) => {
        setSummary(d.summary);
        setTldr(d.tldr);
        setConcepts(d.concepts);
      })
      .catch((e) => setErrors((er) => ({ ...er, summary: e.message })))
      .finally(() => setLoad("summary", false));

    getKnowledgeGraph(id)
      .then((d) => { setGraphNodes(d.nodes); setGraphEdges(d.edges); })
      .catch(() => {});

    getMastery(id)
      .then((d) => { setMastery(d.mastery); setWeakTopics(d.weak_topics); })
      .catch(() => {});
  }, [id]);

  // Lazy-load per tab
  const loadTab = useCallback(async (t: Tab) => {
    if (t === "flashcards" && flashcards.length === 0) {
      setLoad("flashcards", true);
      try {
        const d = await getFlashcards(id);
        setFlashcards([...d.due, ...d.not_due]);
      } catch (e: unknown) {
        setErrors((er) => ({ ...er, flashcards: e instanceof Error ? e.message : "Failed" }));
      } finally { setLoad("flashcards", false); }
    }
    if (t === "quiz" && questions.length === 0) {
      setLoad("quiz", true);
      try {
        const d = await getQuiz(id);
        setQuestions(d.questions);
      } catch (e: unknown) {
        setErrors((er) => ({ ...er, quiz: e instanceof Error ? e.message : "Failed" }));
      } finally { setLoad("quiz", false); }
    }
    if (t === "chat" && chatHistory.length === 0) {
      try {
        const d = await getChatHistory(id);
        setChatHistory(d.history);
      } catch { /* no history is fine */ }
    }
  }, [id, flashcards.length, questions.length, chatHistory.length]);

  const switchTab = (t: Tab) => {
    setTab(t);
    loadTab(t);
  };

  const handleFlashcardUpdate = (updatedCard: Flashcard, newMastery: Record<string, number>) => {
    setFlashcards((cards) => cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)));
    // Refresh mastery from server
    getMastery(id).then((d) => { setMastery(d.mastery); setWeakTopics(d.weak_topics); }).catch(() => {});
  };

  const Spinner = () => (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-3 sticky top-0 bg-gray-950/95 backdrop-blur z-10">
        <button
          onClick={() => router.push("/")}
          className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-sm font-bold text-white shadow-md shrink-0"
        >
          S
        </button>
        <span className="font-semibold tracking-tight">Sharda</span>
        <span className="text-gray-600 mx-1">·</span>
        {tldr ? (
          <span className="text-sm text-gray-400 truncate max-w-sm">{tldr}</span>
        ) : (
          <span className="text-sm text-gray-600">Loading...</span>
        )}
      </header>

      {/* Tab nav */}
      <nav className="border-b border-gray-800 px-6 flex gap-1 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => switchTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              tab === t.id
                ? "border-orange-500 text-orange-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <span>{t.emoji}</span> {t.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 px-4 py-8 max-w-4xl mx-auto w-full">
        {/* Overview */}
        {tab === "overview" && (
          <div className="space-y-8">
            {loading.summary ? <Spinner /> : errors.summary ? (
              <div className="text-red-400 text-sm">{errors.summary}</div>
            ) : (
              <>
                {tldr && (
                  <div className="bg-gradient-to-r from-orange-900/30 to-red-900/20 border border-orange-800/50 rounded-2xl p-6">
                    <p className="text-xs text-orange-400 uppercase tracking-wider font-medium mb-2">TL;DR</p>
                    <p className="text-gray-200 text-lg leading-relaxed">{tldr}</p>
                  </div>
                )}

                {graphNodes.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">🧠 Knowledge Graph</h2>
                    <KnowledgeGraph nodes={graphNodes} edges={graphEdges} />
                  </div>
                )}

                {concepts.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Key Concepts</h2>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {concepts.map((c) => (
                        <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                          <p className="font-semibold text-orange-300 text-sm">{c.name}</p>
                          <p className="text-gray-400 text-sm mt-1 leading-relaxed">{c.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {summary && (
                  <div>
                    <h2 className="text-lg font-semibold mb-4">AI Summary</h2>
                    <div className="prose prose-invert prose-sm max-w-none bg-gray-900 border border-gray-800 rounded-2xl p-6">
                      <ReactMarkdown>{summary}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* AI Notes */}
        {tab === "notes" && (
          <NotesMaker sessionId={id} concepts={concepts} />
        )}

        {/* Flashcards */}
        {tab === "flashcards" && (
          loading.flashcards ? <Spinner /> :
          errors.flashcards ? <div className="text-red-400 text-sm">{errors.flashcards}</div> :
          <FlashcardDeck
            sessionId={id}
            cards={flashcards}
            onUpdate={handleFlashcardUpdate}
          />
        )}

        {/* Quiz */}
        {tab === "quiz" && (
          loading.quiz ? <Spinner /> :
          errors.quiz ? <div className="text-red-400 text-sm">{errors.quiz}</div> :
          questions.length > 0 ? <QuizMode sessionId={id} questions={questions} /> : <Spinner />
        )}

        {/* Socratic Chat */}
        {tab === "chat" && (
          <SocraticChat sessionId={id} initialHistory={chatHistory} />
        )}

        {/* Feynman */}
        {tab === "feynman" && (
          concepts.length > 0
            ? <FeynmanMode sessionId={id} concepts={concepts} />
            : <Spinner />
        )}

        {/* Mastery */}
        {tab === "mastery" && (
          <MasteryTracker mastery={mastery} weakTopics={weakTopics} />
        )}

        {/* Revise Exam */}
        {tab === "revise" && (
          <ReviseExamMode sessionId={id} concepts={concepts} />
        )}
      </main>
    </div>
  );
}
