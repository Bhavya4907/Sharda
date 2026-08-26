"""
All Gemini API interactions for Prometheus.
Uses google-genai SDK with Gemini 2.5 Flash (free tier).
"""
import json
import os
import uuid
from google import genai
from google.genai import types
from dotenv import load_dotenv

from models.schemas import (
    Concept, Flashcard, QuizQuestion, ChatMessage
)

load_dotenv()

_client: genai.Client | None = None
MODEL = "gemini-3.5-flash-lite"


def _get_client() -> genai.Client:
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY is not set. "
                "Copy backend/.env.example to backend/.env and add your key from https://aistudio.google.com"
            )
        _client = genai.Client(api_key=api_key)
    return _client


def _generate(prompt: str, system: str = "") -> str:
    """Low-level text generation helper."""
    config = types.GenerateContentConfig(
        system_instruction=system if system else None,
        temperature=0.4,
    )
    response = _get_client().models.generate_content(
        model=MODEL,
        contents=prompt,
        config=config,
    )
    return response.text.strip()


def _json_generate(prompt: str, system: str = "") -> dict | list:
    """Generate and parse JSON output from Gemini."""
    config = types.GenerateContentConfig(
        system_instruction=system if system else None,
        temperature=0.3,
        response_mime_type="application/json",
    )
    response = _get_client().models.generate_content(
        model=MODEL,
        contents=prompt,
        config=config,
    )
    return json.loads(response.text.strip())


# ─── Summary & Concepts ──────────────────────────────────────────────────────

def generate_summary(text: str) -> tuple[str, str, list[Concept]]:
    """
    Returns (summary_markdown, tldr, concepts[]).
    Concepts include relationship data for the knowledge graph.
    """
    prompt = f"""Analyze the following study material and return a JSON object with these exact keys:
- "summary": A comprehensive markdown summary of the key points (use ## headings, bullet points)
- "tldr": A single sentence TL;DR (max 30 words)
- "concepts": An array of concept objects, each with:
  - "id": a short slug (e.g. "natural_selection")
  - "name": display name (e.g. "Natural Selection")
  - "description": 1-2 sentence explanation
  - "related": array of IDs of other concepts it connects to (for mind map)

Extract 6-12 key concepts. Make "related" connections meaningful — they drive the knowledge graph visualization.

STUDY MATERIAL:
---
{text[:12000]}
---
"""
    data = _json_generate(prompt)
    concepts = [
        Concept(
            id=c["id"],
            name=c["name"],
            description=c["description"],
            related=c.get("related", [])
        )
        for c in data.get("concepts", [])
    ]
    return data.get("summary", ""), data.get("tldr", ""), concepts


# ─── Flashcards ───────────────────────────────────────────────────────────────

def generate_flashcards(text: str, concepts: list[Concept]) -> list[Flashcard]:
    """Generate 15-20 flashcards tagged by topic/concept."""
    concept_names = ", ".join(c.name for c in concepts)
    prompt = f"""Create 15 high-quality flashcards from the study material below.
Return a JSON array. Each item must have:
- "question": clear, specific question
- "answer": concise, accurate answer (2-4 sentences max)
- "topic": one of these concept names: {concept_names}

Focus on testable facts, definitions, mechanisms, and cause-effect relationships.
Avoid trivial or overly broad questions.

STUDY MATERIAL:
---
{text[:12000]}
---
"""
    data = _json_generate(prompt)
    cards = []
    for item in data:
        cards.append(Flashcard(
            id=str(uuid.uuid4()),
            question=item["question"],
            answer=item["answer"],
            topic=item.get("topic", "General"),
        ))
    return cards


# ─── Quiz ────────────────────────────────────────────────────────────────────

def generate_quiz(text: str, concepts: list[Concept]) -> list[QuizQuestion]:
    """Generate a mix of MCQ and short-answer questions."""
    concept_names = ", ".join(c.name for c in concepts)
    prompt = f"""Create a quiz with exactly 6 multiple-choice questions and 3 short-answer questions from the study material.

Return a JSON array. Each item must have:
- "type": "mcq" or "short_answer"
- "question": the question text
- "options": (MCQ only) array of 4 option strings, labeled A) B) C) D)
- "correct_answer": for MCQ, the full correct option string; for short_answer, a model answer
- "topic": one of: {concept_names}
- "explanation": why this is correct (1-2 sentences)

Make questions genuinely challenging — test understanding, not just memorization.

STUDY MATERIAL:
---
{text[:12000]}
---
"""
    data = _json_generate(prompt)
    questions = []
    for item in data:
        questions.append(QuizQuestion(
            id=str(uuid.uuid4()),
            type=item["type"],
            question=item["question"],
            options=item.get("options"),
            correct_answer=item["correct_answer"],
            topic=item.get("topic", "General"),
            explanation=item.get("explanation", ""),
        ))
    return questions


def grade_quiz(
    questions: list[QuizQuestion],
    answers: dict[str, str]
) -> dict:
    """
    Grade MCQ instantly, use Gemini to grade short answers.
    Returns {question_id: {correct: bool, score: float, feedback: str}}.
    """
    results = {}

    short_answer_batch = []
    for q in questions:
        user_ans = answers.get(q.id, "")
        if q.type == "mcq":
            correct = user_ans.strip().lower() == q.correct_answer.strip().lower()
            results[q.id] = {
                "correct": correct,
                "score": 1.0 if correct else 0.0,
                "feedback": q.explanation if not correct else "Correct!",
                "correct_answer": q.correct_answer,
            }
        else:
            short_answer_batch.append({
                "id": q.id,
                "question": q.question,
                "model_answer": q.correct_answer,
                "user_answer": user_ans,
                "topic": q.topic,
            })

    if short_answer_batch:
        prompt = f"""Grade these short-answer responses. Return a JSON array.
Each item must have:
- "id": the question id (preserve exactly)
- "score": 0.0 to 1.0 (0=completely wrong, 0.5=partial, 1.0=correct)
- "feedback": 1-2 sentence constructive feedback explaining what was right/wrong/missing
- "correct": true if score >= 0.6

Questions to grade:
{json.dumps(short_answer_batch, indent=2)}
"""
        graded = _json_generate(prompt)
        for item in graded:
            q_obj = next((q for q in questions if q.id == item["id"]), None)
            results[item["id"]] = {
                "correct": item.get("correct", item["score"] >= 0.6),
                "score": item["score"],
                "feedback": item["feedback"],
                "correct_answer": q_obj.correct_answer if q_obj else "",
            }

    return results


# ─── Socratic Chat ────────────────────────────────────────────────────────────

SOCRATIC_SYSTEM = """You are Prometheus, a Socratic AI tutor. You have been given study material and your job is to help the student TRULY understand it — not just give them answers.

CORE RULES:
1. NEVER directly answer a question the student can figure out themselves. Instead, ask a guiding question that leads them toward the answer.
2. If the student gives a partial answer, acknowledge what's right and probe deeper with another question.
3. Only give a direct explanation if the student has tried at least twice and is clearly stuck.
4. Keep responses concise — 2-4 sentences max plus one question.
5. Be warm and encouraging, never condescending.
6. Occasionally test the student by asking THEM a question about the material.

You have deep knowledge of the study material provided."""


def socratic_chat(
    text: str,
    history: list[ChatMessage],
    user_message: str
) -> str:
    """Generate a Socratic tutoring response."""
    history_text = "\n".join(
        f"{m.role.upper()}: {m.content}" for m in history[-10:]
    )
    prompt = f"""STUDY MATERIAL (your knowledge base):
---
{text[:8000]}
---

CONVERSATION HISTORY:
{history_text}

USER: {user_message}

Respond as Prometheus the Socratic tutor."""

    return _generate(prompt, system=SOCRATIC_SYSTEM)


# ─── Feynman Mode ────────────────────────────────────────────────────────────

def grade_feynman(
    concept: Concept,
    study_text: str,
    user_explanation: str
) -> dict:
    """
    Grade a Feynman technique explanation.
    Returns {score, what_was_right, what_was_missing, what_was_wrong, improved_explanation}.
    """
    prompt = f"""A student is practicing the Feynman Technique by explaining a concept in simple terms.
Evaluate their explanation and return a JSON object with:
- "score": 0-100 (integer)
- "what_was_right": array of strings — what they got correct
- "what_was_missing": array of strings — important points they omitted  
- "what_was_wrong": array of strings — any misconceptions or errors
- "improved_explanation": a model explanation of the concept in simple language (as if explaining to a 12-year-old)
- "encouragement": one encouraging sentence personalized to their attempt

CONCEPT: {concept.name}
CONCEPT DESCRIPTION: {concept.description}

RELEVANT STUDY MATERIAL:
---
{study_text[:6000]}
---

STUDENT'S EXPLANATION:
"{user_explanation}"
"""
    return _json_generate(prompt)
