from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum


class FlashcardRating(str, Enum):
    again = "again"
    hard = "hard"
    good = "good"
    easy = "easy"


class Flashcard(BaseModel):
    id: str
    question: str
    answer: str
    topic: str
    # SM-2 fields
    interval: int = 1          # days until next review
    repetitions: int = 0       # number of successful reviews
    ease_factor: float = 2.5   # difficulty multiplier
    due_date: Optional[str] = None  # ISO date string


class Concept(BaseModel):
    id: str
    name: str
    description: str
    related: list[str] = []    # IDs of related concepts (for knowledge graph)


class QuizQuestion(BaseModel):
    id: str
    type: str                  # "mcq" or "short_answer"
    question: str
    options: Optional[list[str]] = None   # MCQ only
    correct_answer: str
    topic: str
    explanation: str


class ChatMessage(BaseModel):
    role: str                  # "user" or "assistant"
    content: str


class SessionData(BaseModel):
    id: str
    filename: str
    raw_text: str
    summary: Optional[str] = None
    tldr: Optional[str] = None
    concepts: list[Concept] = []
    flashcards: list[Flashcard] = []
    quiz_questions: list[QuizQuestion] = []
    chat_history: list[ChatMessage] = []
    active_exam: Optional[ExamPaper] = None
    mastery: dict[str, float] = {}    # topic -> 0.0–1.0
    created_at: str


# Request/Response models
class UploadTextRequest(BaseModel):
    text: str
    filename: str = "pasted_notes.txt"


class ChatRequest(BaseModel):
    message: str


class FeynmanRequest(BaseModel):
    concept_id: str
    explanation: str


class QuizGradeRequest(BaseModel):
    answers: dict[str, str]    # question_id -> user_answer


class FlashcardRateRequest(BaseModel):
    rating: FlashcardRating


# Exam / Revision Mode Models
class ExamConfig(BaseModel):
    total_marks: int = 20
    duration_minutes: int = 15
    mcq_count: int = 5          # 1 mark each by default
    short_count: int = 3        # 3-5 marks each
    long_count: int = 1         # 5-10 marks each
    selected_topics: list[str] = []


class ExamQuestion(BaseModel):
    id: str
    type: str                  # "mcq", "short_answer", "long_answer"
    marks: int
    question: str
    options: Optional[list[str]] = None
    correct_answer: str
    topic: str
    rubric: str                # Grading guidelines


class ExamPaper(BaseModel):
    id: str
    title: str
    total_marks: int
    duration_minutes: int
    questions: list[ExamQuestion]


class ExamSubmissionRequest(BaseModel):
    answers: dict[str, str]       # question_id -> user_answer
    violations_count: int = 0

