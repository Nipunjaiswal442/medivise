/**
 * Medication safety screening: allergy conflicts and known drug interactions.
 * Uses the small rule tables in convex/data/drugSafety.ts - a screening aid, not a complete
 * interaction checker. "No warnings" never means a combination is safe.
 */
import { allergyClassAliases, allergyClasses, interactionRules, pregnancyRules, renalRules } from "../data/drugSafety";

export interface SafetyWarning {
  kind: "allergy" | "interaction" | "pregnancy" | "renal";
  severity: "major" | "moderate";
  drugs: string[];
  message: string;
}

const lower = (s: string) => s.toLowerCase().trim();

function allergyFragments(substance: string): { label: string; fragments: string[] } {
  const s = lower(substance);
  const cls = allergyClasses[s] ? s : allergyClassAliases[s];
  if (cls) return { label: cls, fragments: allergyClasses[cls] };
  // A named drug ("amoxicillin") also implies its class ("penicillin")
  for (const [name, fragments] of Object.entries(allergyClasses)) {
    if (fragments.some((f) => f.length >= 4 && s.includes(f))) return { label: `${s} (${name} class)`, fragments };
  }
  return { label: s, fragments: [s] };
}

/** Drugs (current or proposed) that conflict with a recorded allergy. */
export function checkAllergies(drugs: string[], allergies: { substance: string; reaction?: string }[]): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];
  for (const allergy of allergies) {
    if (!allergy.substance.trim()) continue;
    const { label, fragments } = allergyFragments(allergy.substance);
    for (const drug of drugs) {
      const d = lower(drug);
      if (fragments.some((f) => f.length >= 3 && d.includes(f))) {
        warnings.push({
          kind: "allergy",
          severity: "major",
          drugs: [drug],
          message: `${drug} conflicts with recorded allergy to ${label}${allergy.reaction ? ` (${allergy.reaction})` : ""}`,
        });
      }
    }
  }
  return warnings;
}

/**
 * Interactions between any two drugs in the list. When `proposed` is given, only pairs involving
 * at least one proposed drug are reported (the current regimen's own interactions are known).
 */
export function checkInteractions(current: string[], proposed: string[] = []): SafetyWarning[] {
  const all = [...new Set([...current, ...proposed].map((d) => d.trim()).filter(Boolean))];
  const isProposed = new Set(proposed.map(lower));
  const matches = (drug: string, fragments: string[]) => fragments.some((f) => lower(drug).includes(f));
  const warnings: SafetyWarning[] = [];
  const seen = new Set<string>();
  for (const rule of interactionRules) {
    for (const x of all) {
      if (!matches(x, rule.a)) continue;
      for (const y of all) {
        if (x === y || !matches(y, rule.b)) continue;
        if (proposed.length > 0 && !isProposed.has(lower(x)) && !isProposed.has(lower(y))) continue;
        const key = [x, y].sort().join("|") + rule.effect;
        if (seen.has(key)) continue;
        seen.add(key);
        warnings.push({ kind: "interaction", severity: rule.severity, drugs: [x, y], message: `${x} + ${y}: ${rule.effect}` });
      }
    }
  }
  return warnings;
}

export interface PatientSafetyContext {
  pregnant?: boolean;
  /** Most recent eGFR, mL/min/1.73m2. */
  egfr?: number;
}

/** Pregnancy and kidney-function contraindications. */
export function checkContraindications(drugs: string[], context: PatientSafetyContext): SafetyWarning[] {
  const warnings: SafetyWarning[] = [];
  for (const drug of drugs) {
    const d = lower(drug);
    if (context.pregnant) {
      for (const rule of pregnancyRules) {
        if (rule.match.some((f) => d.includes(f))) {
          warnings.push({ kind: "pregnancy", severity: rule.severity, drugs: [drug], message: `${drug} in pregnancy: ${rule.message}` });
          break;
        }
      }
    }
    if (context.egfr !== undefined) {
      // the strictest threshold that applies wins
      const rule = renalRules
        .filter((r) => context.egfr! < r.belowEgfr && r.match.some((f) => d.includes(f)))
        .sort((a, b) => a.belowEgfr - b.belowEgfr)[0];
      if (rule) {
        warnings.push({ kind: "renal", severity: rule.severity, drugs: [drug], message: `${drug} with eGFR ${context.egfr}: ${rule.message}` });
      }
    }
  }
  return warnings;
}

/** Pregnancy status and latest eGFR as recorded on a patient. */
export function patientSafetyContext(p: {
  condition?: string;
  chronicConditions?: string[];
  notes?: string;
  labResults?: { test: string; value: string; date: string }[];
}): PatientSafetyContext {
  const text = [p.condition, ...(p.chronicConditions ?? []), p.notes].filter(Boolean).join(" ");
  const pregnant = /\bpregnan(t|cy)\b/i.test(text) && !/not pregnant|post-?partum|pregnancy test (was )?negative|negative pregnancy/i.test(text);
  const egfrLabs = (p.labResults ?? [])
    .filter((l) => /egfr/i.test(l.test) && Number.isFinite(parseFloat(l.value)))
    .sort((a, b) => b.date.localeCompare(a.date));
  return { pregnant, egfr: egfrLabs.length ? parseFloat(egfrLabs[0].value) : undefined };
}

export function screenMedications(args: {
  current: string[];
  proposed?: string[];
  allergies: { substance: string; reaction?: string }[];
  context?: PatientSafetyContext;
}): SafetyWarning[] {
  const proposed = args.proposed ?? [];
  const toCheck = proposed.length > 0 ? proposed : args.current;
  return [
    ...checkAllergies(toCheck, args.allergies),
    ...checkContraindications(toCheck, args.context ?? {}),
    ...checkInteractions(args.current, proposed),
  ].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "major" ? -1 : 1));
}
