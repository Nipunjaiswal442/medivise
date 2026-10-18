/** Keeps knowledgeChunks (the retrieval index) in sync with patients, consultations and documents. */
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { chunkText, patientLabel, patientSections } from "./records";

export const MAX_DOCUMENT_CHARS = 400_000;
export const MAX_CHUNKS_PER_DOCUMENT = 400;

export async function reindexPatient(ctx: MutationCtx, patient: Doc<"patients">) {
  const old = await ctx.db
    .query("knowledgeChunks")
    .withIndex("by_patient", (q) => q.eq("patientId", patient._id))
    .collect();
  for (const chunk of old) {
    if (chunk.sourceType === "patient") await ctx.db.delete(chunk._id);
  }
  const now = Date.now();
  for (const section of patientSections(patient)) {
    for (const text of chunkText(section.text, 1500, 0)) {
      await ctx.db.insert("knowledgeChunks", {
        userId: patient.userId,
        sourceType: "patient",
        patientId: patient._id,
        title: section.title,
        text,
        updatedAt: now,
      });
    }
  }
}

export async function indexConsultation(ctx: MutationCtx, consultation: Doc<"consultations">, patient: Doc<"patients">) {
  const old = await ctx.db
    .query("knowledgeChunks")
    .withIndex("by_consultation", (q) => q.eq("consultationId", consultation._id))
    .collect();
  for (const chunk of old) await ctx.db.delete(chunk._id);
  const date = new Date(consultation.createdAt).toISOString().slice(0, 10);
  const label = patientLabel(patient);
  const lines = [
    `Consultation ${date} - patient ${label}`,
    consultation.diagnosis && `Diagnosis: ${consultation.diagnosis}.`,
    consultation.symptoms.length > 0 &&
      `Symptoms: ${consultation.symptoms.map((s) => `${s.name}${s.days ? ` (${s.days} days)` : ""}`).join("; ")}.`,
    consultation.prescriptions.length > 0 &&
      `Prescriptions: ${consultation.prescriptions.map((r) => `${r.name} ${r.dosage} ${r.timesPerDay}x/day`).join("; ")}.`,
    consultation.notes && `Notes: ${consultation.notes}`,
    consultation.aiReview && `AI review: ${consultation.aiReview}`,
  ].filter(Boolean);
  for (const text of chunkText(lines.join("\n"))) {
    await ctx.db.insert("knowledgeChunks", {
      userId: consultation.userId,
      sourceType: "consultation",
      patientId: patient._id,
      consultationId: consultation._id,
      title: `Consultation ${date} - ${label}`,
      text,
      updatedAt: Date.now(),
    });
  }
}

/** Replaces a document's chunks. Returns the number of chunks written. */
export async function reindexDocument(ctx: MutationCtx, document: Doc<"documents">, text: string): Promise<number> {
  await deleteChunks(ctx, "by_document", document._id);
  const chunks = chunkText(text).slice(0, MAX_CHUNKS_PER_DOCUMENT);
  const now = Date.now();
  for (const [i, chunk] of chunks.entries()) {
    await ctx.db.insert("knowledgeChunks", {
      userId: document.userId,
      sourceType: "document",
      patientId: document.patientId,
      documentId: document._id,
      title: `${document.name} (part ${i + 1}/${chunks.length})`,
      text: `Document "${document.name}"\n${chunk}`,
      updatedAt: now,
    });
  }
  return chunks.length;
}

export async function deleteChunks(
  ctx: MutationCtx,
  index: "by_document" | "by_patient" | "by_consultation",
  id: Id<"documents"> | Id<"patients"> | Id<"consultations">,
) {
  const rows =
    index === "by_document"
      ? await ctx.db.query("knowledgeChunks").withIndex("by_document", (q) => q.eq("documentId", id as Id<"documents">)).collect()
      : index === "by_patient"
        ? await ctx.db.query("knowledgeChunks").withIndex("by_patient", (q) => q.eq("patientId", id as Id<"patients">)).collect()
        : await ctx.db
            .query("knowledgeChunks")
            .withIndex("by_consultation", (q) => q.eq("consultationId", id as Id<"consultations">))
            .collect();
  for (const row of rows) await ctx.db.delete(row._id);
}
