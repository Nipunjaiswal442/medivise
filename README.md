# Medivise — Clinical Decision Support & Doctor's Assistant

Patient records, an appointments schedule, a consultation tool, a fast symptom-based differential,
and an AI assistant that answers from your own patient records and uploaded files (RAG).

> **Decision support only.** The knowledge base, drug-safety tables and sample patients are
> demonstration data that have not been clinically validated. Nothing here is a diagnosis; a
> clinician must verify every suggestion. The 20 sample patients are fictional.

## Stack

- **Frontend**: React 18 + TypeScript + Vite (`frontend/`)
- **Backend**: [Convex](https://convex.dev): database, functions, file storage, full-text search (`convex/`)
- **Auth**: [Convex Auth](https://labs.convex.dev/auth) (email + password; optional reset codes by email)
- **AI assistant**: Vercel Functions (`api/`, `server/`) calling the Claude API with your
  `ANTHROPIC_API_KEY`. The key stays on the server and is never sent to the browser.
- **Inference service** (optional): Python FastAPI, with an optional Keras model (`ml/`)

## Features

- **Appointments**: day and week views, booking with overlap detection, check-in / no-show /
  cancel / reschedule, "Start consultation" from a booking, and an **AI brief** per visit
  (history, open problems, what to check today) plus an AI **day summary**.
- **AI assistant** (chat): searches every patient record, consultation and uploaded document,
  runs the prediction model, checks medicines against allergies, interactions, pregnancy and
  kidney function, and lists appointments. Answers cite the patient and source. Attach PDFs,
  Word documents, text files or images in the chat; they are indexed for retrieval (scanned PDFs
  and images are transcribed by the model).
- **Health prediction**: ranked differential computed in-process (about 0.1 ms per prediction
  on a dev machine), using age and sex, symptom
  synonyms and typos, negation ("no fever") and red-flag rules; suggests what else to ask.
- **Patients**: full records (allergies, medications, vitals, labs, visits, immunizations,
  history, documents) with medication-safety warnings.
- **Consultation**: timer, live differential as you type, prescription safety check, AI review,
  saved to the patient's history and the appointment.
- **Dashboard**: today's schedule, abnormal results, upcoming visits.
- **Sample data**: "Load sample patients" creates or updates 20 detailed patients and a week of
  appointments for the signed-in clinician.

## Quick start (local)

Full guide with production steps and troubleshooting: **[DEPLOYMENT.md](DEPLOYMENT.md)**.

```bash
# 1. Backend (repo root). Logs in to Convex and creates a dev deployment on first run.
npm install
npx convex dev                       # leave running; in another terminal:
npx @convex-dev/auth                 # one-time: sets JWT_PRIVATE_KEY, JWKS and SITE_URL
npm run seed                         # load the medical knowledge base

# 2. AI assistant API (optional; needs an Anthropic API key)
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env
npm run dev:api                      # http://localhost:3001, reads CONVEX_URL from .env.local

# 3. Frontend
cd frontend
cp .env.example .env                 # set VITE_CONVEX_URL to CONVEX_URL from ../.env.local
npm install
npm run dev                          # http://localhost:5173 (proxies /api to :3001)
```

Create an account on the Sign-up page, then use **Load sample patients** (Dashboard,
Appointments, Patients or Settings). There are no demo credentials.

## Activating the AI assistant on Vercel

Vercel → your project → **Settings → Environment Variables** → add `ANTHROPIC_API_KEY`
(Production and Preview) → **redeploy**. Settings → "AI Assistant" in the app shows whether it
is enabled. Optional: `ANTHROPIC_MODEL` (default `claude-opus-5-5`) and `ANTHROPIC_EFFORT`
(`low` | `medium` | `high` | `xhigh` | `max`, default `medium`). Details in DEPLOYMENT.md.

## Tests

```bash
npm test                  # Convex functions + assistant API end to end (mocked Claude/Convex)
npm run typecheck         # Convex and API TypeScript
cd frontend && npm run build
cd ml && pip install -r requirements-dev.txt && pytest
```

## Project structure

```
api/            Vercel Functions: /api/chat (streaming assistant), /api/ingest, /api/status
server/         Assistant implementation: agent loop, tools, prompts, Convex client
convex/         Convex backend: schema, auth, functions, predictor, sample data, tests
frontend/       React + TypeScript app
ml/             Optional Python inference service, knowledge.json, training script
scripts/        dev-api.ts (local /api server), vercel-build.mjs, export-knowledge.ts, gen-convex-api.mjs
DEPLOYMENT.md   Setup, production and troubleshooting
```

## License

MIT
