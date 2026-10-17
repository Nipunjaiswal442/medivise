import { diseases } from "./diseases";
import { symptoms } from "./symptoms";
import { medicines } from "./medicines";

export const diseaseSymptomMappings = [
  // Common Cold
  { disease: "Common Cold", symptom: "Cough", weight: 0.8 },
  { disease: "Common Cold", symptom: "Runny nose", weight: 0.9 },
  { disease: "Common Cold", symptom: "Sore throat", weight: 0.7 },
  { disease: "Common Cold", symptom: "Sneezing", weight: 0.8 },
  { disease: "Common Cold", symptom: "Nasal congestion", weight: 0.8 },
  { disease: "Common Cold", symptom: "Fatigue", weight: 0.5 },
  { disease: "Common Cold", symptom: "Headache", weight: 0.4 },
  { disease: "Common Cold", symptom: "Body aches", weight: 0.5 },

  // Influenza
  { disease: "Influenza", symptom: "Fever", weight: 0.9 },
  { disease: "Influenza", symptom: "Cough", weight: 0.8 },
  { disease: "Influenza", symptom: "Fatigue", weight: 0.8 },
  { disease: "Influenza", symptom: "Body aches", weight: 0.8 },
  { disease: "Influenza", symptom: "Headache", weight: 0.7 },
  { disease: "Influenza", symptom: "Chills", weight: 0.8 },
  { disease: "Influenza", symptom: "Sore throat", weight: 0.5 },
  { disease: "Influenza", symptom: "Runny nose", weight: 0.4 },

  // COVID-19
  { disease: "COVID-19", symptom: "Fever", weight: 0.8 },
  { disease: "COVID-19", symptom: "Cough", weight: 0.8 },
  { disease: "COVID-19", symptom: "Shortness of breath", weight: 0.7 },
  { disease: "COVID-19", symptom: "Fatigue", weight: 0.7 },
  { disease: "COVID-19", symptom: "Loss of appetite", weight: 0.5 },
  { disease: "COVID-19", symptom: "Headache", weight: 0.5 },
  { disease: "COVID-19", symptom: "Sore throat", weight: 0.4 },
  { disease: "COVID-19", symptom: "Body aches", weight: 0.6 },

  // Asthma
  { disease: "Asthma", symptom: "Shortness of breath", weight: 0.9 },
  { disease: "Asthma", symptom: "Wheezing", weight: 0.9 },
  { disease: "Asthma", symptom: "Cough", weight: 0.7 },
  { disease: "Asthma", symptom: "Chest pain", weight: 0.5 },
  { disease: "Asthma", symptom: "Difficulty breathing", weight: 0.8 },

  // COPD
  { disease: "COPD", symptom: "Shortness of breath", weight: 0.9 },
  { disease: "COPD", symptom: "Cough", weight: 0.8 },
  { disease: "COPD", symptom: "Wheezing", weight: 0.7 },
  { disease: "COPD", symptom: "Fatigue", weight: 0.6 },
  { disease: "COPD", symptom: "Chest pain", weight: 0.4 },

  // Pneumonia
  { disease: "Pneumonia", symptom: "Fever", weight: 0.8 },
  { disease: "Pneumonia", symptom: "Cough", weight: 0.9 },
  { disease: "Pneumonia", symptom: "Shortness of breath", weight: 0.8 },
  { disease: "Pneumonia", symptom: "Chest pain", weight: 0.7 },
  { disease: "Pneumonia", symptom: "Fatigue", weight: 0.6 },
  { disease: "Pneumonia", symptom: "Chills", weight: 0.6 },

  // Hypertension
  { disease: "Hypertension", symptom: "Headache", weight: 0.5 },
  { disease: "Hypertension", symptom: "Dizziness", weight: 0.4 },
  { disease: "Hypertension", symptom: "Chest pain", weight: 0.4 },
  { disease: "Hypertension", symptom: "Blurred vision", weight: 0.3 },
  { disease: "Hypertension", symptom: "Fatigue", weight: 0.3 },

  // Coronary Artery Disease
  { disease: "Coronary Artery Disease", symptom: "Chest pain", weight: 0.9 },
  { disease: "Coronary Artery Disease", symptom: "Shortness of breath", weight: 0.7 },
  { disease: "Coronary Artery Disease", symptom: "Fatigue", weight: 0.5 },
  { disease: "Coronary Artery Disease", symptom: "Dizziness", weight: 0.4 },
  { disease: "Coronary Artery Disease", symptom: "Palpitations", weight: 0.5 },

  // Heart Failure
  { disease: "Heart Failure", symptom: "Shortness of breath", weight: 0.8 },
  { disease: "Heart Failure", symptom: "Fatigue", weight: 0.8 },
  { disease: "Heart Failure", symptom: "Swollen ankles", weight: 0.7 },
  { disease: "Heart Failure", symptom: "Chest pain", weight: 0.5 },
  { disease: "Heart Failure", symptom: "Palpitations", weight: 0.5 },

  // Atrial Fibrillation
  { disease: "Atrial Fibrillation", symptom: "Palpitations", weight: 0.9 },
  { disease: "Atrial Fibrillation", symptom: "Dizziness", weight: 0.6 },
  { disease: "Atrial Fibrillation", symptom: "Shortness of breath", weight: 0.6 },
  { disease: "Atrial Fibrillation", symptom: "Fatigue", weight: 0.5 },
  { disease: "Atrial Fibrillation", symptom: "Chest pain", weight: 0.4 },

  // Stroke
  { disease: "Stroke", symptom: "Headache", weight: 0.5 },
  { disease: "Stroke", symptom: "Dizziness", weight: 0.6 },
  { disease: "Stroke", symptom: "Confusion", weight: 0.7 },
  { disease: "Stroke", symptom: "Numbness", weight: 0.7 },
  { disease: "Stroke", symptom: "Weakness", weight: 0.7 },
  { disease: "Stroke", symptom: "Difficulty speaking", weight: 0.6 },

  // Type 2 Diabetes
  { disease: "Type 2 Diabetes", symptom: "Increased thirst", weight: 0.8 },
  { disease: "Type 2 Diabetes", symptom: "Frequent urination", weight: 0.8 },
  { disease: "Type 2 Diabetes", symptom: "Fatigue", weight: 0.6 },
  { disease: "Type 2 Diabetes", symptom: "Blurred vision", weight: 0.5 },
  { disease: "Type 2 Diabetes", symptom: "Weight loss", weight: 0.4 },
  { disease: "Type 2 Diabetes", symptom: "Delayed wound healing", weight: 0.5 },

  // Type 1 Diabetes
  { disease: "Type 1 Diabetes", symptom: "Increased thirst", weight: 0.8 },
  { disease: "Type 1 Diabetes", symptom: "Frequent urination", weight: 0.8 },
  { disease: "Type 1 Diabetes", symptom: "Weight loss", weight: 0.7 },
  { disease: "Type 1 Diabetes", symptom: "Fatigue", weight: 0.6 },
  { disease: "Type 1 Diabetes", symptom: "Increased appetite", weight: 0.5 },

  // Hypothyroidism
  { disease: "Hypothyroidism", symptom: "Fatigue", weight: 0.8 },
  { disease: "Hypothyroidism", symptom: "Weight gain", weight: 0.7 },
  { disease: "Hypothyroidism", symptom: "Cold hands and feet", weight: 0.6 },
  { disease: "Hypothyroidism", symptom: "Dry skin", weight: 0.5 },
  { disease: "Hypothyroidism", symptom: "Constipation", weight: 0.5 },
  { disease: "Hypothyroidism", symptom: "Depression", weight: 0.4 },

  // Hyperthyroidism
  { disease: "Hyperthyroidism", symptom: "Weight loss", weight: 0.7 },
  { disease: "Hyperthyroidism", symptom: "Palpitations", weight: 0.7 },
  { disease: "Hyperthyroidism", symptom: "Anxiety", weight: 0.6 },
  { disease: "Hyperthyroidism", symptom: "Excessive sweating", weight: 0.6 },
  { disease: "Hyperthyroidism", symptom: "Tremors", weight: 0.6 },
  { disease: "Hyperthyroidism", symptom: "Fatigue", weight: 0.4 },

  // Osteoarthritis
  { disease: "Osteoarthritis", symptom: "Joint pain", weight: 0.9 },
  { disease: "Osteoarthritis", symptom: "Stiffness", weight: 0.7 },
  { disease: "Osteoarthritis", symptom: "Swelling", weight: 0.5 },
  { disease: "Osteoarthritis", symptom: "Reduced range of motion", weight: 0.6 },

  // Rheumatoid Arthritis
  { disease: "Rheumatoid Arthritis", symptom: "Joint pain", weight: 0.8 },
  { disease: "Rheumatoid Arthritis", symptom: "Swelling", weight: 0.7 },
  { disease: "Rheumatoid Arthritis", symptom: "Stiffness", weight: 0.7 },
  { disease: "Rheumatoid Arthritis", symptom: "Fatigue", weight: 0.6 },
  { disease: "Rheumatoid Arthritis", symptom: "Morning stiffness", weight: 0.8 },

  // Osteoporosis
  { disease: "Osteoporosis", symptom: "Back pain", weight: 0.5 },
  { disease: "Osteoporosis", symptom: "Bone fractures", weight: 0.6 },
  { disease: "Osteoporosis", symptom: "Loss of height", weight: 0.5 },
  { disease: "Osteoporosis", symptom: "Posture changes", weight: 0.4 },

  // Gout
  { disease: "Gout", symptom: "Joint pain", weight: 0.9 },
  { disease: "Gout", symptom: "Swelling", weight: 0.8 },
  { disease: "Gout", symptom: "Redness in joints", weight: 0.7 },
  { disease: "Gout", symptom: "Big toe pain", weight: 0.8 },

  // Migraine
  { disease: "Migraine", symptom: "Headache", weight: 0.9 },
  { disease: "Migraine", symptom: "Nausea", weight: 0.6 },
  { disease: "Migraine", symptom: "Vomiting", weight: 0.4 },
  { disease: "Migraine", symptom: "Blurred vision", weight: 0.5 },
  { disease: "Migraine", symptom: "Sensitivity to light", weight: 0.7 },
  { disease: "Migraine", symptom: "Dizziness", weight: 0.4 },

  // Depression
  { disease: "Depression", symptom: "Fatigue", weight: 0.6 },
  { disease: "Depression", symptom: "Insomnia", weight: 0.7 },
  { disease: "Depression", symptom: "Loss of appetite", weight: 0.5 },
  { disease: "Depression", symptom: "Weight loss", weight: 0.4 },
  { disease: "Depression", symptom: "Difficulty concentrating", weight: 0.5 },
  { disease: "Depression", symptom: "Hopelessness", weight: 0.8 },
  { disease: "Depression", symptom: "Loss of interest", weight: 0.8 },

  // Anxiety Disorder
  { disease: "Anxiety Disorder", symptom: "Anxiety", weight: 0.9 },
  { disease: "Anxiety Disorder", symptom: "Palpitations", weight: 0.6 },
  { disease: "Anxiety Disorder", symptom: "Sweating", weight: 0.5 },
  { disease: "Anxiety Disorder", symptom: "Tremors", weight: 0.5 },
  { disease: "Anxiety Disorder", symptom: "Insomnia", weight: 0.5 },
  { disease: "Anxiety Disorder", symptom: "Dizziness", weight: 0.4 },
  { disease: "Anxiety Disorder", symptom: "Shortness of breath", weight: 0.5 },

  // Gastritis
  { disease: "Gastritis", symptom: "Abdominal pain", weight: 0.8 },
  { disease: "Gastritis", symptom: "Nausea", weight: 0.7 },
  { disease: "Gastritis", symptom: "Vomiting", weight: 0.5 },
  { disease: "Gastritis", symptom: "Bloating", weight: 0.6 },
  { disease: "Gastritis", symptom: "Loss of appetite", weight: 0.5 },

  // GERD
  { disease: "GERD", symptom: "Heartburn", weight: 0.9 },
  { disease: "GERD", symptom: "Chest pain", weight: 0.5 },
  { disease: "GERD", symptom: "Difficulty swallowing", weight: 0.5 },
  { disease: "GERD", symptom: "Regurgitation", weight: 0.7 },
  { disease: "GERD", symptom: "Bloating", weight: 0.4 },

  // Peptic Ulcer
  { disease: "Peptic Ulcer", symptom: "Abdominal pain", weight: 0.8 },
  { disease: "Peptic Ulcer", symptom: "Nausea", weight: 0.5 },
  { disease: "Peptic Ulcer", symptom: "Bloating", weight: 0.5 },
  { disease: "Peptic Ulcer", symptom: "Heartburn", weight: 0.4 },
  { disease: "Peptic Ulcer", symptom: "Weight loss", weight: 0.4 },

  // IBS
  { disease: "IBS", symptom: "Abdominal pain", weight: 0.8 },
  { disease: "IBS", symptom: "Bloating", weight: 0.7 },
  { disease: "IBS", symptom: "Diarrhea", weight: 0.6 },
  { disease: "IBS", symptom: "Constipation", weight: 0.6 },
  { disease: "IBS", symptom: "Gas", weight: 0.5 },

  // Anemia
  { disease: "Anemia", symptom: "Fatigue", weight: 0.8 },
  { disease: "Anemia", symptom: "Pale skin", weight: 0.7 },
  { disease: "Anemia", symptom: "Shortness of breath", weight: 0.6 },
  { disease: "Anemia", symptom: "Dizziness", weight: 0.5 },
  { disease: "Anemia", symptom: "Cold hands and feet", weight: 0.4 },
  { disease: "Anemia", symptom: "Headache", weight: 0.3 },

  // UTI
  { disease: "Urinary Tract Infection", symptom: "Frequent urination", weight: 0.8 },
  { disease: "Urinary Tract Infection", symptom: "Painful urination", weight: 0.9 },
  { disease: "Urinary Tract Infection", symptom: "Abdominal pain", weight: 0.5 },
  { disease: "Urinary Tract Infection", symptom: "Blood in urine", weight: 0.4 },
  { disease: "Urinary Tract Infection", symptom: "Fever", weight: 0.3 },

  // Kidney Stones
  { disease: "Kidney Stones", symptom: "Abdominal pain", weight: 0.7 },
  { disease: "Kidney Stones", symptom: "Back pain", weight: 0.8 },
  { disease: "Kidney Stones", symptom: "Painful urination", weight: 0.5 },
  { disease: "Kidney Stones", symptom: "Blood in urine", weight: 0.6 },
  { disease: "Kidney Stones", symptom: "Nausea", weight: 0.4 },

  // Allergic Rhinitis
  { disease: "Allergic Rhinitis", symptom: "Sneezing", weight: 0.9 },
  { disease: "Allergic Rhinitis", symptom: "Runny nose", weight: 0.9 },
  { disease: "Allergic Rhinitis", symptom: "Nasal congestion", weight: 0.8 },
  { disease: "Allergic Rhinitis", symptom: "Itching", weight: 0.6 },
  { disease: "Allergic Rhinitis", symptom: "Watery eyes", weight: 0.6 },

  // Sinusitis
  { disease: "Sinusitis", symptom: "Nasal congestion", weight: 0.8 },
  { disease: "Sinusitis", symptom: "Facial pain", weight: 0.7 },
  { disease: "Sinusitis", symptom: "Headache", weight: 0.6 },
  { disease: "Sinusitis", symptom: "Post-nasal drip", weight: 0.6 },
  { disease: "Sinusitis", symptom: "Fever", weight: 0.3 },

  // Bronchitis
  { disease: "Bronchitis", symptom: "Cough", weight: 0.9 },
  { disease: "Bronchitis", symptom: "Shortness of breath", weight: 0.6 },
  { disease: "Bronchitis", symptom: "Chest pain", weight: 0.4 },
  { disease: "Bronchitis", symptom: "Fatigue", weight: 0.5 },
  { disease: "Bronchitis", symptom: "Fever", weight: 0.4 },

  // Insomnia
  { disease: "Insomnia", symptom: "Insomnia", weight: 0.9 },
  { disease: "Insomnia", symptom: "Fatigue", weight: 0.7 },
  { disease: "Insomnia", symptom: "Difficulty concentrating", weight: 0.5 },
  { disease: "Insomnia", symptom: "Irritability", weight: 0.5 },

  // Obesity
  { disease: "Obesity", symptom: "Weight gain", weight: 0.9 },
  { disease: "Obesity", symptom: "Shortness of breath", weight: 0.5 },
  { disease: "Obesity", symptom: "Fatigue", weight: 0.4 },
  { disease: "Obesity", symptom: "Joint pain", weight: 0.4 },

  // Hypoglycemia
  { disease: "Hypoglycemia", symptom: "Dizziness", weight: 0.6 },
  { disease: "Hypoglycemia", symptom: "Sweating", weight: 0.6 },
  { disease: "Hypoglycemia", symptom: "Tremors", weight: 0.6 },
  { disease: "Hypoglycemia", symptom: "Confusion", weight: 0.5 },
  { disease: "Hypoglycemia", symptom: "Weakness", weight: 0.5 },
  { disease: "Hypoglycemia", symptom: "Palpitations", weight: 0.4 },

  // Hyperlipidemia
  { disease: "Hyperlipidemia", symptom: "Chest pain", weight: 0.4 },
  { disease: "Hyperlipidemia", symptom: "Fatigue", weight: 0.3 },
  { disease: "Hyperlipidemia", symptom: "Shortness of breath", weight: 0.3 },

  // Eczema
  { disease: "Eczema", symptom: "Itching", weight: 0.8 },
  { disease: "Eczema", symptom: "Rash", weight: 0.8 },
  { disease: "Eczema", symptom: "Dry skin", weight: 0.6 },
  { disease: "Eczema", symptom: "Redness", weight: 0.6 },

  // Psoriasis
  { disease: "Psoriasis", symptom: "Rash", weight: 0.7 },
  { disease: "Psoriasis", symptom: "Itching", weight: 0.6 },
  { disease: "Psoriasis", symptom: "Scaly skin", weight: 0.7 },
  { disease: "Psoriasis", symptom: "Redness", weight: 0.5 },

  // Acne
  { disease: "Acne", symptom: "Rash", weight: 0.6 },
  { disease: "Acne", symptom: "Oily skin", weight: 0.6 },
  { disease: "Acne", symptom: "Pimples", weight: 0.8 },
  { disease: "Acne", symptom: "Redness", weight: 0.4 },

  // Conjunctivitis
  { disease: "Conjunctivitis", symptom: "Red eyes", weight: 0.8 },
  { disease: "Conjunctivitis", symptom: "Itching", weight: 0.6 },
  { disease: "Conjunctivitis", symptom: "Watery eyes", weight: 0.7 },
  { disease: "Conjunctivitis", symptom: "Eye discharge", weight: 0.6 },

  // Vertigo
  { disease: "Vertigo", symptom: "Dizziness", weight: 0.9 },
  { disease: "Vertigo", symptom: "Nausea", weight: 0.5 },
  { disease: "Vertigo", symptom: "Balance problems", weight: 0.7 },
  { disease: "Vertigo", symptom: "Vomiting", weight: 0.3 },

  // Menopause
  { disease: "Menopause", symptom: "Hot flashes", weight: 0.8 },
  { disease: "Menopause", symptom: "Night sweats", weight: 0.8 },
  { disease: "Menopause", symptom: "Irregular periods", weight: 0.7 },
  { disease: "Menopause", symptom: "Insomnia", weight: 0.5 },
  { disease: "Menopause", symptom: "Mood swings", weight: 0.5 },

  // PCOS
  { disease: "PCOS", symptom: "Irregular periods", weight: 0.8 },
  { disease: "PCOS", symptom: "Weight gain", weight: 0.5 },
  { disease: "PCOS", symptom: "Acne", weight: 0.5 },
  { disease: "PCOS", symptom: "Hair loss", weight: 0.4 },
  { disease: "PCOS", symptom: "Excessive hair growth", weight: 0.6 },

  // Appendicitis
  { disease: "Appendicitis", symptom: "Abdominal pain", weight: 0.9 },
  { disease: "Appendicitis", symptom: "Nausea", weight: 0.6 },
  { disease: "Appendicitis", symptom: "Vomiting", weight: 0.5 },
  { disease: "Appendicitis", symptom: "Fever", weight: 0.4 },
  { disease: "Appendicitis", symptom: "Loss of appetite", weight: 0.5 },

  // Gallstones
  { disease: "Gallstones", symptom: "Abdominal pain", weight: 0.8 },
  { disease: "Gallstones", symptom: "Nausea", weight: 0.5 },
  { disease: "Gallstones", symptom: "Vomiting", weight: 0.4 },
  { disease: "Gallstones", symptom: "Jaundice", weight: 0.3 },
  { disease: "Gallstones", symptom: "Bloating", weight: 0.4 },

  // Pancreatitis
  { disease: "Pancreatitis", symptom: "Abdominal pain", weight: 0.9 },
  { disease: "Pancreatitis", symptom: "Nausea", weight: 0.7 },
  { disease: "Pancreatitis", symptom: "Vomiting", weight: 0.6 },
  { disease: "Pancreatitis", symptom: "Fever", weight: 0.4 },
  { disease: "Pancreatitis", symptom: "Rapid pulse", weight: 0.3 },

  // Fibromyalgia
  { disease: "Fibromyalgia", symptom: "Body aches", weight: 0.8 },
  { disease: "Fibromyalgia", symptom: "Fatigue", weight: 0.7 },
  { disease: "Fibromyalgia", symptom: "Sleep problems", weight: 0.6 },
  { disease: "Fibromyalgia", symptom: "Headache", weight: 0.4 },
  { disease: "Fibromyalgia", symptom: "Depression", weight: 0.4 },

  // Carpal Tunnel Syndrome
  { disease: "Carpal Tunnel Syndrome", symptom: "Numbness", weight: 0.7 },
  { disease: "Carpal Tunnel Syndrome", symptom: "Tingling", weight: 0.7 },
  { disease: "Carpal Tunnel Syndrome", symptom: "Hand weakness", weight: 0.5 },
  { disease: "Carpal Tunnel Syndrome", symptom: "Wrist pain", weight: 0.6 },

  // Sciatica
  { disease: "Sciatica", symptom: "Back pain", weight: 0.7 },
  { disease: "Sciatica", symptom: "Leg pain", weight: 0.8 },
  { disease: "Sciatica", symptom: "Numbness", weight: 0.5 },
  { disease: "Sciatica", symptom: "Tingling", weight: 0.5 },

  // Panic Disorder
  { disease: "Panic Disorder", symptom: "Palpitations", weight: 0.7 },
  { disease: "Panic Disorder", symptom: "Sweating", weight: 0.6 },
  { disease: "Panic Disorder", symptom: "Tremors", weight: 0.5 },
  { disease: "Panic Disorder", symptom: "Shortness of breath", weight: 0.7 },
  { disease: "Panic Disorder", symptom: "Chest pain", weight: 0.5 },
  { disease: "Panic Disorder", symptom: "Dizziness", weight: 0.4 },

  // OCD
  { disease: "OCD", symptom: "Anxiety", weight: 0.6 },
  { disease: "OCD", symptom: "Repetitive thoughts", weight: 0.8 },
  { disease: "OCD", symptom: "Compulsive behaviors", weight: 0.8 },
  { disease: "OCD", symptom: "Distress", weight: 0.6 },

  // Schizophrenia
  { disease: "Schizophrenia", symptom: "Hallucinations", weight: 0.8 },
  { disease: "Schizophrenia", symptom: "Delusions", weight: 0.8 },
  { disease: "Schizophrenia", symptom: "Disorganized thinking", weight: 0.7 },
  { disease: "Schizophrenia", symptom: "Social withdrawal", weight: 0.5 },
  { disease: "Schizophrenia", symptom: "Flat affect", weight: 0.4 },

  // ADHD
  { disease: "ADHD", symptom: "Difficulty concentrating", weight: 0.8 },
  { disease: "ADHD", symptom: "Hyperactivity", weight: 0.8 },
  { disease: "ADHD", symptom: "Impulsivity", weight: 0.7 },
  { disease: "ADHD", symptom: "Restlessness", weight: 0.6 },
  { disease: "ADHD", symptom: "Forgetfulness", weight: 0.5 },

  // Autism Spectrum Disorder
  { disease: "Autism Spectrum Disorder", symptom: "Social communication difficulties", weight: 0.8 },
  { disease: "Autism Spectrum Disorder", symptom: "Repetitive behaviors", weight: 0.7 },
  { disease: "Autism Spectrum Disorder", symptom: "Sensory sensitivities", weight: 0.6 },
  { disease: "Autism Spectrum Disorder", symptom: "Delayed speech", weight: 0.5 },

  // PTSD
  { disease: "PTSD", symptom: "Anxiety", weight: 0.7 },
  { disease: "PTSD", symptom: "Flashbacks", weight: 0.8 },
  { disease: "PTSD", symptom: "Nightmares", weight: 0.7 },
  { disease: "PTSD", symptom: "Avoidance", weight: 0.6 },
  { disease: "PTSD", symptom: "Hypervigilance", weight: 0.6 },
  { disease: "PTSD", symptom: "Insomnia", weight: 0.5 },

  // Bipolar Disorder
  { disease: "Bipolar Disorder", symptom: "Mood swings", weight: 0.9 },
  { disease: "Bipolar Disorder", symptom: "Depression", weight: 0.6 },
  { disease: "Bipolar Disorder", symptom: "Manic episodes", weight: 0.8 },
  { disease: "Bipolar Disorder", symptom: "Irritability", weight: 0.5 },
  { disease: "Bipolar Disorder", symptom: "Risky behavior", weight: 0.4 },

  // Alzheimer's Disease
  { disease: "Alzheimer's Disease", symptom: "Memory loss", weight: 0.9 },
  { disease: "Alzheimer's Disease", symptom: "Confusion", weight: 0.7 },
  { disease: "Alzheimer's Disease", symptom: "Difficulty speaking", weight: 0.5 },
  { disease: "Alzheimer's Disease", symptom: "Disorientation", weight: 0.6 },
  { disease: "Alzheimer's Disease", symptom: "Personality changes", weight: 0.5 },

  // Parkinson's Disease
  { disease: "Parkinson's Disease", symptom: "Tremors", weight: 0.8 },
  { disease: "Parkinson's Disease", symptom: "Muscle weakness", weight: 0.5 },
  { disease: "Parkinson's Disease", symptom: "Stiffness", weight: 0.6 },
  { disease: "Parkinson's Disease", symptom: "Balance problems", weight: 0.6 },
  { disease: "Parkinson's Disease", symptom: "Slow movement", weight: 0.7 },

  // Multiple Sclerosis
  { disease: "Multiple Sclerosis", symptom: "Numbness", weight: 0.6 },
  { disease: "Multiple Sclerosis", symptom: "Tingling", weight: 0.6 },
  { disease: "Multiple Sclerosis", symptom: "Muscle weakness", weight: 0.6 },
  { disease: "Multiple Sclerosis", symptom: "Vision problems", weight: 0.5 },
  { disease: "Multiple Sclerosis", symptom: "Balance problems", weight: 0.5 },
  { disease: "Multiple Sclerosis", symptom: "Fatigue", weight: 0.5 },

  // Epilepsy
  { disease: "Epilepsy", symptom: "Seizure", weight: 0.9 },
  { disease: "Epilepsy", symptom: "Loss of consciousness", weight: 0.6 },
  { disease: "Epilepsy", symptom: "Confusion", weight: 0.4 },
  { disease: "Epilepsy", symptom: "Staring spells", weight: 0.5 },

  // Hepatitis B
  { disease: "Hepatitis B", symptom: "Fatigue", weight: 0.6 },
  { disease: "Hepatitis B", symptom: "Abdominal pain", weight: 0.5 },
  { disease: "Hepatitis B", symptom: "Jaundice", weight: 0.6 },
  { disease: "Hepatitis B", symptom: "Loss of appetite", weight: 0.5 },
  { disease: "Hepatitis B", symptom: "Nausea", weight: 0.5 },
  { disease: "Hepatitis B", symptom: "Dark urine", weight: 0.4 },

  // Chronic Kidney Disease
  { disease: "Chronic Kidney Disease", symptom: "Fatigue", weight: 0.5 },
  { disease: "Chronic Kidney Disease", symptom: "Swollen ankles", weight: 0.6 },
  { disease: "Chronic Kidney Disease", symptom: "Frequent urination", weight: 0.4 },
  { disease: "Chronic Kidney Disease", symptom: "Blood in urine", weight: 0.3 },
  { disease: "Chronic Kidney Disease", symptom: "Nausea", weight: 0.3 },
  { disease: "Chronic Kidney Disease", symptom: "Shortness of breath", weight: 0.3 },

  // Glaucoma
  { disease: "Glaucoma", symptom: "Blurred vision", weight: 0.5 },
  { disease: "Glaucoma", symptom: "Eye pain", weight: 0.4 },
  { disease: "Glaucoma", symptom: "Halos around lights", weight: 0.4 },
  { disease: "Glaucoma", symptom: "Vision loss", weight: 0.5 },

  // Cataracts
  { disease: "Cataracts", symptom: "Blurred vision", weight: 0.8 },
  { disease: "Cataracts", symptom: "Double vision", weight: 0.4 },
  { disease: "Cataracts", symptom: "Sensitivity to light", weight: 0.4 },
  { disease: "Cataracts", symptom: "Night vision problems", weight: 0.5 },

  // Tuberculosis
  { disease: "Tuberculosis", symptom: "Cough", weight: 0.8 },
  { disease: "Tuberculosis", symptom: "Coughing blood", weight: 0.6 },
  { disease: "Tuberculosis", symptom: "Fever", weight: 0.6 },
  { disease: "Tuberculosis", symptom: "Night sweats", weight: 0.7 },
  { disease: "Tuberculosis", symptom: "Weight loss", weight: 0.6 },
  { disease: "Tuberculosis", symptom: "Fatigue", weight: 0.5 },

  // HIV/AIDS
  { disease: "HIV/AIDS", symptom: "Fever", weight: 0.4 },
  { disease: "HIV/AIDS", symptom: "Fatigue", weight: 0.5 },
  { disease: "HIV/AIDS", symptom: "Weight loss", weight: 0.5 },
  { disease: "HIV/AIDS", symptom: "Swollen lymph nodes", weight: 0.4 },
  { disease: "HIV/AIDS", symptom: "Night sweats", weight: 0.4 },

  // Malaria
  { disease: "Malaria", symptom: "Fever", weight: 0.9 },
  { disease: "Malaria", symptom: "Chills", weight: 0.8 },
  { disease: "Malaria", symptom: "Sweating", weight: 0.6 },
  { disease: "Malaria", symptom: "Headache", weight: 0.5 },
  { disease: "Malaria", symptom: "Nausea", weight: 0.4 },
  { disease: "Malaria", symptom: "Vomiting", weight: 0.3 },
  { disease: "Malaria", symptom: "Body aches", weight: 0.5 },

  // Lyme Disease
  { disease: "Lyme Disease", symptom: "Fever", weight: 0.5 },
  { disease: "Lyme Disease", symptom: "Fatigue", weight: 0.5 },
  { disease: "Lyme Disease", symptom: "Headache", weight: 0.4 },
  { disease: "Lyme Disease", symptom: "Body aches", weight: 0.5 },
  { disease: "Lyme Disease", symptom: "Rash", weight: 0.7 },
  { disease: "Lyme Disease", symptom: "Joint pain", weight: 0.4 },

  // Hepatitis C
  { disease: "Hepatitis C", symptom: "Fatigue", weight: 0.5 },
  { disease: "Hepatitis C", symptom: "Jaundice", weight: 0.4 },
  { disease: "Hepatitis C", symptom: "Abdominal pain", weight: 0.4 },
  { disease: "Hepatitis C", symptom: "Loss of appetite", weight: 0.3 },
  { disease: "Hepatitis C", symptom: "Nausea", weight: 0.3 },
  { disease: "Hepatitis C", symptom: "Dark urine", weight: 0.3 },
];

export const diseaseMedicineMappings = [
  // Common Cold
  { disease: "Common Cold", medicine: "Paracetamol", confidence: 80 },
  { disease: "Common Cold", medicine: "Cetirizine", confidence: 70 },
  { disease: "Common Cold", medicine: "Loratadine", confidence: 60 },

  // Influenza
  { disease: "Influenza", medicine: "Paracetamol", confidence: 85 },
  { disease: "Influenza", medicine: "Ibuprofen", confidence: 75 },
  { disease: "Influenza", medicine: "Oseltamivir", confidence: 60 },

  // COVID-19
  { disease: "COVID-19", medicine: "Paracetamol", confidence: 80 },
  { disease: "COVID-19", medicine: "Ibuprofen", confidence: 60 },

  // Asthma
  { disease: "Asthma", medicine: "Salbutamol", confidence: 90 },
  { disease: "Asthma", medicine: "Budesonide", confidence: 80 },
  { disease: "Asthma", medicine: "Montelukast", confidence: 60 },

  // COPD
  { disease: "COPD", medicine: "Salbutamol", confidence: 75 },
  { disease: "COPD", medicine: "Budesonide", confidence: 70 },
  { disease: "COPD", medicine: "Tiotropium", confidence: 60 },

  // Pneumonia
  { disease: "Pneumonia", medicine: "Amoxicillin", confidence: 85 },
  { disease: "Pneumonia", medicine: "Azithromycin", confidence: 80 },
  { disease: "Pneumonia", medicine: "Paracetamol", confidence: 60 },

  // Hypertension
  { disease: "Hypertension", medicine: "Lisinopril", confidence: 85 },
  { disease: "Hypertension", medicine: "Amlodipine", confidence: 80 },
  { disease: "Hypertension", medicine: "Losartan", confidence: 75 },
  { disease: "Hypertension", medicine: "Hydrochlorothiazide", confidence: 60 },

  // Coronary Artery Disease
  { disease: "Coronary Artery Disease", medicine: "Atorvastatin", confidence: 85 },
  { disease: "Coronary Artery Disease", medicine: "Aspirin", confidence: 80 },
  { disease: "Coronary Artery Disease", medicine: "Metoprolol", confidence: 75 },
  { disease: "Coronary Artery Disease", medicine: "Lisinopril", confidence: 70 },

  // Heart Failure
  { disease: "Heart Failure", medicine: "Lisinopril", confidence: 80 },
  { disease: "Heart Failure", medicine: "Metoprolol", confidence: 75 },
  { disease: "Heart Failure", medicine: "Furosemide", confidence: 70 },
  { disease: "Heart Failure", medicine: "Spironolactone", confidence: 60 },

  // Atrial Fibrillation
  { disease: "Atrial Fibrillation", medicine: "Warfarin", confidence: 80 },
  { disease: "Atrial Fibrillation", medicine: "Metoprolol", confidence: 75 },
  { disease: "Atrial Fibrillation", medicine: "Aspirin", confidence: 60 },

  // Stroke
  { disease: "Stroke", medicine: "Aspirin", confidence: 80 },
  { disease: "Stroke", medicine: "Atorvastatin", confidence: 70 },
  { disease: "Stroke", medicine: "Lisinopril", confidence: 60 },

  // Type 2 Diabetes
  { disease: "Type 2 Diabetes", medicine: "Metformin", confidence: 90 },
  { disease: "Type 2 Diabetes", medicine: "Insulin", confidence: 60 },

  // Type 1 Diabetes
  { disease: "Type 1 Diabetes", medicine: "Insulin", confidence: 95 },

  // Hypothyroidism
  { disease: "Hypothyroidism", medicine: "Levothyroxine", confidence: 90 },

  // Hyperthyroidism
  { disease: "Hyperthyroidism", medicine: "Carbimazole", confidence: 80 },
  { disease: "Hyperthyroidism", medicine: "Propranolol", confidence: 60 },

  // Osteoarthritis
  { disease: "Osteoarthritis", medicine: "Paracetamol", confidence: 70 },
  { disease: "Osteoarthritis", medicine: "Ibuprofen", confidence: 80 },

  // Rheumatoid Arthritis
  { disease: "Rheumatoid Arthritis", medicine: "Methotrexate", confidence: 80 },
  { disease: "Rheumatoid Arthritis", medicine: "Hydroxychloroquine", confidence: 70 },
  { disease: "Rheumatoid Arthritis", medicine: "Ibuprofen", confidence: 60 },
  { disease: "Rheumatoid Arthritis", medicine: "Sulfasalazine", confidence: 50 },

  // Osteoporosis
  { disease: "Osteoporosis", medicine: "Alendronate", confidence: 75 },
  { disease: "Osteoporosis", medicine: "Calcium", confidence: 60 },
  { disease: "Osteoporosis", medicine: "Vitamin D", confidence: 60 },

  // Gout
  { disease: "Gout", medicine: "Colchicine", confidence: 80 },
  { disease: "Gout", medicine: "Allopurinol", confidence: 80 },
  { disease: "Gout", medicine: "Ibuprofen", confidence: 60 },

  // Migraine
  { disease: "Migraine", medicine: "Paracetamol", confidence: 60 },
  { disease: "Migraine", medicine: "Ibuprofen", confidence: 70 },
  { disease: "Migraine", medicine: "Sumatriptan", confidence: 75 },

  // Depression
  { disease: "Depression", medicine: "Sertraline", confidence: 75 },
  { disease: "Depression", medicine: "Fluoxetine", confidence: 70 },
  { disease: "Depression", medicine: "Escitalopram", confidence: 70 },

  // Anxiety Disorder
  { disease: "Anxiety Disorder", medicine: "Sertraline", confidence: 60 },
  { disease: "Anxiety Disorder", medicine: "Escitalopram", confidence: 60 },
  { disease: "Anxiety Disorder", medicine: "Lorazepam", confidence: 50 },
  { disease: "Anxiety Disorder", medicine: "Diazepam", confidence: 50 },

  // Gastritis
  { disease: "Gastritis", medicine: "Omeprazole", confidence: 80 },
  { disease: "Gastritis", medicine: "Pantoprazole", confidence: 75 },
  { disease: "Gastritis", medicine: "Antacids", confidence: 60 },

  // GERD
  { disease: "GERD", medicine: "Omeprazole", confidence: 85 },
  { disease: "GERD", medicine: "Pantoprazole", confidence: 80 },
  { disease: "GERD", medicine: "Ranitidine", confidence: 60 },

  // Peptic Ulcer
  { disease: "Peptic Ulcer", medicine: "Omeprazole", confidence: 85 },
  { disease: "Peptic Ulcer", medicine: "Pantoprazole", confidence: 80 },
  { disease: "Peptic Ulcer", medicine: "Antacids", confidence: 60 },

  // IBS
  { disease: "IBS", medicine: "Loperamide", confidence: 60 },
  { disease: "IBS", medicine: "Antispasmodics", confidence: 60 },
  { disease: "IBS", medicine: "Probiotics", confidence: 50 },

  // Anemia
  { disease: "Anemia", medicine: "Iron supplements", confidence: 80 },
  { disease: "Anemia", medicine: "Vitamin B12", confidence: 60 },
  { disease: "Anemia", medicine: "Folic acid", confidence: 50 },

  // UTI
  { disease: "Urinary Tract Infection", medicine: "Ciprofloxacin", confidence: 80 },
  { disease: "Urinary Tract Infection", medicine: "Amoxicillin", confidence: 70 },
  { disease: "Urinary Tract Infection", medicine: "Nitrofurantoin", confidence: 75 },

  // Kidney Stones
  { disease: "Kidney Stones", medicine: "Ibuprofen", confidence: 60 },
  { disease: "Kidney Stones", medicine: "Tamsulosin", confidence: 60 },
  { disease: "Kidney Stones", medicine: "Allopurinol", confidence: 40 },

  // Allergic Rhinitis
  { disease: "Allergic Rhinitis", medicine: "Cetirizine", confidence: 80 },
  { disease: "Allergic Rhinitis", medicine: "Loratadine", confidence: 75 },
  { disease: "Allergic Rhinitis", medicine: "Fluticasone", confidence: 70 },

  // Sinusitis
  { disease: "Sinusitis", medicine: "Amoxicillin", confidence: 70 },
  { disease: "Sinusitis", medicine: "Cetirizine", confidence: 50 },
  { disease: "Sinusitis", medicine: "Paracetamol", confidence: 50 },

  // Bronchitis
  { disease: "Bronchitis", medicine: "Amoxicillin", confidence: 70 },
  { disease: "Bronchitis", medicine: "Salbutamol", confidence: 60 },
  { disease: "Bronchitis", medicine: "Paracetamol", confidence: 50 },

  // Insomnia
  { disease: "Insomnia", medicine: "Melatonin", confidence: 50 },
  { disease: "Insomnia", medicine: "Zolpidem", confidence: 60 },
  { disease: "Insomnia", medicine: "Trazodone", confidence: 50 },

  // Obesity
  { disease: "Obesity", medicine: "Orlistat", confidence: 50 },
  { disease: "Obesity", medicine: "Metformin", confidence: 40 },

  // Hypoglycemia
  { disease: "Hypoglycemia", medicine: "Glucose tablets", confidence: 90 },
  { disease: "Hypoglycemia", medicine: "Glucagon", confidence: 70 },

  // Hyperlipidemia
  { disease: "Hyperlipidemia", medicine: "Atorvastatin", confidence: 85 },
  { disease: "Hyperlipidemia", medicine: "Simvastatin", confidence: 80 },

  // Eczema
  { disease: "Eczema", medicine: "Hydrocortisone cream", confidence: 70 },
  { disease: "Eczema", medicine: "Moisturizers", confidence: 60 },
  { disease: "Eczema", medicine: "Cetirizine", confidence: 50 },

  // Psoriasis
  { disease: "Psoriasis", medicine: "Topical steroids", confidence: 70 },
  { disease: "Psoriasis", medicine: "Vitamin D analogs", confidence: 60 },
  { disease: "Psoriasis", medicine: "Methotrexate", confidence: 50 },

  // Acne
  { disease: "Acne", medicine: "Benzoyl peroxide", confidence: 70 },
  { disease: "Acne", medicine: "Topical antibiotics", confidence: 60 },
  { disease: "Acne", medicine: "Retinoids", confidence: 60 },

  // Conjunctivitis
  { disease: "Conjunctivitis", medicine: "Antibiotic eye drops", confidence: 70 },
  { disease: "Conjunctivitis", medicine: "Artificial tears", confidence: 50 },
  { disease: "Conjunctivitis", medicine: "Antihistamine eye drops", confidence: 50 },

  // Vertigo
  { disease: "Vertigo", medicine: "Meclizine", confidence: 70 },
  { disease: "Vertigo", medicine: "Betahistine", confidence: 60 },
  { disease: "Vertigo", medicine: "Diazepam", confidence: 40 },

  // Menopause
  { disease: "Menopause", medicine: "Hormone replacement therapy", confidence: 60 },
  { disease: "Menopause", medicine: "Calcium", confidence: 50 },
  { disease: "Menopause", medicine: "Vitamin D", confidence: 50 },

  // PCOS
  { disease: "PCOS", medicine: "Metformin", confidence: 60 },
  { disease: "PCOS", medicine: "Oral contraceptives", confidence: 70 },
  { disease: "PCOS", medicine: "Clomiphene", confidence: 50 },

  // Appendicitis
  { disease: "Appendicitis", medicine: "Ciprofloxacin", confidence: 50 },
  { disease: "Appendicitis", medicine: "Metronidazole", confidence: 50 },
  { disease: "Appendicitis", note: "Surgical consultation required" },

  // Gallstones
  { disease: "Gallstones", medicine: "Ursodiol", confidence: 50 },
  { disease: "Gallstones", medicine: "Ibuprofen", confidence: 40 },
  { disease: "Gallstones", note: "Surgical consultation may be required" },

  // Pancreatitis
  { disease: "Pancreatitis", medicine: "Ibuprofen", confidence: 40 },
  { disease: "Pancreatitis", medicine: "Ondansetron", confidence: 50 },
  { disease: "Pancreatitis", note: "Hospitalization may be required" },

  // Fibromyalgia
  { disease: "Fibromyalgia", medicine: "Paracetamol", confidence: 50 },
  { disease: "Fibromyalgia", medicine: "Ibuprofen", confidence: 50 },
  { disease: "Fibromyalgia", medicine: "Amitriptyline", confidence: 50 },
  { disease: "Fibromyalgia", medicine: "Duloxetine", confidence: 50 },

  // Carpal Tunnel Syndrome
  { disease: "Carpal Tunnel Syndrome", medicine: "Ibuprofen", confidence: 50 },
  { disease: "Carpal Tunnel Syndrome", medicine: "Wrist splints", confidence: 60 },
  { disease: "Carpal Tunnel Syndrome", note: "Surgical consultation may be required" },

  // Sciatica
  { disease: "Sciatica", medicine: "Ibuprofen", confidence: 60 },
  { disease: "Sciatica", medicine: "Paracetamol", confidence: 50 },
  { disease: "Sciatica", medicine: "Diazepam", confidence: 40 },

  // Panic Disorder
  { disease: "Panic Disorder", medicine: "Sertraline", confidence: 60 },
  { disease: "Panic Disorder", medicine: "Escitalopram", confidence: 60 },
  { disease: "Panic Disorder", medicine: "Lorazepam", confidence: 50 },

  // OCD
  { disease: "OCD", medicine: "Fluoxetine", confidence: 60 },
  { disease: "OCD", medicine: "Sertraline", confidence: 60 },
  { disease: "OCD", medicine: "Fluvoxamine", confidence: 50 },

  // Schizophrenia
  { disease: "Schizophrenia", medicine: "Risperidone", confidence: 70 },
  { disease: "Schizophrenia", medicine: "Olanzapine", confidence: 70 },
  { disease: "Schizophrenia", medicine: "Quetiapine", confidence: 60 },

  // ADHD
  { disease: "ADHD", medicine: "Methylphenidate", confidence: 75 },
  { disease: "ADHD", medicine: "Atomoxetine", confidence: 60 },
  { disease: "ADHD", medicine: "Dexamphetamine", confidence: 60 },

  // Autism Spectrum Disorder
  { disease: "Autism Spectrum Disorder", medicine: "Risperidone", confidence: 50 },
  { disease: "Autism Spectrum Disorder", medicine: "Aripiprazole", confidence: 50 },
  { disease: "Autism Spectrum Disorder", note: "Behavioral therapy is primary treatment" },

  // PTSD
  { disease: "PTSD", medicine: "Sertraline", confidence: 60 },
  { disease: "PTSD", medicine: "Paroxetine", confidence: 60 },
  { disease: "PTSD", medicine: "Prazosin", confidence: 50 },

  // Bipolar Disorder
  { disease: "Bipolar Disorder", medicine: "Lithium", confidence: 70 },
  { disease: "Bipolar Disorder", medicine: "Valproate", confidence: 60 },
  { disease: "Bipolar Disorder", medicine: "Quetiapine", confidence: 60 },

  // Alzheimer's Disease
  { disease: "Alzheimer's Disease", medicine: "Donepezil", confidence: 60 },
  { disease: "Alzheimer's Disease", medicine: "Memantine", confidence: 60 },
  { disease: "Alzheimer's Disease", note: "No cure, symptom management only" },

  // Parkinson's Disease
  { disease: "Parkinson's Disease", medicine: "Levodopa", confidence: 80 },
  { disease: "Parkinson's Disease", medicine: "Carbidopa-Levodopa", confidence: 80 },
  { disease: "Parkinson's Disease", medicine: "Pramipexole", confidence: 60 },

  // Multiple Sclerosis
  { disease: "Multiple Sclerosis", medicine: "Interferon beta", confidence: 60 },
  { disease: "Multiple Sclerosis", medicine: "Glatiramer acetate", confidence: 60 },
  { disease: "Multiple Sclerosis", medicine: "Dimethyl fumarate", confidence: 50 },

  // Epilepsy
  { disease: "Epilepsy", medicine: "Valproate", confidence: 70 },
  { disease: "Epilepsy", medicine: "Lamotrigine", confidence: 60 },
  { disease: "Epilepsy", medicine: "Levetiracetam", confidence: 60 },
  { disease: "Epilepsy", medicine: "Carbamazepine", confidence: 60 },

  // Hepatitis B
  { disease: "Hepatitis B", medicine: "Entecavir", confidence: 70 },
  { disease: "Hepatitis B", medicine: "Tenofovir", confidence: 70 },
  { disease: "Hepatitis B", note: "Chronic management, vaccination for prevention" },

  // Chronic Kidney Disease
  { disease: "Chronic Kidney Disease", medicine: "ACE inhibitors", confidence: 60 },
  { disease: "Chronic Kidney Disease", medicine: "ARBs", confidence: 60 },
  { disease: "Chronic Kidney Disease", medicine: "Diuretics", confidence: 50 },
  { disease: "Chronic Kidney Disease", note: "May require dialysis in advanced stages" },

  // Glaucoma
  { disease: "Glaucoma", medicine: "Prostaglandin eye drops", confidence: 70 },
  { disease: "Glaucoma", medicine: "Beta-blocker eye drops", confidence: 60 },
  { disease: "Glaucoma", medicine: "Carbonic anhydrase inhibitors", confidence: 50 },

  // Cataracts
  { disease: "Cataracts", note: "Surgical removal is primary treatment" },
  { disease: "Cataracts", medicine: "Prescription eyeglasses", confidence: 40 },

  // Tuberculosis
  { disease: "Tuberculosis", medicine: "Isoniazid", confidence: 85 },
  { disease: "Tuberculosis", medicine: "Rifampin", confidence: 85 },
  { disease: "Tuberculosis", medicine: "Pyrazinamide", confidence: 80 },
  { disease: "Tuberculosis", medicine: "Ethambutol", confidence: 80 },

  // HIV/AIDS
  { disease: "HIV/AIDS", medicine: "Antiretroviral therapy", confidence: 85 },
  { disease: "HIV/AIDS", note: "Lifelong treatment required" },

  // Malaria
  { disease: "Malaria", medicine: "Artemisinin-based combination therapy", confidence: 90 },
  { disease: "Malaria", medicine: "Chloroquine", confidence: 60 },
  { disease: "Malaria", medicine: "Mefloquine", confidence: 50 },

  // Lyme Disease
  { disease: "Lyme Disease", medicine: "Doxycycline", confidence: 85 },
  { disease: "Lyme Disease", medicine: "Amoxicillin", confidence: 80 },
  { disease: "Lyme Disease", medicine: "Cefuroxime", confidence: 70 },

  // Hepatitis C
  { disease: "Hepatitis C", medicine: "Sofosbuvir", confidence: 85 },
  { disease: "Hepatitis C", medicine: "Ledipasvir", confidence: 80 },
  { disease: "Hepatitis C", medicine: "Velpatasvir", confidence: 80 },
];

// Helper: build lookup maps from names to IDs after insertion
export function buildMappings(
  diseaseMap: Record<string, string>,
  symptomMap: Record<string, string>,
  medicineMap: Record<string, string>
) {
  const symptomLinks = diseaseSymptomMappings.map((m) => ({
    diseaseId: diseaseMap[m.disease],
    symptomId: symptomMap[m.symptom],
    weight: m.weight,
  }));
  const medicineLinks = diseaseMedicineMappings.map((m) => ({
    diseaseId: diseaseMap[m.disease],
    medicineId: medicineMap[m.medicine],
    confidence: m.confidence,
  }));
  return { symptomLinks, medicineLinks };
}
