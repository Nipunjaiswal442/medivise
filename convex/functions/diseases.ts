import { ConvexError, v } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { requireIdentity, requireUser } from "../lib/auth";

/** Editing the clinical knowledge base is limited to administrators. */
async function requireAdmin(ctx: MutationCtx) {
  const user = await requireUser(ctx);
  if (user.role !== "admin") {
    throw new ConvexError("Only administrators can edit the knowledge base");
  }
  return user;
}

export const getDiseases = query({
  args: {},
  handler: async (ctx) => {
    await requireIdentity(ctx);
    return await ctx.db.query("diseases").collect();
  },
});

export const getDiseaseById = query({
  args: { id: v.id("diseases") },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    return await ctx.db.get(args.id);
  },
});

export const getSymptoms = query({
  args: {},
  handler: async (ctx) => {
    await requireIdentity(ctx);
    return await ctx.db.query("symptoms").collect();
  },
});

export const getDiseaseSymptoms = query({
  args: { diseaseId: v.id("diseases") },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    return await ctx.db
      .query("diseaseSymptoms")
      .withIndex("diseaseId", (q) => q.eq("diseaseId", args.diseaseId))
      .collect();
  },
});

export const getDiseaseMedicines = query({
  args: { diseaseId: v.id("diseases") },
  handler: async (ctx, args) => {
    await requireIdentity(ctx);
    return await ctx.db
      .query("diseaseMedicines")
      .withIndex("diseaseId", (q) => q.eq("diseaseId", args.diseaseId))
      .collect();
  },
});

export const createDisease = mutation({
  args: { name: v.string(), description: v.string(), category: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    return await ctx.db.insert("diseases", { ...args, createdAt: now, updatedAt: now });
  },
});

export const createSymptom = mutation({
  args: { name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    return await ctx.db.insert("symptoms", { ...args, createdAt: now, updatedAt: now });
  },
});

export const createMedicine = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    dosage: v.optional(v.string()),
    frequency: v.optional(v.string()),
    duration: v.optional(v.string()),
    contraindications: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    return await ctx.db.insert("medicines", { ...args, createdAt: now, updatedAt: now });
  },
});

export const linkDiseaseSymptom = mutation({
  args: { diseaseId: v.id("diseases"), symptomId: v.id("symptoms"), weight: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("diseaseSymptoms", args);
  },
});

export const linkDiseaseMedicine = mutation({
  args: { diseaseId: v.id("diseases"), medicineId: v.id("medicines"), confidence: v.number() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db.insert("diseaseMedicines", args);
  },
});
