# micro-projt — Enterprise Search Assistant

Full-stack RAG assistant: ask questions over company PDFs, get answers with sources.

## Structure

- `enterprise-search/backend` — FastAPI + RAG backend (SQLite metadata, FAISS vectors, Groq LLM).
- `enterprise-search/frontend` — Atlas, the React (Vite + TS) frontend. Replaces the old UI.

## Run the backend

    cd enterprise-search/backend
    .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000

Endpoints: `POST /api/ask`, `GET /api/documents`, `GET /api/health`, `POST /api/upload`, `DELETE /api/documents/{id}`.

## Run the frontend

    cd enterprise-search/frontend
    npm install
    npm run dev        # http://localhost:5173

### Mock vs. real backend

Copy `.env.example` to `.env` and set:

- `VITE_USE_MOCK=false` to call the real backend, `true` (default) for demo mode.
- `VITE_API_BASE_URL=http://localhost:8000/api`.

All API calls go through `src/services/apiService.ts`. UI components never call axios directly.
Chat responses are normalized so backend JSON (`{message, actions}` or `{answer, source, chunks}`) is
always rendered as clean text + action buttons — raw JSON is never shown.

## Checks

    cd enterprise-search/frontend
    npm run typecheck && npm run lint && npm run build
