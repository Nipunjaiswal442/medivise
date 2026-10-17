import { action, mutation, query } from "convex/server";
import { v } from "convex/values";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export const predictHealth = action({
  args: {
    patientId: v.id("patients"),
    symptoms: v.array(v.string()),
    age: v.number(),
    gender: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("firebaseUid"), identity.subject))
      .unique();
    if (!user) {
      throw new Error("User not found");
    }

    // Call the DL model service
    let predictionResult;
    try {
      const response = await fetch(`${ML_SERVICE_URL}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptoms: args.symptoms,
          age: args.age,
          gender: args.gender,
        }),
      });
      if (!response.ok) {
        throw new Error(`ML service error: ${response.status}`);
      }
      predictionResult = await response.json();
    } catch (err) {
      // Fallback: rule-based prediction using diseaseSymptoms weights
      predictionResult = await ruleBasedPrediction(ctx, args.symptoms);
    }

    const { diseaseId, confidence, diseaseName, allPredictions } = predictionResult;

    // Store the prediction
    const now = Date.now();
    const prediction = await ctx.db.insert("predictions", {
      patientId: args.patientId,
      userId: user._id,
      diseaseId,
      confidence,
      symptoms: args.symptoms,
      createdAt: now,
      updatedAt: now,
    });

    // Get medicines for the predicted disease
    const medicines = await ctx.db
      .query("diseaseMedicines")
      .filter((q) => q.eq(q.field("diseaseId"), diseaseId))
      .order("desc")
      .collect();

    // Fetch medicine details
    const medicineDetails = await Promise.all(
      medicines.map((m) =>
        ctx.db.get(m.medicineId).then((med) => ({
          ...med,
          confidence: m.confidence,
        }))
      )
    );

    return {
      predictionId: prediction._id,
      disease: { id: diseaseId, name: diseaseName, confidence },
      allPredictions,
      medicines: medicineDetails,
    };
  },
});

export const getPredictions = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("firebaseUid"), identity.subject))
      .unique();
    if (!user) {
      throw new Error("User not found");
    }
    return await ctx.db
      .query("predictions")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .collect();
  },
});

async function ruleBasedPrediction(ctx: any, symptoms: string[]) {
  // Simple rule-based fallback: match symptoms to diseases via diseaseSymptoms weights
  const diseaseSymptoms = await ctx.db.query("diseaseSymptoms").collect();
  const diseaseScores: Record<string, { score: number; count: number }> = {};

  for (const ds of diseaseSymptoms) {
    const symptomMatch = symptoms.some(
      (s) => s.toLowerCase() === ds.symptomId.toLowerCase()
    );
    if (symptomMatch) {
      if (!diseaseScores[ds.diseaseId]) {
        diseaseScores[ds.diseaseId] = { score: 0, count: 0 };
      }
      diseaseScores[ds.diseaseId].score += ds.weight;
      diseaseScores[ds.diseaseId].count += 1;
    }
  }

  const sorted = Object.entries(diseaseScores)
    .map(([diseaseId, data]) => ({
      diseaseId,
      score: data.score / data.count,
    }))
    .sort((a, b) => b.score - a.score);

  if (sorted.length === 0) {
    // Return a default "Unknown" result
    const unknownDisease = await ctx.db
      .query("diseases")
      .filter((q) => q.eq(q.field("name"), "Unknown"))
      .unique();
    return {
      diseaseId: unknownDisease?._id ?? "",
      confidence: 0,
      diseaseName: unknownDisease?.name ?? "Unknown",
      allPredictions: [],
    };
  }

  const top = sorted[0];
  const disease = await ctx.db.get(top.diseaseId);
  const confidence = Math.min(Math.round(top.score * 100), 99);

  return {
    diseaseId: top.diseaseId,
    confidence,
    diseaseName: (disease as any)?.name ?? "Unknown",
    allPredictions: sorted.slice(0, 5).map((s) => ({
      diseaseId: s.diseaseId,
      confidence: Math.min(Math.round(s.score * 100), 99),
    })),
  };
}
