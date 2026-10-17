# Medivise — Setup & Deployment

Three pieces: a **Convex** backend (`convex/`), a **React** frontend (`frontend/`) and an optional
**Python** inference service (`ml/`). Login is Firebase Auth; Convex verifies the Firebase ID token.

> **Status of these steps.** Verified by running them: the Convex functions (typecheck + 16
> `convex-test` tests, including auth and per-user isolation), the Python service (6 pytest tests,
> plus training and serving the Keras model), and the frontend typecheck, build and a browser load.
> **Not** verified, because they need your accounts: `npx convex dev`/`deploy` against a real
> Convex project, a real Firebase sign-in being accepted by Convex, and a Vercel deploy. If one
> of those fails, see [Troubleshooting](#troubleshooting).

## Prerequisites

- Node.js 18+ (tested on 22) and npm
- Python 3.9+ (only for `ml/`)
- A free Convex account — <https://dashboard.convex.dev>
- The Firebase project in `frontend/src/config/firebase.ts` (`medivise-45810`) with
  **Email/Password** sign-in enabled (Firebase console → Authentication → Sign-in method)

No global installs are needed: the Convex CLI comes from the repo's `package.json`.

## 1. Convex backend (development deployment)

Run from the **repository root**:

```bash
npm install

# First run opens the browser to log in, then creates a project (name it "medivise") and a
# *development* deployment. It writes CONVEX_DEPLOYMENT and CONVEX_URL to .env.local, pushes
# convex/ and keeps watching. Press Ctrl+C to stop; use `npx convex dev --once` to push once.
npx convex dev

# In a second terminal: load the medical knowledge base (84 diseases, 162 symptoms, 131 medicines)
npm run seed
```

`npm run seed` should print `seeded: true` and `skippedLinks: []`. It refuses to run twice;
to reload use `npx convex run functions/seed:seedDatabase '{"reset": true}'` (patients,
consultations and predictions are never touched).

Copy the URL from `.env.local` (`CONVEX_URL=https://<name>.convex.cloud`).

> Not valid, although earlier versions of these docs said so: `npx convex init` does not exist,
> and `npx convex deploy` targets **production** — use `npx convex dev` first.

## 2. Frontend

```bash
cd frontend
cp .env.example .env        # then set VITE_CONVEX_URL to the URL from step 1
npm install
npm run dev                 # http://localhost:5173
```

Create an account on the Sign-up page, sign in, and open **Health Prediction**.
Without `VITE_CONVEX_URL` the app still loads, but patients and predictions show errors.

## 3. ML service (optional)

The app works without it: when `ML_SERVICE_URL` is unset, unreachable or returns nothing
recognisable, Convex uses its built-in scorer. The response says which one answered
(`source: "ml-service" | "knowledge-base"`).

```bash
cd ml
python3 -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python serve.py                                        # http://127.0.0.1:8000
```

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/predict -H "Content-Type: application/json" \
  -d '{"symptoms":["fever","cough"],"age":45,"gender":"Male"}'
```

The service reads `ml/knowledge.json`, which is generated from the Convex seed data. If you edit
`convex/data/*`, run `npm run export:ml` from the root and commit the result (CI checks this).

### Connecting it to Convex

A cloud Convex deployment **cannot reach `http://localhost:8000`** on your computer. Either:

- leave `ML_SERVICE_URL` unset (the built-in scorer is used), or
- deploy `ml/` somewhere public (Render, Railway, Fly.io, ...; start command
  `uvicorn serve:app --host 0.0.0.0 --port $PORT`) and run
  `npx convex env set ML_SERVICE_URL https://your-ml-service.example.com`, or
- for a quick test, expose your local service with a tunnel (cloudflared/ngrok) and use that URL.

The service has no authentication and receives symptoms, age and gender only (no names or ids).
Add a shared secret before exposing it beyond a demo.

### Training the Keras model (optional)

```bash
cd ml
pip install -r requirements-train.txt     # installs TensorFlow (large)
python train.py                           # writes ml/model/disease_model.keras
python serve.py                           # /health now reports "model": "keras"
```

`serve.py` loads the trained model automatically when it matches `knowledge.json`.
**The training data is synthetic**, generated from the same hand-written weights, so the printed
accuracy (about 0.83 here) only shows the network re-learning those weights. It is not a clinical
metric.

## 4. Production

```bash
# Convex production deployment (asks for confirmation)
npx convex deploy
npx convex run --prod functions/seed:seedDatabase
npx convex env set --prod ML_SERVICE_URL https://...      # only if you run the ML service

# Frontend (from the repo root; vercel.json builds ./frontend)
npm install -g vercel
vercel --prod
```

In the Vercel project settings set `VITE_CONVEX_URL` to the **production** Convex URL
(Convex dashboard → your project → Production → Settings) and redeploy. Then add your Vercel domain in
Firebase console → Authentication → Settings → **Authorized domains**, otherwise sign-in fails
with `auth/unauthorized-domain`.

### Making an administrator

Self-registration can never create an administrator. In the Convex dashboard open
**Data → users**, and change the user's `role` to `admin`. Only administrators can edit the
knowledge base through the `diseases:create*` / `link*` mutations.

## Verification checklist

| Step | How to verify |
|------|---------------|
| Backend tests | `npm test` → 16 tests pass; `npm run typecheck` → no output |
| Convex pushed | `npx convex dev --once` completes without errors |
| Seeded | `npm run seed` → `seeded: true`, `skippedLinks: []` |
| ML service | `curl localhost:8000/health` → `{"status":"ok",...}`; `cd ml && pytest` |
| Frontend | `cd frontend && npm run build` succeeds |
| Sign-in reaches Convex | After login, the browser console has no “Backend sign-in failed” |
| Prediction | Health Prediction → enter `fever`, `cough` → disease, scores and medicines appear |
| Patients | Consultation → name + Stop saves `P-001`; Patients page lists it |

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Console: “The backend rejected the sign-in token” | `convex/auth.config.ts` must match your Firebase project id (`FIREBASE_PROJECT_ID`, default `medivise-45810`). Re-push with `npx convex dev --once`. |
| “Unauthenticated” / “User profile not found” | Sign out and in again; the profile is created at login. |
| Patients page is empty | Open the browser console; errors are logged there. Usually `VITE_CONVEX_URL` is unset or points at a different deployment than the one you seeded. |
| “None of the entered symptoms were recognised” | Use standard terms (see the chips on the Prediction page). Unrecognised symptoms are listed in the result. |
| `seeded: false` | Already seeded; pass `'{"reset": true}'` to reload. |
| `pip` fails building numpy | Use the repo's `requirements.txt` (ranges). The old `numpy==1.24.0` pin cannot build on Python 3.12+. |
| Prediction always `knowledge-base` | `ML_SERVICE_URL` unset or unreachable from Convex (see “Connecting it to Convex”); check `npx convex logs`. |

## Known limitations (read before any real use)

- **Not clinically validated.** The disease/symptom weights and medicine confidences are
  demonstration data. 15 of the 84 diseases have no symptom links and can never be predicted;
  80 medicines have a name only (no dosage or contraindications). A clinician must review them.
- Scores are a symptom-overlap measure, **not probabilities**, and favour diseases with few listed
  symptoms (for example “chest pain + shortness of breath” ranks Hyperlipidemia above Coronary
  Artery Disease in the built-in scorer). Age and gender are accepted but not used.
- The dashboard figures and the “AI Review” text on the consultation page are still static.
- `backend/` (the old Express + MongoDB server) is no longer used by the frontend and can be deleted.
- Patient data is stored in Convex: before real patients, review your privacy/compliance
  obligations (e.g. HIPAA/GDPR), access logging and data-residency requirements.
