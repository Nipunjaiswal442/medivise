import { mutation } from "convex/server";
import { diseases } from "./data/diseases";
import { symptoms } from "./data/symptoms";
import { medicines } from "./data/medicines";
import { buildMappings } from "./data/mappings";

export const seedDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Insert diseases
    const diseaseMap: Record<string, string> = {};
    for (const d of diseases) {
      const inserted = await ctx.db.insert("diseases", {
        ...d,
        createdAt: now,
        updatedAt: now,
      });
      diseaseMap[d.name] = inserted._id;
    }

    // Insert symptoms
    const symptomMap: Record<string, string> = {};
    for (const s of symptoms) {
      const inserted = await ctx.db.insert("symptoms", {
        ...s,
        createdAt: now,
        updatedAt: now,
      });
      symptomMap[s.name] = inserted._id;
    }

    // Insert medicines
    const medicineMap: Record<string, string> = {};
    for (const m of medicines) {
      const inserted = await ctx.db.insert("medicines", {
        ...m,
        createdAt: now,
        updatedAt: now,
      });
      medicineMap[m.name] = inserted._id;
    }

    // Build and insert disease-symptom links
    const { symptomLinks, medicineLinks } = buildMappings(
      diseaseMap,
      symptomMap,
      medicineMap
    );

    for (const link of symptomLinks) {
      if (link.diseaseId && link.symptomId) {
        await ctx.db.insert("diseaseSymptoms", link);
      }
    }

    // Build and insert disease-medicine links
    for (const link of medicineLinks) {
      if (link.diseaseId && link.medicineId) {
        await ctx.db.insert("diseaseMedicines", link);
      }
    }

    return {
      diseases: Object.keys(diseaseMap).length,
      symptoms: Object.keys(symptomMap).length,
      medicines: Object.keys(medicineMap).length,
      diseaseSymptoms: symptomLinks.length,
      diseaseMedicines: medicineLinks.length,
    };
  },
});
