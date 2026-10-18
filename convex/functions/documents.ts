import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { requireOwnPatient, requireUser } from "../lib/auth";
import { deleteChunks, MAX_DOCUMENT_CHARS, reindexDocument } from "../lib/indexing";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

async function requireOwnDocument(ctx: QueryCtx, userId: Id<"users">, id: Id<"documents">) {
  const doc = await ctx.db.get(id);
  if (!doc || doc.userId !== userId) throw new ConvexError("Document not found");
  return doc;
}

/** Short-lived URL the browser POSTs the file to (Convex file storage). */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Registers an uploaded file. `text` is what the browser extracted (PDF, DOCX, plain text); it is
 * chunked into the retrieval index. Images and scanned PDFs arrive without text and are marked
 * "needs-transcription" until /api/ingest has the LLM read them.
 */
export const create = mutation({
  args: {
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    storageId: v.optional(v.id("_storage")),
    text: v.optional(v.string()),
    patientId: v.optional(v.id("patients")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.patientId) await requireOwnPatient(ctx, user, args.patientId);
    if (!args.name.trim()) throw new ConvexError("File name is required");
    if (args.size > MAX_FILE_BYTES) throw new ConvexError("Files must be 20 MB or smaller");
    const fullText = args.text?.trim() ?? "";
    const truncated = fullText.length > MAX_DOCUMENT_CHARS;
    const text = truncated ? fullText.slice(0, MAX_DOCUMENT_CHARS) : fullText;
    const id = await ctx.db.insert("documents", {
      userId: user._id,
      patientId: args.patientId,
      name: args.name.trim().slice(0, 200),
      mimeType: args.mimeType || "application/octet-stream",
      size: args.size,
      storageId: args.storageId,
      text: text || undefined,
      textSource: text ? "client" : undefined,
      status: text ? "ready" : args.storageId ? "needs-transcription" : "failed",
      truncated,
      chunkCount: 0,
      createdAt: Date.now(),
    });
    if (text) {
      const chunkCount = await reindexDocument(ctx, (await ctx.db.get(id))!, text);
      await ctx.db.patch(id, { chunkCount });
    }
    return { id, truncated, status: text ? "ready" : "needs-transcription" };
  },
});

/** Stores text produced by the LLM transcription step (/api/ingest) and indexes it. */
export const setTranscription = mutation({
  args: { id: v.id("documents"), text: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const doc = await requireOwnDocument(ctx, user._id, args.id);
    const fullText = args.text.trim();
    if (!fullText) {
      await ctx.db.patch(doc._id, { status: "failed" });
      return { chunkCount: 0 };
    }
    const truncated = fullText.length > MAX_DOCUMENT_CHARS;
    const text = truncated ? fullText.slice(0, MAX_DOCUMENT_CHARS) : fullText;
    await ctx.db.patch(doc._id, { text, textSource: "llm", status: "ready", truncated });
    const chunkCount = await reindexDocument(ctx, (await ctx.db.get(doc._id))!, text);
    await ctx.db.patch(doc._id, { chunkCount });
    return { chunkCount };
  },
});

export const markFailed = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireOwnDocument(ctx, user._id, args.id);
    await ctx.db.patch(args.id, { status: "failed" });
  },
});

/** The user's documents (newest first), optionally only those linked to one patient. */
export const list = query({
  args: { patientId: v.optional(v.id("patients")) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const rows = args.patientId
      ? (await ctx.db.query("documents").withIndex("by_patient", (q) => q.eq("patientId", args.patientId)).collect())
          .filter((d) => d.userId === user._id)
          .sort((a, b) => b.createdAt - a.createdAt)
      : await ctx.db.query("documents").withIndex("by_user", (q) => q.eq("userId", user._id)).order("desc").take(200);
    return await Promise.all(
      rows.map(async (d) => ({
        _id: d._id,
        name: d.name,
        mimeType: d.mimeType,
        size: d.size,
        status: d.status,
        truncated: d.truncated ?? false,
        chunkCount: d.chunkCount,
        textLength: d.text?.length ?? 0,
        patientId: d.patientId,
        patientName: d.patientId ? (await ctx.db.get(d.patientId))?.name : undefined,
        createdAt: d.createdAt,
      })),
    );
  },
});

/** Metadata, a slice of the extracted text, and a download URL for one document. */
export const get = query({
  args: { id: v.id("documents"), offset: v.optional(v.number()), length: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const doc = await requireOwnDocument(ctx, user._id, args.id);
    const offset = Math.max(0, Math.floor(args.offset ?? 0));
    const length = Math.min(Math.max(1, Math.floor(args.length ?? 20_000)), 100_000);
    const text = doc.text ?? "";
    return {
      _id: doc._id,
      name: doc.name,
      mimeType: doc.mimeType,
      size: doc.size,
      status: doc.status,
      patientId: doc.patientId,
      truncated: doc.truncated ?? false,
      textLength: text.length,
      offset,
      text: text.slice(offset, offset + length),
      hasMore: offset + length < text.length,
      url: doc.storageId ? await ctx.storage.getUrl(doc.storageId) : null,
      createdAt: doc.createdAt,
    };
  },
});

export const setPatient = mutation({
  args: { id: v.id("documents"), patientId: v.optional(v.id("patients")) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const doc = await requireOwnDocument(ctx, user._id, args.id);
    if (args.patientId) await requireOwnPatient(ctx, user, args.patientId);
    await ctx.db.patch(doc._id, { patientId: args.patientId });
    const chunks = await ctx.db.query("knowledgeChunks").withIndex("by_document", (q) => q.eq("documentId", doc._id)).collect();
    for (const c of chunks) await ctx.db.patch(c._id, { patientId: args.patientId });
    return { success: true };
  },
});

export const remove = mutation({
  args: { id: v.id("documents") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const doc = await requireOwnDocument(ctx, user._id, args.id);
    await deleteChunks(ctx, "by_document", doc._id);
    if (doc.storageId) await ctx.storage.delete(doc.storageId);
    await ctx.db.delete(doc._id);
    return { success: true };
  },
});
