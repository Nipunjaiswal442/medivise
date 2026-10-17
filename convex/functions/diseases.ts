import { query, mutation } from "convex/server";
import { v } from "convex/values";

export const getDiseases = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("diseases").collect();
  },
});

export const getDiseaseById = query({
  args: { id: v.id("diseases") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getSymptoms = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("symptoms").collect();
  },
});

export const getDiseaseSymptoms = query({
  args: { diseaseId: v.id("diseases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diseaseSymptoms")
      .filter((q) => q.eq(q.field("diseaseId"), args.diseaseId))
      .collect();
  },
});

export const getDiseaseMedicines = query({
  args: { diseaseId: v.id("diseases") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("diseaseMedicines")
      .filter((q) => q.eq(q.field("diseaseId"), args.diseaseId))
      .collect();
  },
});

export const createDisease = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("diseases", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createSymptom = mutation({
  args: { name: v.string(), description: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("symptoms", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
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
    const now = Date.now();
    return await ctx.db.insert("medicines", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const linkDiseaseSymptom = mutation({
  args: {
    diseaseId: v.id("diseases"),
    symptomId: v.id("symptoms"),
    weight: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("diseaseSymptoms", args);
  },
});

export const linkDiseaseMedicine = mutation({
  args: {
    diseaseId: v.id("diseases"),
    medicineId: v.id("medicines"),
    confidence: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("diseaseMedicines", args);
  },
});
