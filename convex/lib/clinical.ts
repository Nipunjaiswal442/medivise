/**
 * Medication safety screening: allergy conflicts and known drug interactions.
 * Uses the small rule tables in convex/data/drugSafety.ts - a screening aid, not a complete
 * interaction checker. "No warnings" never means a combination is safe.
 */
import { allergyClassAliases, allergyClasses, interactionRules } from "../data/drugSafety";

export interface SafetyWarning {
  kind: "allergy" | "interaction";
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

export function screenMedications(args: {
  current: string[];
  proposed?: string[];
  allergies: { substance: string; reaction?: string }[];
}): SafetyWarning[] {
  const proposed = args.proposed ?? [];
  const toCheck = proposed.length > 0 ? proposed : args.current;
  return [...checkAllergies(toCheck, args.allergies), ...checkInteractions(args.current, proposed)].sort(
    (a, b) => (a.severity === b.severity ? 0 : a.severity === "major" ? -1 : 1),
  );
}
