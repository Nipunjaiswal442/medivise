import { ConvexError, v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireOwnPatient, requireUser } from "../lib/auth";
import { indexConsultation, reindexPatient } from "../lib/indexing";
import { prescriptionEntry, symptomEntry } from "../schema";

export const getConsultations = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireUser(ctx);
    return await ctx.db
      .query("consultations")
      .withIndex("userId", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(200);
  },
});

export const listForPatient = query({
  args: { patientId: v.id("patients") },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    await requireOwnPatient(ctx, user, args.patientId);
    return await ctx.db
      .query("consultations")
      .withIndex("patientId", (q) => q.eq("patientId", args.patientId))
      .order("desc")
      .collect();
  },
});

/**
 * Records a consultation for an existing patient: stores it, appends a visit to the patient's
 * history (last visit, current symptoms and prescriptions), completes the linked appointment and
 * updates the retrieval index.
 */
export const createConsultation = mutation({
  args: {
    patientId: v.id("patients"),
    appointmentId: v.optional(v.id("appointments")),
    symptoms: v.array(symptomEntry),
    prescriptions: v.array(prescriptionEntry),
    aiReview: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    notes: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    predictionId: v.optional(v.id("predictions")),
  },
  handler: async (ctx, args) => {
    const user = await requireUser(ctx);
    const patient = await requireOwnPatient(ctx, user, args.patientId);
    if (args.predictionId) {
      const prediction = await ctx.db.get(args.predictionId);
      if (!prediction || prediction.userId !== user._id) throw new ConvexError("Prediction not found");
      if (!prediction.patientId) await ctx.db.patch(args.predictionId, { patientId: args.patientId });
    }
    if (args.appointmentId) {
      const appointment = await ctx.db.get(args.appointmentId);
      if (!appointment || appointment.userId !== user._id || appointment.patientId !== args.patientId) {
        throw new ConvexError("Appointment not found for this patient");
      }
    }

    const now = Date.now();
    const id = await ctx.db.insert("consultations", { ...args, userId: user._id, createdAt: now, updatedAt: now });

    const today = new Date(now).toISOString().slice(0, 10);
    const diagnosis = args.diagnosis?.trim();
    const symptomText = args.symptoms.map((s) => s.name).join(", ");
    await ctx.db.patch(patient._id, {
      lastVisit: today,
      status: "active",
      symptoms: args.symptoms,
      prescriptions: args.prescriptions,
      aiReview: args.aiReview ?? patient.aiReview,
      condition: diagnosis || patient.condition,
      consultationDuration: args.durationSeconds ?? patient.consultationDuration,
      visits: [
        ...(patient.visits ?? []),
        {
          date: today,
          reason: symptomText || "Consultation",
          diagnosis: diagnosis || "Not recorded",
          notes: [
            args.notes?.trim(),
            args.prescriptions.length > 0 && `Prescribed: ${args.prescriptions.map((p) => `${p.name} ${p.dosage}`).join(", ")}`,
          ]
            .filter(Boolean)
            .join(". "),
        },
      ],
      updatedAt: now,
    });
    if (args.appointmentId) {
      await ctx.db.patch(args.appointmentId, { status: "completed", consultationId: id, updatedAt: now });
    }

    const updated = (await ctx.db.get(patient._id))!;
    await reindexPatient(ctx, updated);
    await indexConsultation(ctx, (await ctx.db.get(id))!, updated);
    return id;
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
