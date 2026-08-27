const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = { "Content-Type": "application/json", ...options.headers };
  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Request failed");
    }
    return res.json();
  } catch (e: unknown) {
    // Fallback retry via Next.js same-origin proxy if cross-port fetch fails
    if (typeof window !== "undefined" && !process.env.NEXT_PUBLIC_API_URL) {
      const proxyRes = await fetch(`/api-backend${path}`, { ...options, headers });
      if (!proxyRes.ok) {
        const err = await proxyRes.json().catch(() => ({ detail: proxyRes.statusText }));
        throw new Error(err.detail || "Request failed");
      }
      return proxyRes.json();
    }
    throw e;
  }
}

// ── Upload ──────────────────────────────────────────────────────────────────

export async function uploadPDF(file: File) {
  const form = new FormData();
  form.append("file", file);
  try {
    const res = await fetch(`${API_BASE}/upload/pdf`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || "Upload failed");
    }
    return res.json();
  } catch {
    const proxyRes = await fetch(`/api-backend/upload/pdf`, {
      method: "POST",
      body: form,
    });
    if (!proxyRes.ok) {
      const err = await proxyRes.json().catch(() => ({ detail: proxyRes.statusText }));
      throw new Error(err.detail || "Upload failed");
    }
    return proxyRes.json();
  }
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

// ── Exam / Revision Mode ───────────────────────────────────────────────────

export interface ExamConfig {
  total_marks: number;
  duration_minutes: number;
  mcq_count: number;
  short_count: number;
  long_count: number;
  selected_topics: string[];
}

export interface ExamQuestion {
  id: string;
  type: "mcq" | "short_answer" | "long_answer";
  marks: number;
  question: string;
  options?: string[];
  correct_answer: string;
  topic: string;
  rubric: string;
}

export interface ExamPaper {
  id: string;
  title: string;
  total_marks: number;
  duration_minutes: number;
  questions: ExamQuestion[];
}

export interface ExamGradedQuestion {
  earned_marks: number;
  max_marks: number;
  feedback: string;
  correct_answer: string;
  user_answer: string;
  rubric: string;
}

export interface ExamGradedResult {
  score_earned: number;
  total_marks: number;
  percentage: number;
  violations_count: number;
  graded_questions: Record<string, ExamGradedQuestion>;
  topic_gaps: string[];
  overall_feedback: string;
}

export async function generateExam(sessionId: string, config: ExamConfig) {
  return request<{ exam: ExamPaper }>(`/session/${sessionId}/exam/generate`, {
    method: "POST",
    body: JSON.stringify(config),
  });
}

export async function getActiveExam(sessionId: string) {
  return request<{ exam: ExamPaper | null }>(`/session/${sessionId}/exam/active`);
}

export async function gradeExam(
  sessionId: string,
  answers: Record<string, string>,
  violationsCount: number
) {
  return request<ExamGradedResult>(`/session/${sessionId}/exam/grade`, {
    method: "POST",
    body: JSON.stringify({ answers, violations_count: violationsCount }),
  });
}

// ── AI Notes Maker ──────────────────────────────────────────────────────────

export interface NotesData {
  id: string;
  style: "short" | "long" | "outline" | "glossary";
  title: string;
  markdown_content: string;
  key_takeaways: string[];
  created_at: string;
}

export async function generateNotes(
  sessionId: string,
  style: "short" | "long" | "outline" | "glossary",
  selectedTopics: string[] = []
) {
  return request<{ notes: NotesData }>(`/session/${sessionId}/notes`, {
    method: "POST",
    body: JSON.stringify({ style, selected_topics: selectedTopics }),
  });
}

export async function getNotes(sessionId: string, style: string = "short") {
  return request<{ notes: NotesData | null }>(`/session/${sessionId}/notes?style=${style}`);
}


