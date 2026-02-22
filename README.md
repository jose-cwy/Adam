# Adam (Node/Express + Neon + React)

Personal-use AI assistant app scaffold with:
- Express API backend
- Postgres on Neon (via `pg`)
- Chat + persistent conversations/messages
- Personal memory CRUD
- React chat frontend with browser voice input

## 1) Project Structure

- `server/` Express API + DB + AI integration
- `client/` React frontend (Vite)

## 2) Prerequisites

- Node.js 20+
- Neon Postgres database
- OpenAI API key (or compatible API key)

## 3) Setup

### Server

```bash
cd server
npm install
cp .env.example .env
# Fill DATABASE_URL and OPENAI_API_KEY
npm run db:migrate
npm run dev
```

### Client

```bash
cd client
npm install
cp .env.example .env
# Set VITE_API_BASE_URL=http://localhost:4000
npm run dev
```

## 4) Voice Recognition

- Voice input uses the browser Web Speech API.
- Click `Voice Input` in the chat composer, speak, then click `Stop Listening` (or wait for capture to end).
- If your browser blocks the microphone, allow mic permission for localhost.
- If unsupported, the app falls back to text-only input.

## 5) API Overview

- `GET /api/health`
- `GET /api/conversations`
- `POST /api/conversations`
- `GET /api/conversations/:id/messages`
- `POST /api/chat`
- `GET /api/memory`
- `POST /api/memory`
- `PATCH /api/memory/:id`
- `DELETE /api/memory/:id`

## 6) Notes

- Start simple, then add tools (calendar/email/files/web) and RAG over your docs.
- This scaffold uses direct prompt injection from memory records.
- Add authentication before any non-local deployment.
