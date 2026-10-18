import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { action, internalMutation, mutation, query } from "../_generated/server";
import { requireOwnPatient, requireUser } from "../lib/auth";
import { patientSafetyContext, screenMedications, type SafetyWarning } from "../lib/clinical";
import {
  diseaseInfo,
  knownSymptomNames,
  predict,
  type MedicineSuggestion,
  type PredictOutput,
} from "../lib/predictor";

const ML_TIMEOUT_MS = 4000;
const MAX_SYMPTOMS = 30;

const predictArgs = {
  symptoms: v.array(v.string()),
  age: v.optional(v.number()),
  gender: v.optional(v.string()),
  durationDays: v.optional(v.number()),
  patientId: v.optional(v.id("patients")),
};

export interface PredictionView extends PredictOutput {
  predictionId?: Id<"predictions">;
  source: "knowledge-base" | "ml-service";
  medicines: (MedicineSuggestion & { warnings: string[] })[];
  /** Allergy / interaction warnings against the patient's record (when a patient is given). */
  safetyWarnings: SafetyWarning[];
}

function validate(args: { symptoms: string[]; age?: number }) {
  const symptoms = args.symptoms.map((s) => s.trim()).filter(Boolean);
  if (symptoms.length > MAX_SYMPTOMS || symptoms.some((s) => s.length > 200)) {
    throw new ConvexError("Too many symptoms, or a symptom is too long");
  }
  if (args.age !== undefined && (!Number.isFinite(args.age) || args.age < 0 || args.age > 130)) {
    throw new ConvexError("Age must be between 0 and 130");
  }
  return symptoms;
}

/** Adds medication-safety screening for the patient (if any) to a raw prediction. */
function withSafety(output: PredictOutput, patient: Doc<"patients"> | null): Omit<PredictionView, "source"> {
  const allergies = patient?.allergies ?? [];
  const current = (patient?.medications ?? []).map((m) => m.name);
  const proposed = output.medicines.map((m) => m.name);
  const safetyWarnings = patient ? screenMedications({ current, proposed, allergies, context: patientSafetyContext(patient) }) : [];
  return {
    ...output,
    medicines: output.medicines.map((m) => ({
      ...m,
      warnings: safetyWarnings.filter((w) => w.drugs.includes(m.name)).map((w) => w.message),
    })),
    safetyWarnings,
  };
}

async function patientFor(ctx: QueryCtx, patientId: Id<"patients"> | undefined) {
  if (!patientId) return null;
  const user = await requireUser(ctx);
  return await requireOwnPatient(ctx, user, patientId);
}

/**
 * Live prediction for as-you-type results. Pure computation over the bundled knowledge base,
 * nothing is written; Convex caches the result per argument set.
 */
export const preview = query({
  args: predictArgs,
  handler: async (ctx, args): Promise<PredictionView> => {
    await requireUser(ctx);
    const symptoms = validate(args);
    const patient = await patientFor(ctx, args.patientId);
    const output = predict({
      symptoms,
      age: args.age ?? patient?.age,
      sex: args.gender ?? patient?.gender,
      durationDays: args.durationDays,
    });
    return { ...withSafety(output, patient), source: "knowledge-base" };
  },
});

/** Runs the built-in model and records the prediction - one round trip. */
export const predictHealth = mutation({
  args: predictArgs,
  handler: async (ctx, args): Promise<PredictionView> => {
    const user = await requireUser(ctx);
    const symptoms = validate(args);
    if (symptoms.length === 0) throw new ConvexError("Enter at least one symptom");
    const patient = args.patientId ? await requireOwnPatient(ctx, user, args.patientId) : null;
    const output = predict({
      symptoms,
      age: args.age ?? patient?.age,
      sex: args.gender ?? patient?.gender,
      durationDays: args.durationDays,
    });
    if (output.ranking.length === 0) {
      throw new ConvexError(
        output.matchedSymptoms.length === 0
          ? "None of the entered symptoms were recognised. Try standard terms such as “fever” or “sore throat”."
          : "No condition in the knowledge base matches these symptoms.",
      );
    }
    const view = { ...withSafety(output, patient), source: "knowledge-base" as const };
    const predictionId = await ctx.db.insert("predictions", recordFields(user._id, args, view));
    return { ...view, predictionId };
  },
});

function recordFields(
  userId: Id<"users">,
  args: { patientId?: Id<"patients">; age?: number; gender?: string; symptoms: string[] },
  view: Omit<PredictionView, "predictionId">,
) {
  const now = Date.now();
  return {
    patientId: args.patientId,
    userId,
    diseaseName: view.ranking[0].name,
    confidence: view.ranking[0].probability,
    symptoms: args.symptoms,
    unmatchedSymptoms: view.unmatchedSymptoms,
    ranking: view.ranking.map((r) => ({ name: r.name, probability: r.probability })),
    redFlags: view.redFlags.map((f) => f.title),
    age: args.age,
    sex: args.gender,
    source: view.source,
    createdAt: now,
    updatedAt: now,
  };
}

/** Whether the optional Python ML service is configured (ML_SERVICE_URL). */
export const mlStatus = query({
  args: {},
  handler: async () => ({ configured: Boolean(process.env.ML_SERVICE_URL?.trim()) }),
});

/**
 * Asks the optional Python service (ml/serve.py) for its ranking and records it. Falls back to
 * the built-in model when ML_SERVICE_URL is unset, slow (4 s timeout) or returns nothing usable.
 * A cloud Convex deployment cannot reach http://localhost - use a public URL for the service.
 */
export const predictWithMlService = action({
  args: predictArgs,
  handler: async (ctx, args): Promise<PredictionView> => {
    if (!(await ctx.auth.getUserIdentity())) throw new ConvexError("Unauthenticated");
    const symptoms = validate(args);
    if (symptoms.length === 0) throw new ConvexError("Enter at least one symptom");
    const local = predict({ symptoms, age: args.age, sex: args.gender, durationDays: args.durationDays });
    const ml = await askMlService(symptoms, args.age ?? 0, args.gender ?? "");
    const ranking = ml.flatMap((p) => {
      const info = diseaseInfo(p.diseaseName);
      const fromLocal = info ? local.ranking.find((r) => r.name === info.name) : undefined;
      return info
        ? [{
            ...(fromLocal ?? {
              name: info.name,
              category: info.category,
              description: info.description,
              coverage: 0,
              matchedSymptoms: [],
              unexplainedSymptoms: [],
              askAbout: info.symptoms.slice(0, 3).map((s) => s.name),
              urgent: Boolean(info.profile.urgent),
            }),
            probability: Math.round(p.confidence * 10) / 10,
          }]
        : [];
    });
    const useMl = ranking.length > 0;
    const top = useMl ? diseaseInfo(ranking[0].name) : null;
    const output: PredictOutput = useMl
      ? { ...local, model: "ml-service", ranking, medicines: top?.medicines ?? [], treatmentNotes: top?.notes ?? [] }
      : local;
    return await ctx.runMutation(internal.functions.predict.recordExternal, {
      ...args,
      symptoms,
      output: JSON.stringify(output),
      source: useMl ? "ml-service" : "knowledge-base",
    });
  },
});

export const recordExternal = internalMutation({
  args: { ...predictArgs, output: v.string(), source: v.union(v.literal("ml-service"), v.literal("knowledge-base")) },
  handler: async (ctx, args): Promise<PredictionView> => {
    const user = await requireUser(ctx);
    const patient = args.patientId ? await requireOwnPatient(ctx, user, args.patientId) : null;
    const output = JSON.parse(args.output) as PredictOutput;
    if (output.ranking.length === 0) throw new ConvexError("No condition in the knowledge base matches these symptoms.");
    const view = { ...withSafety(output, patient), source: args.source };
    const predictionId = await ctx.db.insert("predictions", recordFields(user._id, args, view));
    return { ...view, predictionId };
  },
});

/** Calls the Python service. Returns [] on any failure so the caller can fall back. */
async function askMlService(symptoms: string[], age: number, gender: string) {
  const baseUrl = process.env.ML_SERVICE_URL?.trim().replace(/\/+$/, "");
  if (!baseUrl) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);
  try {
    const res = await fetch(`${baseUrl}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ symptoms, age, gender }),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`ML service answered ${res.status}; using the built-in model`);
      return [];
    }
    const body = (await res.json()) as { allPredictions?: { diseaseName?: unknown; confidence?: unknown }[] };
    return (body.allPredictions ?? []).flatMap((p) =>
      typeof p.diseaseName === "string" && typeof p.confidence === "number"
        ? [{ diseaseName: p.diseaseName, confidence: p.confidence }]
        : [],
    );
  } catch (err) {
    console.warn(`ML service unreachable (${String(err)}); using the built-in model`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Every symptom the model understands, for autocomplete. Not user-specific, so cached globally. */
export const knownSymptoms = query({
  args: {},
  handler: async () => knownSymptomNames(),
});

/** Knowledge-base entry for one condition (symptom weights, treatments, demographics). */
export const getDiseaseInfo = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    await requireUser(ctx);
    return diseaseInfo(args.name);
  },
});

/** The signed-in clinician's recent predictions, newest first. */
export const getPredictions = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const rows = await ctx.db
      .query("predictions")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(Math.min(args.limit ?? 50, 200));
    return await Promise.all(
      rows.map(async (p) => ({
        id: p._id,
        patientId: p.patientId,
        diseaseName: p.diseaseName ?? (p.diseaseId ? (await ctx.db.get(p.diseaseId))?.name : undefined) ?? "Unknown",
        confidence: p.confidence,
        symptoms: p.symptoms,
        redFlags: p.redFlags ?? [],
        source: p.source,
        createdAt: p.createdAt,
      })),
    );
  },
});
