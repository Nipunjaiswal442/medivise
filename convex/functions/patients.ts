import { query, mutation } from "convex/server";
import { v } from "convex/values";

export const getPatients = query({
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
    const patients = await ctx.db
      .query("patients")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .collect();
    return patients;
  },
});

export const createPatient = mutation({
  args: {
    name: v.string(),
    age: v.number(),
    gender: v.string(),
    condition: v.string(),
    lastVisit: v.string(),
    status: v.union(
      v.literal("active"),
      v.literal("discharged"),
      v.literal("scheduled")
    ),
    consultationDuration: v.number(),
    symptoms: v.array(v.object({ name: v.string(), days: v.string() })),
    prescriptions: v.array(
      v.object({ name: v.string(), timesPerDay: v.string(), dosage: v.string() })
    ),
    aiReview: v.optional(v.string()),
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
    const lastPatient = await ctx.db
      .query("patients")
      .filter((q) => q.eq(q.field("userId"), user._id))
      .order("desc")
      .unique();
    let nextNum = 1;
    if (lastPatient && lastPatient.customId) {
      const match = lastPatient.customId.match(/P-(\d+)/);
      if (match) {
        nextNum = parseInt(match[1], 10) + 1;
      }
    }
    const customId = `P-${String(nextNum).padStart(3, "0")}`;
    const now = Date.now();
    return await ctx.db.insert("patients", {
      customId,
      ...args,
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deletePatient = mutation({
  args: { id: v.id("patients") },
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
    const patient = await ctx.db.get(args.id);
    if (!patient) {
      throw new Error("Patient not found");
    }
    if ((patient as any).userId !== user._id) {
      throw new Error("Not authorized to delete this patient");
    }
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
