# Recall

A self-learning AI assistant that builds a persistent memory of who you are across every conversation.

Most chatbots forget everything when you close the tab. Recall doesn't. It extracts meaningful facts from your conversations, stores them in a vector database, and uses them to give you increasingly personalized responses over time. The more you talk to it, the better it knows you.

## How it works

Recall uses a two-phase memory pipeline:

**Phase 1 — Extract and Store**
After each conversation exchange, the system analyzes the dialogue and extracts factual information about the user. These facts are categorized (Personal, Professional, Preference, Goal) and stored as vector embeddings in Qdrant Cloud. When a new fact contradicts an existing memory, the old one gets updated or replaced automatically.

**Phase 2 — Retrieve and Respond**
When the user sends a message, the system performs a semantic search against stored memories to find the most relevant context. Those memories are injected into the system prompt, allowing the AI to reference past conversations naturally without being told to. The result is a conversation that feels continuous across sessions.

The memory panel on the right side of the interface shows this process in real time. You can watch new memories appear as the AI learns about you, see what category each fact falls into, and delete anything you want forgotten.

## Tech stack

- **Backend**: Python, FastAPI, Mem0 (memory extraction and management), Qdrant Cloud (vector storage), Gemini 2.5 Flash (LLM)
- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, Server-Sent Events for streaming
- **Deployment**: Railway (backend), Vercel (frontend), Qdrant Cloud (vector DB)

## Local setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [Qdrant Cloud](https://cloud.qdrant.io/) account (free tier works)
- A [Google AI Studio](https://aistudio.google.com/) API key for Gemini

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a `.env` file in the backend directory:

```
GEMINI_API_KEY=your_gemini_api_key
QDRANT_URL=https://your-cluster.cloud.qdrant.io:6333
QDRANT_API_KEY=your_qdrant_api_key
FRONTEND_URL=http://localhost:3000
DEFAULT_USER_ID=default_user
```

Start the server:

```bash
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
```

Create a `.env.local` file:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start talking.

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/chat/stream` | Stream a chat response via SSE |
| GET | `/memories` | Get all stored memories |
| DELETE | `/memories/{id}` | Delete a specific memory |
| GET | `/memories/count` | Get total memory count |
| GET | `/health` | Health check with Qdrant status |
