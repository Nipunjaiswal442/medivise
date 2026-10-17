import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireUser } from "../lib/auth";

const symptomEntry = v.object({ name: v.string(), days: v.string() });
const prescriptionEntry = v.object({
  name: v.string(),
  timesPerDay: v.string(),
  dosage: v.string(),
});

/** All patients of the signed-in clinician, newest first. */
export const getPatients = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("patients")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const createPatient = mutation({
  args: {
    name: v.string(),
    age: v.number(),
    gender: v.string(),
    condition: v.string(),
    lastVisit: v.string(),
    status: v.union(v.literal("active"), v.literal("discharged"), v.literal("scheduled")),
    consultationDuration: v.number(),
    symptoms: v.array(symptomEntry),
    prescriptions: v.array(prescriptionEntry),
    aiReview: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (!args.name.trim()) throw new ConvexError("Patient name is required");
    if (!Number.isFinite(args.age) || args.age < 0 || args.age > 130) {
      throw new ConvexError("Patient age must be between 0 and 130");
    }

    // Per-clinician sequence: P-001, P-002, ... (mutations are transactional, so this cannot race)
    const latest = await ctx.db
      .query("patients")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
    const match = latest?.customId.match(/^P-(\d+)$/);
    const nextNumber = match ? parseInt(match[1], 10) + 1 : 1;
    const customId = `P-${String(nextNumber).padStart(3, "0")}`;

    const now = Date.now();
    const id = await ctx.db.insert("patients", {
      ...args,
      name: args.name.trim(),
      customId,
      userId: user._id,
      createdAt: now,
      updatedAt: now,
    });
    return { id, customId };
  },
});

/** Deletes a patient together with the consultations and predictions recorded for them. */
export const deletePatient = mutation({
  args: { id: v.id("patients") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const patient = await ctx.db.get(args.id);
    if (!patient || patient.userId !== user._id) {
      throw new ConvexError("Patient not found");
    }
    const consultations = await ctx.db
      .query("consultations")
      .withIndex("patientId", (q) => q.eq("patientId", args.id))
      .collect();
    for (const c of consultations) await ctx.db.delete(c._id);
    const predictions = await ctx.db
      .query("predictions")
      .withIndex("patientId", (q) => q.eq("patientId", args.id))
      .collect();
    for (const p of predictions) await ctx.db.delete(p._id);
    await ctx.db.delete(args.id);
    return { success: true };
  },
});
