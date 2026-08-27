const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

function extractSessionId(path: string): string | null {
  const match = path.match(/\/session\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function updateLocalSession(sessionId: string, partial: Record<string, any>) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(`sharda_session_${sessionId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const updated = { ...parsed, ...partial };
      localStorage.setItem(`sharda_session_${sessionId}`, JSON.stringify(updated));
    }
  } catch {}
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry: boolean = false
): Promise<T> {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const cleanPath = path.startsWith("/api") ? path : `/api${path}`;
  const targetUrl = API_BASE ? `${API_BASE}${cleanPath}` : cleanPath;

  const res = await fetch(targetUrl, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const errorDetail = err.detail || "Request failed";

    // Auto-sync session from localStorage if a stateless serverless container cold-starts
    if (
      !isRetry &&
      typeof window !== "undefined" &&
      res.status === 404 &&
      errorDetail.toLowerCase().includes("session not found")
    ) {
      const sessionId = extractSessionId(path);
      if (sessionId) {
        const stored = localStorage.getItem(`sharda_session_${sessionId}`);
        if (stored) {
          try {
            const sessionData = JSON.parse(stored);
            const syncUrl = API_BASE ? `${API_BASE}/api/session/sync` : `/api/session/sync`;
            await fetch(syncUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(sessionData),
            });
            // Retry the original request with hydrated session
            return request<T>(path, options, true);
          } catch {}
        }
      }
    }

    throw new Error(errorDetail);
  }
  return res.json();
}

// ── Upload ──────────────────────────────────────────────────────────────────

export async function uploadPDF(file: File) {
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

  const res = await request<{
    session_id: string;
    filename: string;
    raw_text?: string;
    tldr: string;
    concept_count: number;
  }>("/upload/pdf_base64", {
    method: "POST",
    body: JSON.stringify({
      base64_data: base64Data,
      filename: file.name,
    }),
  });

  if (typeof window !== "undefined" && res.session_id) {
    localStorage.setItem(
      `sharda_session_${res.session_id}`,
      JSON.stringify({
        id: res.session_id,
        filename: res.filename || file.name,
        raw_text: res.raw_text || "",
        tldr: res.tldr,
        created_at: new Date().toISOString(),
        flashcards: [],
        quiz: [],
        chat_history: [],
        mastery: {},
        card_mastery: {},
      })
    );
  }

  return res;
}

export async function uploadText(text: string, filename?: string) {
  const res = await request<{
    session_id: string;
    filename: string;
    raw_text?: string;
    tldr: string;
    concept_count: number;
  }>("/upload/text", {
    method: "POST",
    body: JSON.stringify({ text, filename: filename || "pasted_notes.txt" }),
  });

  if (typeof window !== "undefined" && res.session_id) {
    localStorage.setItem(
      `sharda_session_${res.session_id}`,
      JSON.stringify({
        id: res.session_id,
        filename: res.filename || filename || "pasted_notes.txt",
        raw_text: res.raw_text || text,
        tldr: res.tldr,
        created_at: new Date().toISOString(),
        flashcards: [],
        quiz: [],
        chat_history: [],
        mastery: {},
        card_mastery: {},
      })
    );
  }

  return res;
}

// ── Session ─────────────────────────────────────────────────────────────────

export async function getSession(sessionId: string) {
  return request<Record<string, unknown>>(`/session/${sessionId}`);
}

export async function getSummary(sessionId: string) {
  const res = await request<{
    summary: string;
    tldr: string;
    concepts: Concept[];
  }>(`/session/${sessionId}/summary`);
  updateLocalSession(sessionId, { summary: res.summary, tldr: res.tldr, concepts: res.concepts });
  return res;
}

// ── Flashcards ───────────────────────────────────────────────────────────────

export async function getFlashcards(sessionId: string) {
  const res = await request<{
    due: Flashcard[];
    not_due: Flashcard[];
    mastery: Record<string, number>;
  }>(`/session/${sessionId}/flashcards`);
  updateLocalSession(sessionId, { flashcards: [...res.due, ...res.not_due], mastery: res.mastery });
  return res;
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
  const res = await request<{ questions: QuizQuestion[] }>(
    `/session/${sessionId}/quiz`
  );
  updateLocalSession(sessionId, { quiz: res.questions });
  return res;
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
  const res = await request<{ exam: ExamPaper }>(`/session/${sessionId}/exam/generate`, {
    method: "POST",
    body: JSON.stringify(config),
  });
  updateLocalSession(sessionId, { active_exam: res.exam });
  return res;
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
  style: "short" | "long" | "outline" | "glossary" | "mindmap" | "both";
  title: string;
  markdown_content: string;
  key_takeaways: string[];
  created_at: string;
}

export async function generateNotes(
  sessionId: string,
  styleOrConfig: string | { style: string; detail_level?: string; focus_topics?: string[] },
  focusTopics?: string[]
) {
  const config =
    typeof styleOrConfig === "string"
      ? { style: styleOrConfig, focus_topics: focusTopics || [] }
      : styleOrConfig;

  const res = await request<{ notes: NotesData }>(`/session/${sessionId}/notes`, {
    method: "POST",
    body: JSON.stringify(config),
  });
  updateLocalSession(sessionId, { notes: res.notes });
  return res;
}

export async function getNotes(sessionId: string, style: string = "short") {
  return request<{ notes: NotesData | null }>(`/session/${sessionId}/notes?style=${style}`);
}
