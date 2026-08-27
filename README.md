# Sharda ✨
## AI-Powered Study Companion

> *Upload your notes. Let AI teach you back.*

Sharda transforms passive study material into **active learning experiences** using proven learning science — not just a chatbot wrapper.

---

## What makes it different from NotebookLM?

| Feature | NotebookLM | Sharda |
|---|---|---|
| Chat about content | ✅ | ✅ |
| Summary | ✅ | ✅ |
| **Knowledge Graph** | ❌ | ✅ |
| **Spaced Repetition (SM-2)** | ❌ | ✅ |
| **Socratic Tutor Mode** | ❌ | ✅ |
| **Feynman Technique Grader** | ❌ | ✅ |
| **Mastery Tracking** | ❌ | ✅ |
| **Custom Timed Exam Generator** | ❌ | ✅ |
| **AI Notes Maker (Short/Long)** | ❌ | ✅ |

---

## Features

- 📄 **Upload PDFs or paste text** — powered by `pymupdf4llm`
- 🧠 **AI Knowledge Graph** — interactive force-directed mind map of concepts
- 🃏 **Spaced Repetition Flashcards** — SM-2 algorithm (same as Anki)
- ❓ **Quiz Mode** — MCQ + AI-graded short answers
- 💬 **Socratic Tutor** — AI that asks YOU questions instead of just answering
- 🔬 **Feynman Mode** — explain a concept, AI grades your understanding
- 📊 **Mastery Tracker** — per-topic progress with weak area detection

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS |
| Backend | Python FastAPI |
| AI | Google Gemini 2.5 Flash |
| PDF Parsing | pymupdf4llm |
| Storage | JSON files (session-based) |

---

## Setup

### Backend

```bash
cd backend
pip install -r requirements.txt

# Create your .env file
cp .env.example .env
# Add your Gemini API key from https://aistudio.google.com

python -m uvicorn main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Getting a Gemini API Key (Free)

1. Go to [https://aistudio.google.com](https://aistudio.google.com)
2. Click **"Get API key"**
3. Create a key (no credit card needed)
4. Copy it into `backend/.env`

---

## Deployment

- **Frontend** → [Vercel](https://vercel.com) (free, connect GitHub repo)
- **Backend** → [Render](https://render.com) (free tier, Python support)

Set `NEXT_PUBLIC_API_URL` in Vercel to your Render backend URL.

---

Built for the **September AI Challenge 2** hackathon.
