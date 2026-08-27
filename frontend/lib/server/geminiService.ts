import { generateJson, callGeminiRest } from "./gemini";

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

export interface NotesData {
  style: "short" | "long" | "mindmap" | "glossary" | "both";
  markdown_content: string;
  word_count: number;
  key_formulas_terms: string[];
}

export async function generateSummary(text: string): Promise<{
  summary: string;
  tldr: string;
  concepts: Concept[];
}> {
  const prompt = `You are Sharda, an expert study companion. Analyze this material:
1. Provide a comprehensive, beautifully formatted Markdown summary.
2. Provide a crisp 1-2 sentence TL;DR.
3. Identify 4-8 core concepts with relationships.

STUDY MATERIAL:
---
${text.slice(0, 10000)}
---

Return JSON:
{
  "summary": "Markdown string with #, ##, bullet points, and key formulas",
  "tldr": "1-2 sentence summary",
  "concepts": [
    {
      "id": "c1",
      "name": "Concept Name",
      "description": "Clear 1-2 sentence explanation",
      "related": ["c2", "c3"]
    }
  ]
}`;

  return generateJson<{
    summary: string;
    tldr: string;
    concepts: Concept[];
  }>(prompt, "You are Sharda, an expert study tutor.");
}

export async function generateFlashcards(
  text: string,
  concepts: Concept[]
): Promise<Flashcard[]> {
  const conceptList = concepts.map((c) => `${c.id}: ${c.name}`).join("\n");
  const prompt = `Generate 6-10 high-yield flashcards from this study material.
CONCEPTS:
${conceptList}

STUDY MATERIAL:
${text.slice(0, 8000)}

Return JSON array of objects:
[
  {
    "id": "fc_1",
    "question": "Clear, focused question",
    "answer": "Concise, precise answer",
    "topic": "Concept Name"
  }
]`;

  const cards = await generateJson<any[]>(
    prompt,
    "You are Sharda, an expert flashcard generator."
  );

  return cards.map((c, i) => ({
    id: c.id || `fc_${i + 1}`,
    question: c.question || c.front || "",
    answer: c.answer || c.back || "",
    topic: c.topic || (concepts[0]?.name ?? "General"),
    interval: 1,
    repetitions: 0,
    ease_factor: 2.5,
    due_date: new Date().toISOString().split("T")[0],
  }));
}

export async function generateQuiz(
  text: string,
  concepts: Concept[]
): Promise<QuizQuestion[]> {
  const conceptList = concepts.map((c) => `${c.id}: ${c.name}`).join(", ");
  const prompt = `Generate 4-6 quiz questions (mix of MCQ and short answer) from this material.
TOPICS: ${conceptList}

STUDY MATERIAL:
${text.slice(0, 8000)}

Return JSON array:
[
  {
    "id": "q1",
    "type": "mcq",
    "question": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "topic": "Topic Name",
    "explanation": "Why this answer is correct"
  },
  {
    "id": "q2",
    "type": "short_answer",
    "question": "Conceptual question",
    "correct_answer": "Key points expected in answer",
    "topic": "Topic Name",
    "explanation": "Explanation of concept"
  }
]`;

  return generateJson<QuizQuestion[]>(
    prompt,
    "You are Sharda, an expert quiz creator."
  );
}

export async function gradeQuiz(
  questions: QuizQuestion[],
  answers: Record<string, string>
): Promise<Record<string, QuizResult>> {
  const results: Record<string, QuizResult> = {};

  for (const q of questions) {
    const userAnswer = (answers[q.id] || "").trim();

    if (q.type === "mcq") {
      const correct =
        userAnswer.toLowerCase() === q.correct_answer.toLowerCase();
      results[q.id] = {
        correct,
        score: correct ? 1.0 : 0.0,
        feedback: correct
          ? "Correct! Well done."
          : `Incorrect. The correct answer was: ${q.correct_answer}. ${q.explanation}`,
        correct_answer: q.correct_answer,
      };
    } else {
      const prompt = `Grade this short answer response:
QUESTION: ${q.question}
IDEAL ANSWER: ${q.correct_answer}
STUDENT ANSWER: ${userAnswer}

Return JSON:
{
  "correct": true or false (true if score >= 0.6),
  "score": 0.0 to 1.0,
  "feedback": "Constructive 1-2 sentence feedback explaining what was good and what was missing",
  "correct_answer": "${q.correct_answer}"
}`;

      try {
        const graded = await generateJson<QuizResult>(
          prompt,
          "You are Sharda, a constructive AI grader."
        );
        results[q.id] = graded;
      } catch {
        results[q.id] = {
          correct: true,
          score: 0.8,
          feedback: "Good effort!",
          correct_answer: q.correct_answer,
        };
      }
    }
  }

  return results;
}

const SOCRATIC_SYSTEM = `You are Sharda, a Socratic AI tutor. You have been given study material and your job is to help the student TRULY understand it — not just give them answers.

CORE RULES:
1. NEVER directly answer a question the student can figure out themselves. Instead, ask a guiding question that leads them toward the answer.
2. If the student gives a partial answer, acknowledge what's right and probe deeper with another question.
3. Only give a direct explanation if the student has tried at least twice and is clearly stuck.
4. Keep responses concise — 2-4 sentences max plus one question.
5. Be warm and encouraging, never condescending.`;

export async function socraticChat(
  text: string,
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  const historyText = history
    .slice(-8)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n");

  const prompt = `STUDY MATERIAL:
---
${text.slice(0, 8000)}
---

CONVERSATION HISTORY:
${historyText}

USER: ${userMessage}

Respond as Sharda the Socratic tutor:`;

  return callGeminiRest(prompt, SOCRATIC_SYSTEM, false);
}

export async function gradeFeynman(
  concept: Concept,
  text: string,
  explanation: string
): Promise<FeynmanResult> {
  const prompt = `Evaluate the student's explanation using the Feynman Technique:
CONCEPT: ${concept.name}
DESCRIPTION: ${concept.description}

STUDY MATERIAL:
${text.slice(0, 4000)}

STUDENT'S EXPLANATION:
${explanation}

Return JSON:
{
  "score": integer from 0 to 100,
  "what_was_right": ["bullet point 1", "bullet point 2"],
  "what_was_missing": ["missed point 1"],
  "what_was_wrong": ["misconception 1 if any"],
  "improved_explanation": "A crystal-clear, simple explanation suitable for a 12-year-old",
  "encouragement": "Warm, motivating 1-sentence message"
}`;

  return generateJson<FeynmanResult>(
    prompt,
    "You are Sharda, an expert Feynman technique evaluator."
  );
}

export async function generateExamPaper(
  text: string,
  concepts: Concept[],
  config: {
    total_marks: number;
    duration_minutes: number;
    mcq_count: number;
    short_count: number;
    long_count: number;
    selected_topics: string[];
  }
): Promise<ExamPaper> {
  const prompt = `Create a custom timed revision exam paper based on this material:
CONFIG:
- Total Marks: ${config.total_marks}
- Duration: ${config.duration_minutes} minutes
- MCQ Count: ${config.mcq_count}
- Short Answer Count: ${config.short_count}
- Long Answer Count: ${config.long_count}
- Topics: ${config.selected_topics.join(", ") || "All concepts"}

STUDY MATERIAL:
${text.slice(0, 9000)}

Return JSON:
{
  "id": "exam_${Date.now()}",
  "title": "Revision Exam Paper",
  "total_marks": ${config.total_marks},
  "duration_minutes": ${config.duration_minutes},
  "questions": [
    {
      "id": "eq_1",
      "type": "mcq",
      "marks": 2,
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "topic": "Topic Name",
      "rubric": "Correct option is A"
    },
    {
      "id": "eq_2",
      "type": "short_answer",
      "marks": 5,
      "question": "Question text",
      "correct_answer": "Ideal model answer",
      "topic": "Topic Name",
      "rubric": "Key points for grading"
    }
  ]
}`;

  return generateJson<ExamPaper>(
    prompt,
    "You are Sharda, an expert exam examiner."
  );
}

export async function gradeExamPaper(
  questions: ExamQuestion[],
  answers: Record<string, string>,
  violationsCount: number = 0
): Promise<any> {
  const prompt = `Grade this student's exam submission:
QUESTIONS & RUBRICS:
${JSON.stringify(questions)}

STUDENT ANSWERS:
${JSON.stringify(answers)}
VIOLATIONS COUNT: ${violationsCount}

Return JSON:
{
  "total_score": integer earned score,
  "max_marks": integer total possible,
  "percentage": float (0-100),
  "time_taken_formatted": "e.g. 15m 30s",
  "violations_penalty": integer penalty,
  "grade_letter": "A|B|C|D|F",
  "feedback_summary": "Overall performance feedback",
  "graded_questions": {
    "question_id": {
      "earned_marks": integer,
      "max_marks": integer,
      "user_answer": "string",
      "model_answer": "string",
      "feedback": "string"
    }
  }
}`;

  return generateJson<any>(prompt, "You are Sharda, an exam grading evaluator.");
}

export async function generateCustomNotes(
  text: string,
  concepts: Concept[],
  config: { style: string; detail_level?: string; focus_topics?: string[] }
): Promise<NotesData> {
  const prompt = `Generate structured, beautiful AI Study Notes from this material:
STYLE: ${config.style}
DETAIL LEVEL: ${config.detail_level || "standard"}
FOCUS TOPICS: ${(config.focus_topics || []).join(", ") || "All concepts"}

STUDY MATERIAL:
${text.slice(0, 10000)}

Return JSON:
{
  "style": "${config.style}",
  "markdown_content": "# Beautiful Markdown Notes with headers, tables, callouts, and key formulas",
  "word_count": 500,
  "key_formulas_terms": ["Term 1", "Formula 2"]
}`;

  return generateJson<NotesData>(
    prompt,
    "You are Sharda, a master note-taking expert."
  );
}
