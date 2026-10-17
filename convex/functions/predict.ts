import { ConvexError, v } from "convex/values";
import { internal } from "../_generated/api";
import type { Id } from "../_generated/dataModel";
import { action, internalMutation, internalQuery, query } from "../_generated/server";
import { findUserByFirebaseUid, requireUser } from "../lib/auth";
import { matchSymptoms, scoreDiseases } from "../lib/scoring";

const ML_TIMEOUT_MS = 8000;
const MAX_SYMPTOMS = 30;

interface RankedDisease {
  diseaseId: Id<"diseases">;
  diseaseName: string;
  confidence: number;
}

interface LocalScore {
  ranking: RankedDisease[];
  matched: string[];
  unmatched: string[];
}

export interface PredictionResult {
  predictionId: Id<"predictions">;
  source: string;
  disease: { id: Id<"diseases">; name: string; confidence: number };
  allPredictions: RankedDisease[];
  medicines: {
    id: Id<"medicines">;
    name: string;
    description?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    contraindications?: string;
    confidence: number;
  }[];
  matchedSymptoms: string[];
  unmatchedSymptoms: string[];
}

/**
 * Predicts likely conditions from symptoms and returns recommended medicines.
 *
 * If the ML_SERVICE_URL environment variable is set (npx convex env set ML_SERVICE_URL <url>) the
 * Python service in ml/ is asked first; if it is unset, unreachable, or returns nothing we know,
 * the built-in knowledge-base scorer is used instead. The result says which one answered.
 *
 * NOTE: a cloud Convex deployment cannot reach http://localhost:8000. Use a public URL for the
 * ML service (or run a local Convex backend).
 */
export const predictHealth = action({
  args: {
    patientId: v.optional(v.id("patients")),
    symptoms: v.array(v.string()),
    age: v.number(),
    gender: v.string(),
  },
  handler: async (ctx, args): Promise<PredictionResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Unauthenticated");

    const symptoms = args.symptoms.map((s) => s.trim()).filter(Boolean);
    if (symptoms.length === 0) throw new ConvexError("Enter at least one symptom");
    if (symptoms.length > MAX_SYMPTOMS || symptoms.some((s) => s.length > 100)) {
      throw new ConvexError("Too many symptoms, or a symptom is too long");
    }
    if (!Number.isFinite(args.age) || args.age < 0 || args.age > 130) {
      throw new ConvexError("Age must be between 0 and 130");
    }

    const local: LocalScore = await ctx.runQuery(internal.functions.predict.scoreLocally, { symptoms });

    let ranking: RankedDisease[] = [];
    let source: "ml-service" | "knowledge-base" = "knowledge-base";
    const mlPredictions = await askMlService(symptoms, args.age, args.gender);
    if (mlPredictions.length > 0) {
      const resolved: (Id<"diseases"> | null)[] = await ctx.runQuery(internal.functions.predict.resolveDiseaseNames, {
        names: mlPredictions.map((p) => p.diseaseName),
      });
      ranking = mlPredictions.flatMap((p, i) =>
        resolved[i] ? [{ diseaseId: resolved[i]!, diseaseName: p.diseaseName, confidence: p.confidence }] : [],
      );
      if (ranking.length > 0) source = "ml-service";
    }
    if (ranking.length === 0) ranking = local.ranking;

    if (ranking.length === 0) {
      throw new ConvexError(
        local.matched.length === 0
          ? "None of the entered symptoms were recognised. Try standard terms such as “fever” or “sore throat”."
          : "No condition in the knowledge base matches these symptoms.",
      );
    }

    const result: PredictionResult = await ctx.runMutation(internal.functions.predict.recordPrediction, {
      firebaseUid: identity.subject,
      patientId: args.patientId,
      ranking,
      symptoms,
      matchedSymptoms: local.matched,
      unmatchedSymptoms: local.unmatched,
      source,
    });
    return result;
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
      console.warn(`ML service answered ${res.status}; using the built-in scorer`);
      return [];
    }
    const body = (await res.json()) as {
      allPredictions?: { diseaseName?: unknown; confidence?: unknown }[];
    };
    return (body.allPredictions ?? []).flatMap((p) =>
      typeof p.diseaseName === "string" && typeof p.confidence === "number"
        ? [{ diseaseName: p.diseaseName, confidence: p.confidence }]
        : [],
    );
  } catch (err) {
    console.warn(`ML service unreachable (${String(err)}); using the built-in scorer`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/** Built-in knowledge-base scorer (also the fallback when the ML service is unavailable). */
export const scoreLocally = internalQuery({
  args: { symptoms: v.array(v.string()) },
  handler: async (ctx, args): Promise<LocalScore> => {
    const known = (await ctx.db.query("symptoms").collect()).map((s) => ({ id: s._id, name: s.name }));
    const { matched, unmatched } = matchSymptoms(args.symptoms, known);
    const links = (await ctx.db.query("diseaseSymptoms").collect()).map((l) => ({
      diseaseId: l.diseaseId,
      symptomId: l.symptomId as string,
      weight: l.weight,
    }));
    const scores = scoreDiseases(matched.map((m) => m.symptomId), links);
    const ranking: RankedDisease[] = [];
    for (const s of scores) {
      const disease = await ctx.db.get(s.diseaseId);
      if (disease) {
        ranking.push({ diseaseId: disease._id, diseaseName: disease.name, confidence: s.confidence });
      }
    }
    return { ranking, matched: matched.map((m) => m.name), unmatched };
  },
});

/** Maps disease names (from the ML service) to knowledge-base ids; null when unknown. */
export const resolveDiseaseNames = internalQuery({
  args: { names: v.array(v.string()) },
  handler: async (ctx, args) => {
    const key = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const byKey = new Map((await ctx.db.query("diseases").collect()).map((d) => [key(d.name), d._id]));
    return args.names.map((n): Id<"diseases"> | null => byKey.get(key(n)) ?? null);
  },
});

export const recordPrediction = internalMutation({
  args: {
    firebaseUid: v.string(),
    patientId: v.optional(v.id("patients")),
    ranking: v.array(
      v.object({ diseaseId: v.id("diseases"), diseaseName: v.string(), confidence: v.number() }),
    ),
    symptoms: v.array(v.string()),
    matchedSymptoms: v.array(v.string()),
    unmatchedSymptoms: v.array(v.string()),
    source: v.string(),
  },
  handler: async (ctx, args): Promise<PredictionResult> => {
    const user = await findUserByFirebaseUid(ctx, args.firebaseUid);
    if (!user) {
      throw new ConvexError("User profile not found. Sign out and back in to create it.");
    }
    if (args.patientId) {
      const patient = await ctx.db.get(args.patientId);
      if (!patient || patient.userId !== user._id) throw new ConvexError("Patient not found");
    }

    const top = args.ranking[0];
    const now = Date.now();
    const predictionId = await ctx.db.insert("predictions", {
      patientId: args.patientId,
      userId: user._id,
      diseaseId: top.diseaseId,
      confidence: top.confidence,
      symptoms: args.symptoms,
      unmatchedSymptoms: args.unmatchedSymptoms,
      source: args.source,
      createdAt: now,
      updatedAt: now,
    });

    const links = await ctx.db
      .query("diseaseMedicines")
      .withIndex("diseaseId", (q) => q.eq("diseaseId", top.diseaseId))
      .collect();
    links.sort((a, b) => b.confidence - a.confidence);
    const medicines = [];
    for (const link of links) {
      const med = await ctx.db.get(link.medicineId);
      if (med) {
        medicines.push({
          id: med._id,
          name: med.name,
          description: med.description,
          dosage: med.dosage,
          frequency: med.frequency,
          duration: med.duration,
          contraindications: med.contraindications,
          confidence: link.confidence,
        });
      }
    }

    const result: PredictionResult = {
      predictionId,
      source: args.source,
      disease: { id: top.diseaseId, name: top.diseaseName, confidence: top.confidence },
      allPredictions: args.ranking,
      medicines,
      matchedSymptoms: args.matchedSymptoms,
      unmatchedSymptoms: args.unmatchedSymptoms,
    };
    return result;
  },
});

/** The signed-in clinician's past predictions, newest first. */
export const getPredictions = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const rows = await ctx.db
      .query("predictions")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
    return await Promise.all(
      rows.map(async (p) => ({
        id: p._id,
        patientId: p.patientId,
        diseaseName: (await ctx.db.get(p.diseaseId))?.name ?? "Unknown",
        confidence: p.confidence,
        symptoms: p.symptoms,
        source: p.source,
        createdAt: p.createdAt,
      })),
    );
  },
});
