import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../_generated/server";
import { diseases } from "../data/diseases";
import { medicines } from "../data/medicines";
import { diseaseMedicineMappings, diseaseSymptomMappings } from "../data/mappings";
import { symptoms } from "../data/symptoms";

const KNOWLEDGE_TABLES = [
  "diseaseMedicines",
  "diseaseSymptoms",
  "medicines",
  "symptoms",
  "diseases",
] as const;

/**
 * Loads the medical knowledge base. Run it once per deployment:
 *   npx convex run functions/seed:seedDatabase            (dev deployment)
 *   npx convex run --prod functions/seed:seedDatabase     (production deployment)
 * It refuses to run twice; pass '{"reset":true}' to wipe and reload the knowledge tables
 * (patients, consultations and predictions are never touched).
 */
export const seedDatabase = internalMutation({
  args: { reset: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("diseases").first();
    if (existing && !args.reset) {
      return { seeded: false, message: "Already seeded. Pass {\"reset\": true} to reload." };
    }
    if (args.reset) {
      for (const table of KNOWLEDGE_TABLES) {
        for (const row of await ctx.db.query(table).collect()) await ctx.db.delete(row._id);
      }
    }

    const now = Date.now();
    const timestamps = { createdAt: now, updatedAt: now };

    const diseaseIds = new Map<string, Id<"diseases">>();
    for (const d of diseases) {
      if (!diseaseIds.has(d.name)) {
        diseaseIds.set(d.name, await ctx.db.insert("diseases", { ...d, ...timestamps }));
      }
    }

    const symptomIds = new Map<string, Id<"symptoms">>();
    for (const s of symptoms) {
      if (!symptomIds.has(s.name)) {
        symptomIds.set(s.name, await ctx.db.insert("symptoms", { ...s, ...timestamps }));
      }
    }

    const medicineIds = new Map<string, Id<"medicines">>();
    for (const m of medicines) {
      if (!medicineIds.has(m.name)) {
        medicineIds.set(m.name, await ctx.db.insert("medicines", { ...m, ...timestamps }));
      }
    }

    // Links whose names do not exist are reported, never silently dropped.
    const skippedLinks: string[] = [];
    const withSymptoms = new Set<string>();
    const withMedicines = new Set<string>();
    let diseaseSymptomCount = 0;
    let diseaseMedicineCount = 0;
    let notes = 0;

    for (const m of diseaseSymptomMappings) {
      const diseaseId = diseaseIds.get(m.disease);
      const symptomId = symptomIds.get(m.symptom);
      if (!diseaseId || !symptomId) {
        skippedLinks.push(`${m.disease} -> symptom "${m.symptom}"`);
        continue;
      }
      await ctx.db.insert("diseaseSymptoms", { diseaseId, symptomId, weight: m.weight });
      withSymptoms.add(m.disease);
      diseaseSymptomCount++;
    }
    for (const m of diseaseMedicineMappings) {
      if (!m.medicine || m.confidence === undefined) {
        notes++; // rows such as { disease, note } carry advice text, not a medicine link
        continue;
      }
      const diseaseId = diseaseIds.get(m.disease);
      const medicineId = medicineIds.get(m.medicine);
      if (!diseaseId || !medicineId) {
        skippedLinks.push(`${m.disease} -> medicine "${m.medicine}"`);
        continue;
      }
      await ctx.db.insert("diseaseMedicines", { diseaseId, medicineId, confidence: m.confidence });
      withMedicines.add(m.disease);
      diseaseMedicineCount++;
    }

    return {
      seeded: true,
      inserted: {
        diseases: diseaseIds.size,
        symptoms: symptomIds.size,
        medicines: medicineIds.size,
        diseaseSymptoms: diseaseSymptomCount,
        diseaseMedicines: diseaseMedicineCount,
      },
      ignoredNotes: notes,
      skippedLinks,
      diseasesWithoutSymptoms: [...diseaseIds.keys()].filter((d) => !withSymptoms.has(d)),
      diseasesWithoutMedicines: [...diseaseIds.keys()].filter((d) => !withMedicines.has(d)),
    };
  },
});
