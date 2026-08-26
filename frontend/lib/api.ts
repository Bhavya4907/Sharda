const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

// ── Upload ──────────────────────────────────────────────────────────────────

export async function uploadPDF(file: File) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/upload/pdf`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Upload failed");
  }
  return res.json();
}

export async function uploadText(text: string, filename?: string) {
  return request<{ session_id: string; tldr: string; concept_count: number }>(
    "/upload/text",
    {
      method: "POST",
      body: JSON.stringify({ text, filename: filename || "pasted_notes.txt" }),
    }
  );
}

// ── Session ─────────────────────────────────────────────────────────────────

export async function getSession(sessionId: string) {
  return request<Record<string, unknown>>(`/session/${sessionId}`);
}

export async function getSummary(sessionId: string) {
  return request<{
    summary: string;
    tldr: string;
    concepts: Concept[];
  }>(`/session/${sessionId}/summary`);
}

// ── Flashcards ───────────────────────────────────────────────────────────────

export async function getFlashcards(sessionId: string) {
  return request<{
    due: Flashcard[];
    not_due: Flashcard[];
    mastery: Record<string, number>;
  }>(`/session/${sessionId}/flashcards`);
}

export async function rateFlashcard(
  sessionId: string,
  cardId: string,
  rating: "again" | "hard" | "good" | "easy"
) {
  return request<{ card: Flashcard; mastery: Record<string, number> }>(
    `/session/${sessionId}/flashcards/${cardId}/rate`,
    { method: "POST", body: JSON.stringify({ rating }) }
  );
}

// ── Quiz ────────────────────────────────────────────────────────────────────

export async function getQuiz(sessionId: string) {
  return request<{ questions: QuizQuestion[] }>(
    `/session/${sessionId}/quiz`
  );
}

export async function gradeQuiz(
  sessionId: string,
  answers: Record<string, string>
) {
  return request<{
    results: Record<string, QuizResult>;
    mastery: Record<string, number>;
  }>(`/session/${sessionId}/quiz/grade`, {
    method: "POST",
    body: JSON.stringify({ answers }),
  });
}

// ── Chat ────────────────────────────────────────────────────────────────────

export async function sendChat(sessionId: string, message: string) {
  return request<{ response: string }>(`/session/${sessionId}/chat`, {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

export async function getChatHistory(sessionId: string) {
  return request<{ history: ChatMessage[] }>(
    `/session/${sessionId}/chat/history`
  );
}

// ── Feynman ─────────────────────────────────────────────────────────────────

export async function submitFeynman(
  sessionId: string,
  conceptId: string,
  explanation: string
) {
  return request<FeynmanResult>(`/session/${sessionId}/feynman`, {
    method: "POST",
    body: JSON.stringify({ concept_id: conceptId, explanation }),
  });
}

// ── Mastery ─────────────────────────────────────────────────────────────────

export async function getMastery(sessionId: string) {
  return request<{
    mastery: Record<string, MasteryEntry>;
    weak_topics: string[];
  }>(`/session/${sessionId}/mastery`);
}

// ── Knowledge Graph ──────────────────────────────────────────────────────────

export async function getKnowledgeGraph(sessionId: string) {
  return request<{ nodes: GraphNode[]; edges: GraphEdge[] }>(
    `/session/${sessionId}/graph`
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface Concept {
  id: string;
  name: string;
  description: string;
  related: string[];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  topic: string;
  interval: number;
  repetitions: number;
  ease_factor: number;
  due_date?: string;
}

export interface QuizQuestion {
  id: string;
  type: "mcq" | "short_answer";
  question: string;
  options?: string[];
  correct_answer: string;
  topic: string;
  explanation: string;
}

export interface QuizResult {
  correct: boolean;
  score: number;
  feedback: string;
  correct_answer: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface FeynmanResult {
  score: number;
  what_was_right: string[];
  what_was_missing: string[];
  what_was_wrong: string[];
  improved_explanation: string;
  encouragement: string;
}

export interface MasteryEntry {
  name: string;
  score: number;
  level: "strong" | "learning" | "weak";
}

export interface GraphNode {
  id: string;
  label: string;
  description: string;
  mastery: number;
}

export interface GraphEdge {
  source: string;
  target: string;
}
