/**
 * Demographic and course profiles used as priors by the predictor (convex/lib/predictor.ts).
 *
 * These are coarse, approximate figures for demonstration, NOT validated epidemiology:
 *   prevalence  1 = rare ... 5 = very common in a general outpatient population
 *   sex         the condition only occurs in that sex
 *   minAge/maxAge  outside this range the condition is very unlikely
 *   typicalAge  [from, to] where most cases present; outside it the prior is halved
 *   course      "acute" (days-weeks), "chronic" (months-years) or "either"
 *   urgent      needs same-day / emergency assessment when suspected
 *   silent      usually symptom-free and diagnosed by measurement or labs, so symptoms alone
 *               should rarely rank it first (its prior is reduced)
 *
 * `aliasOf` marks duplicate rows in data/diseases.ts so they are not ranked separately.
 */
export interface DiseaseProfile {
  prevalence: 1 | 2 | 3 | 4 | 5;
  course: "acute" | "chronic" | "either";
  sex?: "female" | "male";
  minAge?: number;
  maxAge?: number;
  typicalAge?: [number, number];
  urgent?: boolean;
  silent?: boolean;
  aliasOf?: string;
}

export const diseaseProfiles: Record<string, DiseaseProfile> = {
  "Common Cold": { prevalence: 5, course: "acute" },
  Influenza: { prevalence: 4, course: "acute" },
  "COVID-19": { prevalence: 4, course: "acute" },
  Asthma: { prevalence: 4, course: "chronic" },
  COPD: { prevalence: 3, course: "chronic", minAge: 35, typicalAge: [50, 95] },
  Pneumonia: { prevalence: 3, course: "acute" },
  Bronchitis: { prevalence: 4, course: "either" },
  Hypertension: { prevalence: 5, course: "chronic", typicalAge: [35, 100], silent: true },
  "Coronary Artery Disease": { prevalence: 3, course: "chronic", minAge: 25, typicalAge: [45, 100] },
  "Heart Failure": { prevalence: 3, course: "chronic", minAge: 18, typicalAge: [55, 100] },
  "Atrial Fibrillation": { prevalence: 3, course: "either", minAge: 18, typicalAge: [55, 100] },
  Stroke: { prevalence: 2, course: "acute", minAge: 18, typicalAge: [55, 100], urgent: true },
  "Peripheral Artery Disease": { prevalence: 2, course: "chronic", minAge: 40, typicalAge: [55, 100] },
  "Type 2 Diabetes": { prevalence: 5, course: "chronic", minAge: 10, typicalAge: [35, 90] },
  "Type 1 Diabetes": { prevalence: 2, course: "chronic", typicalAge: [3, 40] },
  Hypothyroidism: { prevalence: 4, course: "chronic", typicalAge: [30, 85] },
  Hyperthyroidism: { prevalence: 2, course: "chronic", typicalAge: [20, 60] },
  Osteoarthritis: { prevalence: 4, course: "chronic", minAge: 30, typicalAge: [50, 100] },
  "Rheumatoid Arthritis": { prevalence: 2, course: "chronic", minAge: 16, typicalAge: [30, 70] },
  Osteoporosis: { prevalence: 3, course: "chronic", minAge: 40, typicalAge: [55, 100], silent: true },
  Gout: { prevalence: 3, course: "either", minAge: 18, typicalAge: [35, 90] },
  Migraine: { prevalence: 4, course: "either", typicalAge: [12, 55] },
  Epilepsy: { prevalence: 2, course: "chronic" },
  "Parkinson's Disease": { prevalence: 2, course: "chronic", minAge: 35, typicalAge: [55, 100] },
  "Alzheimer's Disease": { prevalence: 2, course: "chronic", minAge: 45, typicalAge: [65, 110] },
  "Multiple Sclerosis": { prevalence: 1, course: "chronic", minAge: 12, typicalAge: [20, 50] },
  Depression: { prevalence: 4, course: "chronic", minAge: 8 },
  "Anxiety Disorder": { prevalence: 4, course: "chronic", minAge: 6 },
  "Bipolar Disorder": { prevalence: 2, course: "chronic", minAge: 12, typicalAge: [15, 45] },
  PTSD: { prevalence: 2, course: "chronic", minAge: 6 },
  Gastritis: { prevalence: 4, course: "either" },
  GERD: { prevalence: 5, course: "chronic" },
  "Peptic Ulcer": { prevalence: 3, course: "either", minAge: 16 },
  IBS: { prevalence: 4, course: "chronic", typicalAge: [15, 50] },
  IBD: { prevalence: 2, course: "chronic", typicalAge: [15, 40] },
  "Celiac Disease": { prevalence: 2, course: "chronic" },
  "Hepatitis B": { prevalence: 2, course: "either" },
  "Chronic Kidney Disease": { prevalence: 3, course: "chronic", minAge: 18, typicalAge: [50, 100] },
  "Urinary Tract Infection": { prevalence: 5, course: "acute" },
  "Kidney Stones": { prevalence: 3, course: "acute", minAge: 15, typicalAge: [25, 65] },
  Anemia: { prevalence: 4, course: "either" },
  Leukemia: { prevalence: 1, course: "either" },
  Lymphoma: { prevalence: 1, course: "chronic" },
  Eczema: { prevalence: 4, course: "chronic" },
  Psoriasis: { prevalence: 3, course: "chronic" },
  Acne: { prevalence: 5, course: "chronic", typicalAge: [11, 30] },
  Dermatitis: { prevalence: 4, course: "either" },
  "Allergic Rhinitis": { prevalence: 5, course: "either" },
  Sinusitis: { prevalence: 4, course: "either" },
  Conjunctivitis: { prevalence: 4, course: "acute" },
  Glaucoma: { prevalence: 2, course: "chronic", minAge: 35, typicalAge: [55, 100] },
  Cataracts: { prevalence: 3, course: "chronic", minAge: 40, typicalAge: [60, 110] },
  Hypoglycemia: { prevalence: 2, course: "acute", urgent: true },
  Hyperlipidemia: { prevalence: 5, course: "chronic", minAge: 18, typicalAge: [35, 100], silent: true },
  Hernia: { prevalence: 3, course: "either" },
  "Thyroid Nodule": { prevalence: 3, course: "chronic", minAge: 18 },
  Fibromyalgia: { prevalence: 2, course: "chronic", minAge: 18, typicalAge: [25, 60] },
  "Carpal Tunnel Syndrome": { prevalence: 3, course: "chronic", minAge: 18, typicalAge: [30, 65] },
  Sciatica: { prevalence: 3, course: "either", minAge: 18, typicalAge: [30, 65] },
  Insomnia: { prevalence: 5, course: "either" },
  Obesity: { prevalence: 5, course: "chronic" },
  "Metabolic Syndrome": { prevalence: 4, course: "chronic", minAge: 18, typicalAge: [35, 85], silent: true },
  Anaphylaxis: { prevalence: 1, course: "acute", urgent: true },
  "HIV/AIDS": { prevalence: 1, course: "chronic" },
  Tuberculosis: { prevalence: 1, course: "chronic" },
  Malaria: { prevalence: 1, course: "acute", urgent: true },
  "Hepatitis C": { prevalence: 1, course: "chronic", minAge: 15 },
  "Lyme Disease": { prevalence: 1, course: "either" },
  Rash: { prevalence: 1, course: "either", aliasOf: "Dermatitis" },
  Vertigo: { prevalence: 3, course: "either" },
  Menopause: { prevalence: 4, course: "chronic", sex: "female", minAge: 38, typicalAge: [45, 58] },
  PCOS: { prevalence: 3, course: "chronic", sex: "female", minAge: 12, maxAge: 55, typicalAge: [15, 45] },
  Endometriosis: { prevalence: 3, course: "chronic", sex: "female", minAge: 12, maxAge: 55, typicalAge: [20, 45] },
  UTI: { prevalence: 1, course: "acute", aliasOf: "Urinary Tract Infection" },
  Prostatitis: { prevalence: 3, course: "either", sex: "male", minAge: 15, typicalAge: [30, 60] },
  Appendicitis: { prevalence: 3, course: "acute", typicalAge: [5, 40], urgent: true },
  Gallstones: { prevalence: 3, course: "either", typicalAge: [30, 70] },
  Pancreatitis: { prevalence: 2, course: "acute", minAge: 12, urgent: true },
  Anxiety: { prevalence: 1, course: "either", aliasOf: "Anxiety Disorder" },
  "Panic Disorder": { prevalence: 3, course: "chronic", typicalAge: [15, 45] },
  OCD: { prevalence: 2, course: "chronic", minAge: 6 },
  Schizophrenia: { prevalence: 1, course: "chronic", minAge: 12, typicalAge: [16, 40] },
  "Autism Spectrum Disorder": { prevalence: 2, course: "chronic", typicalAge: [2, 30] },
  ADHD: { prevalence: 3, course: "chronic", typicalAge: [5, 30] },
};
