# Medivise — Setup & Deployment

Four pieces:

| Piece | Where | Runs on |
|-------|-------|---------|
| Database, functions, auth, file storage, search | `convex/` | Convex |
| AI assistant API (`/api/chat`, `/api/ingest`, `/api/status`) | `api/`, `server/` | Vercel Functions (locally: `npm run dev:api`) |
| Web app | `frontend/` | Vercel (static) |
| Optional inference service | `ml/` | anywhere public (optional) |

> **Status of these steps.** Verified here by running them: Convex typecheck and 29
> `convex-test` tests (auth, per-clinician isolation, sample data, retrieval, appointments,
> documents, prediction, medication safety); 10 end-to-end tests of the assistant API against a
> scripted Claude endpoint and a convex-test backend; the frontend typecheck, production build
> and a browser walkthrough of every page; 6 pytest tests for `ml/`; a local `vercel build`
> (CLI 64.5.0) whose compiled `/api` functions were then run against the same mock services.
> **Not verified**, because they need your accounts: `npx convex dev`/`deploy` against a real
> Convex project, `npx @convex-dev/auth`, a real Claude API call with your key, and an actual
> Vercel deployment. If one of those fails, see [Troubleshooting](#troubleshooting).

## Prerequisites

- Node.js 20+ (tested on 22) and npm
- A free Convex account: <https://dashboard.convex.dev>
- For the AI assistant: an Anthropic API key (<https://console.anthropic.com>)
- Python 3.9+ only for `ml/`

## 1. Convex backend (development deployment)

From the **repository root**:

```bash
npm install

# First run logs in, creates a project and a *development* deployment, writes CONVEX_DEPLOYMENT
# and CONVEX_URL to .env.local, pushes convex/ and keeps watching. Ctrl+C stops it.
npx convex dev

# In a second terminal, once:
npx @convex-dev/auth     # Convex Auth keys: sets JWT_PRIVATE_KEY, JWKS and SITE_URL on the deployment
npm run seed             # medical knowledge base (84 diseases, 162 symptoms, 135 medicines)
```

`npm run seed` prints `seeded: true` and refuses to run twice; to reload the knowledge base use
`npx convex run functions/seed:seedDatabase '{"reset": true}'` (patients and appointments are
never touched). When `npx @convex-dev/auth` asks for the site URL, use `http://localhost:5173`.
If the CLI does not work for you, the manual steps are at <https://labs.convex.dev/auth/setup/manual>.

Optional Convex variables (`npx convex env set NAME value`):

| Variable | Purpose |
|----------|---------|
| `AUTH_RESEND_KEY` | Enables "Forgot password" (6-digit code by email through [Resend](https://resend.com)). Without it the page says email is not configured. |
| `AUTH_EMAIL_FROM` | Sender, e.g. `Medivise <no-reply@your-domain>` (default: Resend's test sender, which only delivers to your own address). |
| `ML_SERVICE_URL` | Optional Python service (section 4). |

## 2. AI assistant API (local)

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." >> .env    # repo root; .env is git-ignored
npm run dev:api                               # http://localhost:3001
```

`dev:api` reads `ANTHROPIC_API_KEY` and `CONVEX_URL` from the shell, `.env.local` (written by
`npx convex dev`) or `.env`. It prints whether the assistant is enabled. Without a key the rest of
the app works and the assistant pages explain how to activate it.

## 3. Frontend

```bash
cd frontend
cp .env.example .env        # set VITE_CONVEX_URL to CONVEX_URL from ../.env.local
npm install
npm run dev                 # http://localhost:5173 — /api is proxied to :3001
```

Sign up, then click **Load sample patients** (Dashboard, Appointments, Patients or Settings).
It creates 20 fictional patients with full records and a week of appointments (8 today) for
the signed-in clinician. Clicking it again updates the same records instead of duplicating
them; a patient you created earlier with the same name is completed rather than duplicated.

## 4. ML service (optional)

The app does not need it: the built-in predictor runs inside Convex. When `ML_SERVICE_URL` is
set and answers within 4 s, its ranking is used instead (the result says which one answered).

```bash
cd ml
python3 -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python serve.py                                        # http://127.0.0.1:8000
```

A cloud Convex deployment **cannot reach `http://localhost:8000`**. Deploy `ml/` somewhere public
(start command `uvicorn serve:app --host 0.0.0.0 --port $PORT`) and run
`npx convex env set ML_SERVICE_URL https://...`. The service has no authentication and receives
symptoms, age and sex only. `ml/knowledge.json` is generated from the Convex data: after editing
`convex/data/*`, run `npm run export:ml` and commit the result (CI checks this). `python train.py`
(with `requirements-train.txt`) trains an optional Keras model on **synthetic** data; its
accuracy is not a clinical metric.

## 5. Production (Vercel + Convex)

### Convex production deployment

```bash
npx convex deploy                                   # asks for confirmation
npx @convex-dev/auth --prod                         # auth keys for production; site URL = your Vercel URL
npx convex run --prod functions/seed:seedDatabase
```

### Vercel

Import the repository in Vercel (or run `vercel --prod` from the repo root). `vercel.json`
already configures the install and build commands, the `api/` functions and the SPA routing.
In **Project → Settings → Environment Variables** add:

| Variable | Required | Value |
|----------|----------|-------|
| `VITE_CONVEX_URL` | yes | Production Convex URL (`https://<name>.convex.cloud`; Convex dashboard → Production → Settings). Used by the web app at build time and by `/api` at runtime. |
| `ANTHROPIC_API_KEY` | for the assistant | Your Anthropic API key. Only the `/api` functions read it; it is never sent to the browser. |
| `ANTHROPIC_MODEL` | no | Default `claude-opus-5-5`. |
| `ANTHROPIC_EFFORT` | no | `low`, `medium` (default), `high`, `xhigh` or `max`: more effort is slower and costs more tokens. |
| `CONVEX_DEPLOY_KEY` | no | Production deploy key (Convex dashboard → Settings). When set, each Vercel build also deploys `convex/`. Keep `VITE_CONVEX_URL` (or `CONVEX_URL`) set as well: the `/api` functions need the URL at runtime. |

Apply them to **Production** (and **Preview** if you use previews), then **redeploy**: Vercel only
reads environment variables at build/deploy time. In the app, **Settings → AI Assistant** shows
whether the key is configured and warns when the server is missing the Convex URL. `/api/chat` can run for up to 120 s
(`vercel.json`), which needs fluid compute (enabled in `vercel.json`) or a plan that allows it.

### Making an administrator

Sign-up can never create an administrator. In the Convex dashboard open **Data → users** and
set the user's `role` to `admin`. Only administrators can edit the knowledge base through the
`diseases:create*` / `link*` mutations.

## How the assistant works

- The browser sends the question and its Convex auth token to `/api/chat`. The function calls
  Convex **as that clinician**, so it can only read that clinician's patients.
- Retrieval: each patient record is split into sections (summary, medications, labs, visits...),
  consultations and uploaded documents into chunks, and stored in a Convex full-text search
  index. The assistant gets a roster of all patients, pre-retrieved passages for the question,
  and tools: `search_records`, `get_patient_record`, `find_patients`, `list_appointments`,
  `predict_conditions` (the prediction model), `get_condition_info`, `check_medications`
  (allergies, interactions, pregnancy, eGFR) and `read_document`.
- Files: text, PDF and Word files are converted to text in the browser and indexed; images and
  scanned PDFs (up to 10 MB) are transcribed by the model through `/api/ingest`. Uploads are
  limited to 20 MB. Files can be attached to a patient or kept general.
- Answers stream back as they are generated and are saved in Convex as chat threads.
- Search is keyword-based (Convex full-text search), not vector embeddings: the assistant
  compensates by searching several phrasings, but very loosely worded questions can miss.

## Verification checklist

| Step | How to verify |
|------|---------------|
| Tests | `npm test` → 39 tests pass; `npm run typecheck` → no output |
| Convex pushed | `npx convex dev --once` completes without errors |
| Auth | Sign up, sign out, sign in again |
| Samples | Load sample patients → 20 patients, 8 appointments today |
| Prediction | Health Prediction → `fever`, `cough`, `sore throat` → ranked conditions, medicines |
| Assistant | Settings → AI Assistant shows "Enabled"; ask "Who is on warfarin and when was their last INR?" |
| Files | Attach a PDF in the assistant → it shows as indexed; ask about its content |

## Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Sign-up/sign-in fails with a JWT / key error | Run `npx @convex-dev/auth` (or `--prod`) for that deployment. |
| App shows "Backend not configured" | `VITE_CONVEX_URL` was not set when the frontend was built. Set it and rebuild/redeploy. |
| Assistant says it is not configured | `ANTHROPIC_API_KEY` missing in that Vercel environment, or not redeployed since adding it. |
| Assistant: "missing CONVEX_URL / VITE_CONVEX_URL" | Set `VITE_CONVEX_URL` (or `CONVEX_URL`) in Vercel and redeploy. |
| Assistant: 401 / "authentication" error from Anthropic | The key is wrong or revoked; replace it in Vercel and redeploy. |
| Assistant: "Your session has expired" | Sign out and in again. The `/api` URL must point at the same Convex deployment as the app. |
| Assistant locally: 404 or network error | `npm run dev:api` is not running (the Vite dev server proxies `/api` to port 3001). |
| "Forgot password" says email is not configured | Set `AUTH_RESEND_KEY` on the Convex deployment. |
| Prediction always says `knowledge-base` | Expected unless `ML_SERVICE_URL` is set and reachable from Convex. |

## Known limitations (read before any real use)

- **Not clinically validated.** Disease profiles, symptom weights, medicine suggestions and the
  drug-safety tables are demonstration data. The safety screen covers a small set of well-known
  allergy, interaction, pregnancy and kidney-function rules: **no warning does not mean safe**.
- Prediction probabilities are computed from hand-written profiles, not learned from patient
  data; they are a ranking aid, not calibrated risk estimates.
- The AI assistant can be wrong. It is instructed to cite records and say when information is
  missing, but its answers must be checked against the record.
- Patient data is stored in Convex and sent to the Claude API when the assistant is used. Before
  real patients, review your privacy and compliance obligations (e.g. HIPAA/GDPR: business
  associate agreements, access logging, data residency, retention).
- Facial recognition on the consultation page is a placeholder and does nothing.
