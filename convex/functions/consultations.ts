import { query, mutation } from "convex/server";
import { v } from "convex/values";

export const getConsultations = query({
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
      .query("consultations")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .collect();
  },
});

export const createConsultation = mutation({
  args: {
    patientId: v.id("patients"),
    symptoms: v.array(v.object({ name: v.string(), days: v.string() })),
    prescriptions: v.array(
      v.object({ name: v.string(), timesPerDay: v.string(), dosage: v.string() })
    ),
    aiReview: v.optional(v.string()),
    predictionId: v.optional(v.id("predictions")),
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
    await ctx.db.patch(args.consultationId, { predictionId: args.predictionId });
    return { success: true };
  },
});
