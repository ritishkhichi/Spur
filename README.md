# Spur AI Live Chat Agent

Take-home submission for **Spur — Founding Full-Stack Engineer**.

A mini customer support chat widget where an AI agent answers questions about a fictional store (**Spur Boutique**) using the **Google Gemini API**. Messages are persisted in **SQLite** on the backend; the UI starts fresh on each page load so visitors do not see each other's chats.

---

## How to run it locally

### Prerequisites

- **Node.js 20+**
- **Gemini API key** from [Google AI Studio](https://aistudio.google.com/apikey)

### Step 1 — Backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set your key:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
PORT=3001
```

Then install and start:

```bash
npm install
npm run dev
```

Server runs at **http://localhost:3001**. On first start:

- SQLite database is created at `backend/data/chat.db`
- Drizzle migrations run automatically (no manual migration step)

### Step 2 — Frontend

In a **second terminal**:

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/chat` and `/health` to the backend in development.

### Step 3 — Try it

Ask questions such as:

- "What's your return policy?"
- "How long does shipping take?"
- "What are your support hours?"

### Step 4 — Run tests (optional)

```bash
cd backend
npm test
```

Uses in-memory SQLite and a **mocked Gemini API** — no real API key required for tests.

### Environment variables

| Variable | Where | Required | Default | Description |
|----------|-------|----------|---------|-------------|
| `GEMINI_API_KEY` | `backend/.env` | Yes | — | Google Gemini API key (server-side only) |
| `GEMINI_MODEL` | `backend/.env` | No | `gemini-2.5-flash` | Gemini model name |
| `PORT` | `backend/.env` | No | `3001` | Backend port |
| `VITE_API_URL` | Vercel/Netlify | No | `""` | Production backend URL for the frontend |

> **Never** commit `backend/.env` or put `GEMINI_API_KEY` in frontend env vars.

---

## What was built (requirements checklist)

### Chat UI (frontend)

| Requirement | Implementation |
|-------------|----------------|
| Scrollable message list | `MessageList` with `overflow-y: auto` |
| Clear user vs AI distinction | User bubbles (right, gradient); AI bubbles (left, white + avatar) |
| Input + send button | `ChatInput` with send icon |
| Enter to send | Enter sends; Shift+Enter for newline |
| Auto-scroll to latest message | `scrollIntoView` on new messages |
| Disable send while loading | Input and button disabled during API call |
| Typing / streaming indicator | Typing dots before first token; live streaming with cursor |

**Stack:** React + Vite + TypeScript

### Backend API

| Requirement | Implementation |
|-------------|----------------|
| TypeScript server | Express + TypeScript |
| `POST /chat/message` | `{ message, sessionId? }` → `{ reply, sessionId }` |
| Persist all messages | User + AI messages saved to SQLite |
| Session / conversation | UUID `sessionId`; new conversation if none provided |
| Real LLM integration | Google Gemini via `@google/genai` |

**Extra:** `POST /chat/message/stream` — SSE streaming for token-by-token replies (used by the UI).

**Stack:** Node.js + Express + TypeScript + SQLite + Drizzle ORM

### LLM integration

| Requirement | Implementation |
|-------------|----------------|
| Real provider | Google Gemini (`gemini-2.5-flash`) |
| API key in env vars | `GEMINI_API_KEY` in `backend/.env` only |
| Encapsulated service | `generateReply()` and `streamReply()` in `llm.service.ts` |
| System prompt | Support agent persona in `storeKnowledge.ts` |
| Conversation history | Last 20 messages sent as context |
| Error handling | Invalid key, quota, timeout, safety → friendly UI errors |
| Token cap | `maxOutputTokens: 512` |

### FAQ / domain knowledge

Hardcoded in `backend/src/config/storeKnowledge.ts` and injected as Gemini `systemInstruction`:

- **Shipping** — free over $50; 3–5 days domestic; 7–14 days international
- **Returns** — 30-day window; unused/unworn; refund in 5–7 business days
- **Support hours** — Mon–Fri 9am–6pm EST; Sat 10am–2pm EST; closed Sun

### Data model & persistence

**`conversations`**

| Field | Type |
|-------|------|
| `id` | UUID (used as `sessionId`) |
| `createdAt` | timestamp |
| `metadata` | optional JSON text |

**`messages`**

| Field | Type |
|-------|------|
| `id` | UUID |
| `conversationId` | FK → conversations |
| `sender` | `"user"` \| `"ai"` |
| `text` | string |
| `timestamp` | timestamp |

**History API:** `GET /chat/history/:sessionId` returns all messages for a conversation (available for admin/debug; the public UI does **not** reload old chats on page load).

### Robustness

| Requirement | Implementation |
|-------------|----------------|
| Reject empty messages | Client + server (`400`) |
| Long messages | Rejected over 4000 chars with clear error |
| Stable on bad input | Central `errorHandler`; no unhandled crashes |
| LLM failures in UI | Inline error banner, not alerts |
| No secrets in repo | `.env` gitignored; `.env.example` only |

### Tests

- **9 tests** — Vitest + Supertest
- Unit tests for `validateMessage`
- Integration tests for chat routes, history, and SSE streaming (Gemini mocked)

```bash
cd backend && npm test
```

---

## Architecture overview

```
spur/
├── backend/
│   ├── src/
│   │   ├── app.ts                 # Express app factory (used by tests)
│   │   ├── index.ts               # Server entry
│   │   ├── config/
│   │   │   ├── env.ts             # Zod-validated env
│   │   │   └── storeKnowledge.ts  # FAQ + system prompt
│   │   ├── db/
│   │   │   ├── schema.ts          # Drizzle tables
│   │   │   └── index.ts           # SQLite + migrations
│   │   ├── routes/
│   │   │   └── chat.routes.ts     # HTTP handlers
│   │   ├── services/
│   │   │   ├── chat.service.ts    # Validation, persistence, orchestration
│   │   │   └── llm.service.ts     # Gemini calls (sync + stream)
│   │   ├── middleware/
│   │   │   └── errorHandler.ts
│   │   └── __tests__/             # Vitest suites
│   └── drizzle/                   # SQL migrations
│
└── frontend/
    └── src/
        ├── api/chat.ts            # fetch + SSE parser
        ├── hooks/useChat.ts       # Chat state (in-memory session)
        └── components/            # ChatWidget, MessageList, etc.
```

### Request flow

```
User types message
  → POST /chat/message/stream (SSE)
  → Validate input
  → Create/find conversation in SQLite
  → Save user message
  → Load last 20 messages
  → Stream Gemini reply (systemInstruction + history)
  → Save AI message
  → Stream chunks to UI
```

### Design decisions

1. **Layered backend** — routes → services → db; LLM isolated for easy provider swaps or future channels (WhatsApp, etc.)
2. **SQLite + Drizzle** — zero local setup; schema matches the spec
3. **In-memory session on frontend** — multi-turn works within one visit; each new page load shows a clean UI; backend still stores all conversations
4. **SSE streaming** — better UX than waiting for full response
5. **`@google/genai`** — supports newer `AQ.` API keys from Google AI Studio

---

## LLM notes

- **Provider:** [Google Gemini](https://ai.google.dev/) via `@google/genai`
- **Model:** `gemini-2.5-flash` (override with `GEMINI_MODEL`)
- **Prompting:**
  - Persona + store policies in `systemInstruction` (`storeKnowledge.ts`)
  - Prior messages mapped to Gemini roles: `user` → `"user"`, `ai` → `"model"`
  - Current user message appended last
- **Limits:** 20-message history window; 512 max output tokens; 15s timeout on non-streaming path
- **Errors:** Mapped to user-friendly messages (invalid key, quota, safety blocks)

---

## Deployment

### Backend — Render

1. New **Web Service** → connect repo → root directory: `backend`
2. Build: `npm install && npm run build`
3. Start: `npm start`
4. Env: `GEMINI_API_KEY`, optional `GEMINI_MODEL`

### Frontend — Vercel or Netlify

1. Root directory: `frontend`
2. Build: `npm run build`
3. Output: `dist`
4. Env: `VITE_API_URL=https://your-backend.onrender.com`

> Render free tier may reset SQLite on redeploy. For durable production data, consider Turso or PostgreSQL.

---

## Trade-offs & if I had more time

**Implemented beyond minimum spec**

- SSE streaming responses with live token rendering
- Automated tests (validation + API + mocked Gemini)
- Polished chat UI with suggestion chips and mobile layout

**Intentional choices**

- **React instead of Svelte** — allowed by the brief; faster delivery with familiar tooling
- **Fresh UI per page load** — avoids shared-browser leakage; history API kept on backend for future admin use
- **SQLite on Render** — simple for demo; not ideal for production persistence

**If I had more time**

- PostgreSQL / Turso for durable hosted persistence
- Rate limiting per IP on `/chat/message`
- Admin view to browse stored conversations
- Redis cache for repeated FAQ lookups
- Structured logging and request tracing
- E2E tests with Playwright

---

## API reference

### `POST /chat/message`

```json
{ "message": "What's your return policy?", "sessionId": "optional-uuid" }
```

Response: `{ "reply": "...", "sessionId": "uuid" }`

### `POST /chat/message/stream`

Same body. Returns **Server-Sent Events**:

| Event | Payload |
|-------|---------|
| `session` | `{ "sessionId": "..." }` |
| `chunk` | `{ "text": "..." }` |
| `done` | `{ "reply": "...", "sessionId": "..." }` |
| `error` | `{ "error": "...", "statusCode": 502 }` |

### `GET /chat/history/:sessionId`

Response: `{ "sessionId": "...", "messages": [...] }` — `404` if not found.

### `GET /health`

Response: `{ "status": "ok" }`
