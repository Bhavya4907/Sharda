# Sharda ✨

### AI-powered active learning from your own study material.

**Sharda** transforms PDFs and study notes into an interactive learning environment designed around **active recall, spaced repetition, self-explanation, and assessment**.

Instead of simply asking an AI questions about your notes, Sharda turns the material into a complete study workflow:

**Upload → Understand → Practice → Recall → Explain → Test → Track mastery**

---

## 🚀 What Sharda Does

Upload a PDF or paste your study material, and Sharda builds a personalized study workspace around it.

### 🧠 Knowledge Graph

Automatically extracts important concepts and their relationships from your material and visualizes them as an interactive knowledge graph.

This helps you understand **how ideas connect**, rather than studying isolated facts.

### 🃏 Spaced-Repetition Flashcards

Automatically generates flashcards from your material and schedules reviews using the **SM-2 spaced-repetition algorithm**.

Rate cards as:

* Again
* Hard
* Good
* Easy

Your review schedule and topic mastery update as you study.

### ❓ Adaptive Quiz Mode

Generates a mixture of:

* Multiple-choice questions
* Short-answer questions
* Explanations and feedback

Short answers are evaluated by AI, allowing the system to assess understanding rather than only exact matches.

### 💬 Socratic Tutor

Instead of immediately giving you the answer, Sharda can guide you through a problem using **Socratic questioning**.

The goal is to make you reason your way toward the answer.

### 🔬 Feynman Mode

Pick a concept and explain it in your own words.

Sharda evaluates your explanation and identifies weaknesses in your understanding.

This turns **"I think I understand it"** into an actual test of whether you can explain it.

### 📊 Mastery Tracking

Sharda tracks understanding across individual concepts and identifies **weak topics** that need additional attention.

Mastery is updated based on performance across quizzes, flashcards, and exams.

### 📝 AI Notes Generator

Generate different versions of your study material, including:

* Short notes
* Long-form notes
* Outlines
* Glossaries

### 📝 Timed Revision Exams

Generate custom exams from your material with configurable:

* Total marks
* Duration
* MCQs
* Short-answer questions
* Long-answer questions
* Selected topics

Exams are automatically graded and feed back into your mastery tracking.

---

## 🎯 Why Sharda?

Most AI study tools stop at:

> **"Ask questions about your notes."**

Sharda is built around a different idea:

> **AI should help you learn, not just give you answers.**

The system combines multiple learning techniques into one workflow:

| Learning Principle      | Sharda Feature       |
| ----------------------- | -------------------- |
| Active recall           | Flashcards & quizzes |
| Spaced repetition       | SM-2 scheduling      |
| Retrieval practice      | Quizzes & exams      |
| Self-explanation        | Feynman Mode         |
| Guided reasoning        | Socratic Tutor       |
| Conceptual organization | Knowledge Graph      |
| Feedback                | AI grading           |
| Metacognition           | Mastery Tracking     |

---

## 🏗️ Architecture

```text
                    ┌─────────────────────┐
                    │       Student       │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Next.js Frontend  │
                    │                     │
                    │ • Study Dashboard   │
                    │ • Knowledge Graph   │
                    │ • Flashcards        │
                    │ • Quiz              │
                    │ • Socratic Tutor    │
                    │ • Feynman Mode      │
                    │ • Mastery Tracker   │
                    │ • Exam Mode         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    FastAPI Backend  │
                    │                     │
                    │ • Session Management│
                    │ • PDF Processing    │
                    │ • Study Logic       │
                    │ • Grading           │
                    │ • Mastery Tracking  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │     Gemini API      │
                    │                     │
                    │ • Summaries         │
                    │ • Concepts          │
                    │ • Flashcards        │
                    │ • Quizzes           │
                    │ • Socratic Tutor    │
                    │ • Feynman Grading   │
                    │ • Exams             │
                    │ • Notes             │
                    └─────────────────────┘
```

---

## 🛠️ Tech Stack

### Frontend

* **Next.js**
* **React**
* **TypeScript**
* **Tailwind CSS**
* React Markdown

### Backend

* **Python**
* **FastAPI**
* **Pydantic**
* JSON-based session storage

### AI

* **Google Gemini API**
* Structured JSON generation for study content and assessments

### Document Processing

* PDF text extraction
* Client-side PDF fallback

---

## 📁 Project Structure

```text
Sharda/
├── backend/
│   ├── main.py
│   ├── models/
│   │   └── schemas.py
│   └── services/
│       ├── gemini_service.py
│       ├── pdf_parser.py
│       ├── spaced_repetition.py
│       └── storage.py
│
├── frontend/
│   ├── app/
│   │   ├── api/
│   │   ├── study/
│   │   └── page.tsx
│   ├── components/
│   │   ├── FlashcardDeck.tsx
│   │   ├── FeynmanMode.tsx
│   │   ├── KnowledgeGraph.tsx
│   │   ├── MasteryTracker.tsx
│   │   ├── NotesMaker.tsx
│   │   ├── QuizMode.tsx
│   │   ├── ReviseExamMode.tsx
│   │   └── SocraticChat.tsx
│   └── lib/
│
├── LICENSE
└── README.md
```

---

## ⚡ Getting Started

### Prerequisites

Make sure you have:

* Node.js
* Python 3.10+
* A Google Gemini API key

---

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/Sharda.git
cd Sharda
```

---

### 2. Configure the backend

```bash
cd backend

python -m venv venv
```

Activate the environment:

**Windows**

```bash
venv\Scripts\activate
```

**macOS/Linux**

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create your environment file:

```bash
cp .env.example .env
```

Add your Gemini API key:

```env
GEMINI_API_KEY=your_api_key_here
```

Start the backend:

```bash
python -m uvicorn main:app --reload
```

---

### 3. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## 🔑 Gemini API Key

Sharda uses the Google Gemini API for its AI-powered learning features.

Create an API key through Google AI Studio and add it to:

```text
backend/.env
```

```env
GEMINI_API_KEY=your_api_key_here
```

**Never commit your `.env` file or expose your API key publicly.**

---

## 🧪 How a Study Session Works

### 1. Upload

Upload a PDF or paste your notes.

### 2. Understand

Sharda generates:

* Summary
* TL;DR
* Key concepts
* Concept relationships

### 3. Practice

Use:

* Flashcards
* Quizzes
* Socratic Tutor
* Feynman Mode

### 4. Identify Weaknesses

Mastery tracking highlights topics where your performance is weaker.

### 5. Revise

Generate targeted notes and review cards.

### 6. Test Yourself

Generate a timed revision exam based on your selected topics and difficulty configuration.

### 7. Repeat

Use spaced repetition and updated mastery information to guide your next study session.

---

## 🔬 Learning Engine

Sharda isn't designed as a simple chatbot.

The underlying workflow combines several established learning strategies:

**Retrieval → Feedback → Explanation → Repetition → Assessment**

Each interaction can contribute information about what the student understands and where they struggle.

For example:

```text
Flashcard performance
        │
        ▼
Topic mastery ────────┐
                      │
Quiz performance ─────┤
                      ▼
                 Weak Topics
                      │
                      ▼
              Targeted Revision
                      │
                      ▼
                Revision Exam
                      │
                      ▼
              Updated Mastery
```

---

## 🔮 Future Improvements

Some directions for future development include:

* Persistent user accounts
* Cloud database instead of JSON session storage
* More sophisticated adaptive learning
* Better long-term learner profiles
* Import/export of flashcards
* Anki-compatible export
* More detailed learning analytics
* Multi-document study spaces
* Source citations for generated answers
* Mobile/PWA support
* More AI model providers

---

## 🤝 Contributing

Contributions, ideas, and feedback are welcome.

If you find a bug or have an idea for improving the learning experience, open an issue or submit a pull request.

---

## 📜 License

This project is licensed under the MIT License.

---

## ✨ Sharda

**Don't just ask AI for the answer. Use AI to learn how to find it.**
