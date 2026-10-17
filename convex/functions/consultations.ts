import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireUser } from "../lib/auth";

export const getConsultations = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("consultations")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const createConsultation = mutation({
  args: {
    patientId: v.id("patients"),
    symptoms: v.array(v.object({ name: v.string(), days: v.string() })),
    prescriptions: v.array(
      v.object({ name: v.string(), timesPerDay: v.string(), dosage: v.string() }),
    ),
    aiReview: v.optional(v.string()),
    predictionId: v.optional(v.id("predictions")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const patient = await ctx.db.get(args.patientId);
    if (!patient || patient.userId !== user._id) {
      throw new ConvexError("Patient not found");
    }
    if (args.predictionId) {
      const prediction = await ctx.db.get(args.predictionId);
      if (!prediction || prediction.userId !== user._id) {
        throw new ConvexError("Prediction not found");
      }
    }
    const now = Date.now();
    return await ctx.db.insert("consultations", {
      ...args,
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const linkPredictionToConsultation = mutation({
  args: {
    consultationId: v.id("consultations"),
    predictionId: v.id("predictions"),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const consultation = await ctx.db.get(args.consultationId);
    const prediction = await ctx.db.get(args.predictionId);
    if (!consultation || consultation.userId !== user._id) {
      throw new ConvexError("Consultation not found");
    }
    if (!prediction || prediction.userId !== user._id) {
      throw new ConvexError("Prediction not found");
    }
    await ctx.db.patch(args.consultationId, {
      predictionId: args.predictionId,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
