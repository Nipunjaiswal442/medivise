import { ConvexError, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { mutation, query } from "../_generated/server";
import { requireOwnPatient, requireUser } from "../lib/auth";

const MAX_MESSAGE_CHARS = 100_000;

async function requireOwnThread(ctx: QueryCtx, userId: Id<"users">, id: Id<"chatThreads">) {
  const thread = await ctx.db.get(id);
  if (!thread || thread.userId !== userId) throw new ConvexError("Conversation not found");
  return thread;
}

export const listThreads = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("chatThreads")
      .withIndex("by_user_updated", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(100);
  },
});

export const getThread = query({
  args: { id: v.id("chatThreads") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const thread = await requireOwnThread(ctx, user._id, args.id);
    const messages = await ctx.db
      .query("chatMessages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.id))
      .collect();
    return { thread, messages };
  },
});

export const createThread = mutation({
  args: { title: v.string(), patientId: v.optional(v.id("patients")) },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    if (args.patientId) await requireOwnPatient(ctx, user, args.patientId);
    const now = Date.now();
    return await ctx.db.insert("chatThreads", {
      userId: user._id,
      title: args.title.trim().slice(0, 80) || "New conversation",
      patientId: args.patientId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const addMessage = mutation({
  args: {
    threadId: v.id("chatThreads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    attachments: v.optional(v.array(v.object({ documentId: v.id("documents"), name: v.string() }))),
    toolCalls: v.optional(v.array(v.object({ name: v.string(), summary: v.string() }))),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireOwnThread(ctx, user._id, args.threadId);
    if (args.content.length > MAX_MESSAGE_CHARS) throw new ConvexError("Message is too long");
    const now = Date.now();
    const id = await ctx.db.insert("chatMessages", { ...args, userId: user._id, createdAt: now });
    await ctx.db.patch(args.threadId, { updatedAt: now });
    return id;
  },
});

export const renameThread = mutation({
  args: { id: v.id("chatThreads"), title: v.string() },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireOwnThread(ctx, user._id, args.id);
    await ctx.db.patch(args.id, { title: args.title.trim().slice(0, 80) || "Conversation" });
  },
});

export const deleteThread = mutation({
  args: { id: v.id("chatThreads") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireOwnThread(ctx, user._id, args.id);
    const messages = await ctx.db.query("chatMessages").withIndex("by_thread", (q) => q.eq("threadId", args.id)).collect();
    for (const m of messages) await ctx.db.delete(m._id);
    await ctx.db.delete(args.id);
  },
});
