# Medivise — Medical Decision Support Platform

A full-stack web application with a crimson-white medical theme, featuring AI-powered health prediction and medicine advice.

## Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Convex (serverless, replaces Express + MongoDB)
- **Auth**: Firebase Auth + Convex
- **ML Model**: Python FastAPI (rule-based, TensorFlow-ready)

## Quick Start

### 1. Convex Backend
```bash
# Install Convex CLI
npm install -g convex

# Login and initialize
npx convex login
npx convex init

# Deploy schema and functions
npx convex deploy

# Seed medical database (diseases, symptoms, medicines)
npx convex run functions/seed.seedDatabase
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env: set VITE_CONVEX_URL to your Convex deployment URL
npm run dev   # runs on http://localhost:5173
```

### 3. ML Service (for DL predictions)
```bash
cd ml
pip install -r requirements.txt
python serve.py   # runs on http://localhost:8000
```

## Features

- **Patient Management** — Create, view, and delete patient records with symptoms and prescriptions
- **Health Prediction** — Enter symptoms to get AI-powered disease prediction with confidence %
- **Medicine Advice** — Recommended medicines with confidence scores, dosage, frequency, and contraindications
- **AI Clinical Assistant** — Chat interface (LLM integration ready)
- **Medical News** — Latest updates from trusted sources
- **Consultation Tool** — Timer, symptom tracking, prescription entry, AI review

## Database Schema (Convex)

- `users` — Clinician profiles (linked to Firebase Auth)
- `patients` — Patient records with symptoms, prescriptions, AI reviews
- `consultations` — Consultation sessions linked to predictions
- `diseases` — 100+ common diseases
- `symptoms` — 120+ medical symptoms
- `diseaseSymptoms` — Weighted disease→symptom mappings
- `medicines` — 90+ medications with dosage/contraindications
- `diseaseMedicines` — Disease→medicine recommendations with confidence %
- `predictions` — Stored DL prediction results

## Project Structure

```
convex/         # Convex backend (schema, functions, seed data)
frontend/       # React + TypeScript frontend
ml/             # Python DL model service
DEPLOYMENT.md   # Full deployment guide
```

## Demo Credentials

Use Firebase Auth to create accounts. The backend creates user profiles in Convex on first login.

## License

MIT
