"""
Sharda Backend — FastAPI application.
All routes for the AI-powered study companion.
"""
import uuid
from datetime import datetime, date
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from models.schemas import (
    SessionData, ChatMessage,
    ChatRequest, FeynmanRequest, QuizGradeRequest, FlashcardRateRequest,
    UploadTextRequest, ExamConfig, ExamSubmissionRequest, NotesRequest,
)
from services import pdf_parser, gemini_service, storage
from services.spaced_repetition import update_card, mastery_from_cards

app = FastAPI(title="Sharda API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ],
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Server error: {str(exc)}"},
    )


# ─── Upload ───────────────────────────────────────────────────────────────────

@app.post("/upload/pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """Upload a PDF file and create a new study session."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported")

    file_bytes = await file.read()
    if len(file_bytes) > 20 * 1024 * 1024:  # 20 MB limit
        raise HTTPException(400, "File too large (max 20 MB)")

    text = pdf_parser.parse_pdf(file_bytes)
    if len(text) < 100:
        raise HTTPException(422, "Could not extract enough text from this PDF")

    return _create_session(text, file.filename)


@app.post("/upload/text")
async def upload_text(body: UploadTextRequest):
    """Upload pasted text and create a new study session."""
    text = pdf_parser.parse_text(body.text)
    if len(text) < 100:
        raise HTTPException(422, "Text is too short (minimum 100 characters)")
    return _create_session(text, body.filename)


def _create_session(text: str, filename: str) -> dict:
    session_id = str(uuid.uuid4())
    session = SessionData(
        id=session_id,
        filename=filename,
        raw_text=text,
        created_at=datetime.utcnow().isoformat(),
    )
    storage.save_session(session)

    # Kick off AI analysis synchronously (fast enough for demo)
    try:
        summary, tldr, concepts = gemini_service.generate_summary(text)
    except ValueError as e:
        # Missing or invalid API key — surface a clean error to the frontend
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    session.summary = summary
    session.tldr = tldr
    session.concepts = concepts
    storage.save_session(session)

    return {
        "session_id": session_id,
        "filename": filename,
        "tldr": tldr,
        "concept_count": len(concepts),
    }


# ─── Session ──────────────────────────────────────────────────────────────────

@app.get("/session/{session_id}")
def get_session(session_id: str):
    session = _get_or_404(session_id)
    return session.model_dump(exclude={"raw_text", "chat_history"})


@app.get("/session/{session_id}/summary")
def get_summary(session_id: str):
    session = _get_or_404(session_id)
    return {
        "summary": session.summary,
        "tldr": session.tldr,
        "concepts": [c.model_dump() for c in session.concepts],
    }


# ─── Flashcards ───────────────────────────────────────────────────────────────

@app.get("/session/{session_id}/flashcards")
def get_flashcards(session_id: str):
    session = _get_or_404(session_id)

    # Generate if not yet created
    if not session.flashcards:
        session.flashcards = gemini_service.generate_flashcards(
            session.raw_text, session.concepts
        )
        storage.save_session(session)

    # Sort: due cards first
    today = date.today().isoformat()
    due = [c for c in session.flashcards if not c.due_date or c.due_date <= today]
    not_due = [c for c in session.flashcards if c.due_date and c.due_date > today]

    return {
        "due": [c.model_dump() for c in due],
        "not_due": [c.model_dump() for c in not_due],
        "mastery": session.mastery,
    }


@app.post("/session/{session_id}/flashcards/{card_id}/rate")
def rate_flashcard(session_id: str, card_id: str, body: FlashcardRateRequest):
    session = _get_or_404(session_id)

    card = next((c for c in session.flashcards if c.id == card_id), None)
    if not card:
        raise HTTPException(404, "Flashcard not found")

    updated = update_card(card, body.rating)
    session.flashcards = [
        updated if c.id == card_id else c for c in session.flashcards
    ]
    session.mastery = mastery_from_cards(session.flashcards)
    storage.save_session(session)

    return {"card": updated.model_dump(), "mastery": session.mastery}


# ─── Quiz ────────────────────────────────────────────────────────────────────

@app.get("/session/{session_id}/quiz")
def get_quiz(session_id: str):
    session = _get_or_404(session_id)

    if not session.quiz_questions:
        session.quiz_questions = gemini_service.generate_quiz(
            session.raw_text, session.concepts
        )
        storage.save_session(session)

    return {"questions": [q.model_dump() for q in session.quiz_questions]}


@app.post("/session/{session_id}/quiz/grade")
def grade_quiz(session_id: str, body: QuizGradeRequest):
    session = _get_or_404(session_id)

    if not session.quiz_questions:
        raise HTTPException(400, "No quiz generated yet — call GET /quiz first")

    results = gemini_service.grade_quiz(session.quiz_questions, body.answers)

    # Update mastery based on quiz performance
    for q_id, result in results.items():
        q = next((q for q in session.quiz_questions if q.id == q_id), None)
        if q:
            topic = q.topic
            score = result["score"]
            current = session.mastery.get(topic, 0.5)
            # Exponential moving average
            session.mastery[topic] = round(current * 0.6 + score * 0.4, 3)

    storage.save_session(session)
    return {"results": results, "mastery": session.mastery}


# ─── Socratic Chat ────────────────────────────────────────────────────────────

@app.post("/session/{session_id}/chat")
def chat(session_id: str, body: ChatRequest):
    session = _get_or_404(session_id)

    response = gemini_service.socratic_chat(
        session.raw_text,
        session.chat_history,
        body.message,
    )

    session.chat_history.append(ChatMessage(role="user", content=body.message))
    session.chat_history.append(ChatMessage(role="assistant", content=response))
    storage.save_session(session)

    return {"response": response}


@app.get("/session/{session_id}/chat/history")
def get_chat_history(session_id: str):
    session = _get_or_404(session_id)
    return {"history": [m.model_dump() for m in session.chat_history]}


# ─── Feynman Mode ────────────────────────────────────────────────────────────

@app.post("/session/{session_id}/feynman")
def feynman(session_id: str, body: FeynmanRequest):
    session = _get_or_404(session_id)

    concept = next((c for c in session.concepts if c.id == body.concept_id), None)
    if not concept:
        raise HTTPException(404, "Concept not found")

    result = gemini_service.grade_feynman(
        concept, session.raw_text, body.explanation
    )
    return result


# ─── Exam / Revision Mode ───────────────────────────────────────────────────

@app.post("/session/{session_id}/exam/generate")
def generate_exam(session_id: str, body: ExamConfig):
    session = _get_or_404(session_id)
    exam_paper = gemini_service.generate_exam_paper(
        session.raw_text, session.concepts, body
    )
    session.active_exam = exam_paper
    storage.save_session(session)
    return {"exam": exam_paper.model_dump()}


@app.get("/session/{session_id}/exam/active")
def get_active_exam(session_id: str):
    session = _get_or_404(session_id)
    if not session.active_exam:
        return {"exam": None}
    return {"exam": session.active_exam.model_dump()}


@app.post("/session/{session_id}/exam/grade")
def grade_exam(session_id: str, body: ExamSubmissionRequest):
    session = _get_or_404(session_id)
    if not session.active_exam:
        raise HTTPException(400, "No active exam paper found to grade")

    results = gemini_service.grade_exam_paper(
        session.active_exam.questions, body.answers, body.violations_count
    )

    # Update session mastery based on exam scores
    for q in session.active_exam.questions:
        q_result = results["graded_questions"].get(q.id)
        if q_result:
            earned = q_result["earned_marks"]
            max_m = q_result["max_marks"]
            score_ratio = (earned / max_m) if max_m > 0 else 0.0
            current = session.mastery.get(q.topic, 0.5)
            # Update mastery with a 50% weight on the formal exam result
            session.mastery[q.topic] = round(current * 0.5 + score_ratio * 0.5, 3)

    storage.save_session(session)
    return results


# ─── AI Notes Maker ──────────────────────────────────────────────────────────

@app.post("/session/{session_id}/notes")
def generate_notes(session_id: str, body: NotesRequest):
    session = _get_or_404(session_id)
    if not getattr(session, "generated_notes", None):
        session.generated_notes = {}
    notes_data = gemini_service.generate_custom_notes(
        session.raw_text, session.concepts, body
    )
    session.generated_notes[notes_data.style] = notes_data
    storage.save_session(session)
    return {"notes": notes_data.model_dump()}


@app.get("/session/{session_id}/notes")
def get_notes(session_id: str, style: str = "short"):
    session = _get_or_404(session_id)
    gen_notes = getattr(session, "generated_notes", {}) or {}
    notes = gen_notes.get(style)
    return {"notes": notes.model_dump() if notes else None}


# ─── Mastery ─────────────────────────────────────────────────────────────────

@app.get("/session/{session_id}/mastery")
def get_mastery(session_id: str):
    session = _get_or_404(session_id)

    # Annotate mastery with concept names
    enriched = {}
    for concept in session.concepts:
        score = session.mastery.get(concept.name, 0.0)
        enriched[concept.id] = {
            "name": concept.name,
            "score": score,
            "level": _mastery_level(score),
        }

    weak_topics = [v["name"] for v in enriched.values() if v["score"] < 0.4]
    return {"mastery": enriched, "weak_topics": weak_topics}


def _mastery_level(score: float) -> str:
    if score >= 0.75:
        return "strong"
    elif score >= 0.4:
        return "learning"
    else:
        return "weak"


# ─── Knowledge Graph ─────────────────────────────────────────────────────────

@app.get("/session/{session_id}/graph")
def get_knowledge_graph(session_id: str):
    """Return concept nodes and edges for the knowledge graph visualisation."""
    session = _get_or_404(session_id)

    nodes = [
        {
            "id": c.id,
            "label": c.name,
            "description": c.description,
            "mastery": session.mastery.get(c.name, 0.0),
        }
        for c in session.concepts
    ]

    edges = []
    seen = set()
    for c in session.concepts:
        for related_id in c.related:
            key = tuple(sorted([c.id, related_id]))
            if key not in seen:
                seen.add(key)
                edges.append({"source": c.id, "target": related_id})

    return {"nodes": nodes, "edges": edges}


# ─── Health ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": gemini_service.MODEL}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_or_404(session_id: str) -> SessionData:
    session = storage.load_session(session_id)
    if not session:
        raise HTTPException(404, f"Session '{session_id}' not found")
    return session
