import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireOwnPatient, requireUser } from "../lib/auth";

/**
 * Full-text retrieval over the signed-in clinician's patient records, consultations and uploaded
 * documents (BM25-style ranking from Convex search indexes; the last term is prefix-matched).
 */
export const search = query({
  args: {
    query: v.string(),
    patientId: v.optional(v.id("patients")),
    sourceType: v.optional(v.union(v.literal("patient"), v.literal("document"), v.literal("consultation"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.patientId) await requireOwnPatient(ctx, user, args.patientId);
    const text = args.query.trim().slice(0, 500);
    if (!text) return [];
    const limit = Math.min(Math.max(args.limit ?? 8, 1), 25);
    const results = await ctx.db
      .query("knowledgeChunks")
      .withSearchIndex("search_text", (q) => {
        let s = q.search("text", text).eq("userId", user._id);
        if (args.patientId) s = s.eq("patientId", args.patientId);
        if (args.sourceType) s = s.eq("sourceType", args.sourceType);
        return s;
      })
      .take(limit);
    return results.map((c) => ({
      title: c.title,
      text: c.text,
      sourceType: c.sourceType,
      patientId: c.patientId,
      documentId: c.documentId,
    }));
  },
});

/** How much is indexed, for the assistant's status panel. */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    const chunks = await ctx.db.query("knowledgeChunks").withIndex("by_user", (q) => q.eq("userId", user._id)).collect();
    const counts = { patient: 0, document: 0, consultation: 0 };
    for (const c of chunks) counts[c.sourceType]++;
    return counts;
  },
});
