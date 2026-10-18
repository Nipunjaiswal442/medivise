/**
 * Screening tables for allergy conflicts and drug interactions (convex/lib/clinical.ts).
 * A small set of well-known, high-value checks for decision support. It is NOT a complete
 * interaction database; absence of a warning does not mean a combination is safe.
 */

/** Allergy class -> lower-case name fragments of drugs in that class (incl. common cross-reactivity). */
export const allergyClasses: Record<string, string[]> = {
  penicillin: ["penicillin", "amoxicillin", "ampicillin", "flucloxacillin", "piperacillin", "co-amoxiclav"],
  cephalosporin: ["cef", "cephalexin", "ceph"],
  sulfa: ["sulfa", "sulfamethoxazole", "sulfasalazine", "co-trimoxazole"],
  nsaid: ["ibuprofen", "naproxen", "diclofenac", "aspirin", "celecoxib", "ketorolac"],
  aspirin: ["aspirin"],
  macrolide: ["azithromycin", "clarithromycin", "erythromycin"],
  fluoroquinolone: ["ciprofloxacin", "levofloxacin", "moxifloxacin"],
  tetracycline: ["doxycycline", "tetracycline", "minocycline"],
  "ace inhibitor": ["lisinopril", "enalapril", "ramipril", "perindopril", "ace inhibitor"],
  statin: ["atorvastatin", "simvastatin", "rosuvastatin", "pravastatin"],
  opioid: ["codeine", "morphine", "tramadol", "oxycodone", "hydromorphone"],
  codeine: ["codeine"],
  benzodiazepine: ["diazepam", "lorazepam", "alprazolam", "clonazepam"],
};

/** Words in an allergy entry that identify a class above. */
export const allergyClassAliases: Record<string, string> = {
  penicillins: "penicillin",
  "beta-lactam": "penicillin",
  "beta lactam": "penicillin",
  cephalosporins: "cephalosporin",
  sulfonamide: "sulfa",
  sulfonamides: "sulfa",
  sulpha: "sulfa",
  nsaids: "nsaid",
  "ace inhibitors": "ace inhibitor",
  statins: "statin",
  opioids: "opioid",
  opiates: "opioid",
  macrolides: "macrolide",
  quinolones: "fluoroquinolone",
};

export interface InteractionRule {
  a: string[];
  b: string[];
  severity: "major" | "moderate";
  effect: string;
}

/** Each side lists lower-case name fragments; a rule fires when one drug matches `a` and another `b`. */
export const interactionRules: InteractionRule[] = [
  { a: ["warfarin"], b: ["aspirin", "ibuprofen", "naproxen", "diclofenac", "clopidogrel"], severity: "major", effect: "Increased bleeding risk" },
  { a: ["warfarin"], b: ["ciprofloxacin", "metronidazole", "clarithromycin", "fluconazole", "amiodarone"], severity: "major", effect: "Raised INR - monitor closely or choose an alternative" },
  { a: ["lisinopril", "enalapril", "ramipril", "losartan", "valsartan", "ace inhibitor", "arb"], b: ["spironolactone", "potassium"], severity: "major", effect: "Risk of hyperkalaemia - monitor potassium" },
  { a: ["sertraline", "fluoxetine", "escitalopram", "paroxetine", "fluvoxamine", "duloxetine"], b: ["tramadol", "linezolid", "sumatriptan"], severity: "major", effect: "Risk of serotonin syndrome" },
  { a: ["sertraline", "fluoxetine", "escitalopram", "paroxetine", "fluvoxamine"], b: ["ibuprofen", "naproxen", "aspirin", "diclofenac"], severity: "moderate", effect: "Increased GI bleeding risk - consider PPI cover" },
  { a: ["simvastatin"], b: ["clarithromycin", "erythromycin", "itraconazole", "amiodarone"], severity: "major", effect: "Raised statin levels - myopathy / rhabdomyolysis risk" },
  { a: ["methotrexate"], b: ["trimethoprim", "co-trimoxazole", "ibuprofen", "naproxen"], severity: "major", effect: "Methotrexate toxicity (marrow suppression)" },
  { a: ["lithium"], b: ["ibuprofen", "naproxen", "diclofenac", "lisinopril", "enalapril", "ramipril", "losartan", "hydrochlorothiazide", "furosemide"], severity: "major", effect: "Raised lithium levels - toxicity risk" },
  { a: ["clopidogrel"], b: ["omeprazole", "esomeprazole"], severity: "moderate", effect: "Reduced antiplatelet effect - prefer pantoprazole" },
  { a: ["levothyroxine"], b: ["calcium", "iron", "antacid"], severity: "moderate", effect: "Reduced levothyroxine absorption - separate doses by 4 hours" },
  { a: ["sildenafil", "tadalafil"], b: ["nitrate", "nitroglycerin", "isosorbide"], severity: "major", effect: "Severe hypotension" },
  { a: ["diazepam", "lorazepam", "alprazolam", "zolpidem"], b: ["morphine", "oxycodone", "codeine", "tramadol"], severity: "major", effect: "Additive respiratory depression and sedation" },
  { a: ["metformin"], b: ["iodinated contrast", "contrast"], severity: "moderate", effect: "Hold metformin around iodinated contrast if eGFR is reduced" },
  { a: ["allopurinol"], b: ["azathioprine", "mercaptopurine"], severity: "major", effect: "Marrow toxicity - azathioprine dose must be reduced" },
  { a: ["amlodipine"], b: ["simvastatin"], severity: "moderate", effect: "Limit simvastatin to 20 mg daily" },
  { a: ["ciprofloxacin", "levofloxacin"], b: ["prednisone", "prednisolone", "hydrocortisone"], severity: "moderate", effect: "Increased tendon rupture risk" },
];
