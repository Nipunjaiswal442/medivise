# Medivise — Medical Decision Support Platform

A full-stack web application with a crimson-white medical theme: patient records, a consultation
tool, symptom-based condition suggestions with medicine advice, and medical news.

> **Decision support only.** The knowledge base is demonstration data that has not been
> clinically validated. Nothing here is a diagnosis; a clinician must verify every suggestion.

## Stack

- **Frontend**: React 18 + TypeScript + Vite (`frontend/`)
- **Backend**: [Convex](https://convex.dev) — database, serverless functions, auth checks (`convex/`)
- **Auth**: Firebase Auth; Convex verifies the Firebase ID token (`convex/auth.config.ts`)
- **Inference service** (optional): Python FastAPI, with an optional Keras model (`ml/`)

## Quick start

Full guide with production steps and troubleshooting: **[DEPLOYMENT.md](DEPLOYMENT.md)**.

```bash
# 1. Backend (repo root). Logs in to Convex and creates a dev deployment on first run.
npm install
npx convex dev            # leave running; in another terminal:
npm run seed              # load the medical knowledge base

# 2. Frontend
cd frontend
cp .env.example .env      # set VITE_CONVEX_URL to the URL in ../.env.local
npm install
npm run dev               # http://localhost:5173

# 3. Optional inference service
cd ../ml
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python serve.py           # http://127.0.0.1:8000
```

Create an account on the Sign-up page; there are no demo credentials.

## Features

- **Patient management** — create, list and delete patient records (per clinician, enforced on the server)
- **Health prediction** — enter symptoms, get ranked conditions with symptom-match scores and
  recommended medicines; unrecognised symptoms are reported rather than ignored
- **Consultation tool** — timer, symptom and prescription entry, saves a patient record
- **Medical news** — curated links to trusted sources
- **AI Clinical Assistant** — UI only; not connected to a model yet

## Tests

```bash
npm test                  # Convex functions (convex-test), from the repo root
npm run typecheck         # Convex TypeScript
cd frontend && npm run build
cd ml && pip install -r requirements-dev.txt && pytest
```

## Project structure

```
convex/         Convex backend: schema, functions, seed data, tests
frontend/       React + TypeScript app
ml/             Python inference service, knowledge.json, training script
scripts/        export-knowledge.ts (regenerates ml/knowledge.json from the seed data)
backend/        Legacy Express + MongoDB server — unused, safe to delete
DEPLOYMENT.md   Setup, production and troubleshooting
```

## License

MIT
