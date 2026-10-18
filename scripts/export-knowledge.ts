/**
 * Exports the Convex seed data to ml/knowledge.json so the Python service scores against exactly
 * the same diseases, symptoms and weights as the database (one source of truth).
 *
 *   npm run export:ml
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { diseases } from "../convex/data/diseases";
import { diseaseSymptomMappings } from "../convex/data/mappings";
import { symptoms } from "../convex/data/symptoms";

const symptomNames = [...new Set(symptoms.map((s) => s.name))];
const diseaseNames = [...new Set(diseases.map((d) => d.name))];

const known = new Set(symptomNames);
const knownDiseases = new Set(diseaseNames);
const links = diseaseSymptomMappings
  .filter((m) => known.has(m.symptom) && knownDiseases.has(m.disease))
  .map((m) => ({ disease: m.disease, symptom: m.symptom, weight: m.weight }));

const out = resolve(dirname(fileURLToPath(import.meta.url)), "../ml/knowledge.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify({ diseases: diseaseNames, symptoms: symptomNames, links }, null, 1) + "\n");
console.log(`wrote ${out}: ${diseaseNames.length} diseases, ${symptomNames.length} symptoms, ${links.length} links`);
