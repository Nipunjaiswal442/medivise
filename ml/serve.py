from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import numpy as np
import os
import json
import hashlib

app = FastAPI(title="Medivise DL Health Prediction Model")

class PredictionRequest(BaseModel):
    symptoms: List[str]
    age: int
    gender: str

class PredictionResponse(BaseModel):
    diseaseId: str
    confidence: float
    diseaseName: str
    allPredictions: List[Dict[str, Any]]

# Symptom-to-disease knowledge base (simplified for the DL model)
# In production, this would be trained on real medical data
SYMPTOM_DISEASE_MAP = {
    "fever": {"influenza": 0.9, "covid-19": 0.8, "pneumonia": 0.7, "common cold": 0.3, "tuberculosis": 0.5, "malaria": 0.9},
    "cough": {"common cold": 0.8, "influenza": 0.8, "covid-19": 0.8, "pneumonia": 0.9, "asthma": 0.6, "bronchitis": 0.9, "tuberculosis": 0.8},
    "shortness of breath": {"covid-19": 0.7, "pneumonia": 0.8, "asthma": 0.9, "copd": 0.9, "heart failure": 0.8, "anxiety disorder": 0.3},
    "chest pain": {"coronary artery disease": 0.9, "heart failure": 0.5, "pneumonia": 0.6, "gerd": 0.4, "panic disorder": 0.5},
    "fatigue": {"influenza": 0.8, "covid-19": 0.7, "anemia": 0.8, "depression": 0.6, "hypothyroidism": 0.8, "chronic kidney disease": 0.5},
    "headache": {"migraine": 0.9, "common cold": 0.4, "influenza": 0.7, "hypertension": 0.5, "stroke": 0.4, "sinusitis": 0.5},
    "nausea": {"gastritis": 0.7, "migraine": 0.6, "peptic ulcer": 0.5, "gastroenteritis": 0.8, "pregnancy": 0.5},
    "vomiting": {"gastritis": 0.6, "gastroenteritis": 0.8, "migraine": 0.4, "food poisoning": 0.9},
    "diarrhea": {"gastroenteritis": 0.9, "ibs": 0.6, "food poisoning": 0.8, "ibd": 0.7},
    "abdominal pain": {"gastritis": 0.8, "peptic ulcer": 0.7, "ibs": 0.8, "appendicitis": 0.7, "gallstones": 0.7, "pancreatitis": 0.8},
    "sore throat": {"common cold": 0.7, "influenza": 0.5, "covid-19": 0.4},
    "runny nose": {"common cold": 0.9, "allergic rhinitis": 0.9, "influenza": 0.4},
    "sneezing": {"common cold": 0.8, "allergic rhinitis": 0.9},
    "nasal congestion": {"common cold": 0.8, "allergic rhinitis": 0.8, "sinusitis": 0.8},
    "body aches": {"influenza": 0.8, "covid-19": 0.6, "fibromyalgia": 0.8, "malaria": 0.5},
    "joint pain": {"osteoarthritis": 0.9, "rheumatoid arthritis": 0.8, "gout": 0.9, "lyme disease": 0.4},
    "muscle weakness": {"hypothyroidism": 0.6, "anemia": 0.4, "multiple sclerosis": 0.5, "myasthenia gravis": 0.7},
    "dizziness": {"hypertension": 0.4, "stroke": 0.5, "vertigo": 0.9, "anemia": 0.5, "hypoglycemia": 0.6},
    "fainting": {"heart failure": 0.4, "stroke": 0.3, "arrhythmia": 0.6},
    "rash": {"eczema": 0.8, "psoriasis": 0.7, "allergic rhinitis": 0.4, "lyme disease": 0.7},
    "itching": {"eczema": 0.8, "psoriasis": 0.6, "allergic rhinitis": 0.6},
    "swelling": {"heart failure": 0.7, "gout": 0.8, "kidney disease": 0.5, "osteoarthritis": 0.5},
    "weight loss": {"type 1 diabetes": 0.7, "hyperthyroidism": 0.7, "cancer": 0.6, "tuberculosis": 0.6, "hiv": 0.5},
    "weight gain": {"hypothyroidism": 0.7, "obesity": 0.9, "cushing syndrome": 0.5},
    "loss of appetite": {"depression": 0.5, "gastritis": 0.5, "cancer": 0.5, "hiv": 0.4},
    "increased thirst": {"type 2 diabetes": 0.8, "type 1 diabetes": 0.8, "diabetes insipidus": 0.5},
    "frequent urination": {"type 2 diabetes": 0.8, "type 1 diabetes": 0.8, "urinary tract infection": 0.7, "prostatitis": 0.5},
    "painful urination": {"urinary tract infection": 0.9, "prostatitis": 0.6},
    "blood in urine": {"urinary tract infection": 0.4, "kidney stones": 0.6, "kidney disease": 0.5},
    "back pain": {"kidney stones": 0.8, "sciatica": 0.7, "osteoarthritis": 0.4, "pancreatitis": 0.4},
    "neck pain": {"osteoarthritis": 0.4, "meningitis": 0.6},
    "blurred vision": {"diabetes": 0.5, "glaucoma": 0.4, "cataracts": 0.6, "hypertension": 0.3},
    "double vision": {"stroke": 0.4, "multiple sclerosis": 0.4, "cataracts": 0.3},
    "hearing loss": {"otitis media": 0.5, "meniere disease": 0.5},
    "tinnitus": {"meniere disease": 0.6, "hearing loss": 0.4},
    "hoarseness": {"laryngitis": 0.7, "gerd": 0.3},
    "difficulty swallowing": {"gerd": 0.5, "peptic ulcer": 0.4, "esophageal cancer": 0.3},
    "heartburn": {"gerd": 0.9, "peptic ulcer": 0.4, "gastritis": 0.4},
    "bloating": {"ibs": 0.7, "gastritis": 0.6, "peptic ulcer": 0.5},
    "belching": {"gerd": 0.5, "gastritis": 0.4},
    "jaundice": {"hepatitis b": 0.7, "hepatitis c": 0.6, "liver disease": 0.8, "gallstones": 0.3},
    "pale skin": {"anemia": 0.8},
    "cold hands and feet": {"hypothyroidism": 0.6, "anemia": 0.5, "peripheral artery disease": 0.4},
    "night sweats": {"tuberculosis": 0.7, "lymphoma": 0.6, "menopause": 0.8, "hiv": 0.4},
    "insomnia": {"anxiety disorder": 0.5, "depression": 0.7, "stress": 0.6},
    "excessive sleepiness": {"sleep apnea": 0.7, "narcolepsy": 0.6, "depression": 0.4},
    "memory loss": {"alzheimer disease": 0.9, "dementia": 0.8, "stroke": 0.4},
    "confusion": {"alzheimer disease": 0.6, "stroke": 0.5, "hypoglycemia": 0.5, "dehydration": 0.4},
    "anxiety": {"anxiety disorder": 0.9, "panic disorder": 0.7, "depression": 0.4},
    "depression": {"depression": 0.9, "bipolar disorder": 0.5, "ptsd": 0.5},
    "irritability": {"depression": 0.4, "anxiety disorder": 0.4, "hyperthyroidism": 0.5},
    "mood swings": {"bipolar disorder": 0.8, "depression": 0.4, "pms": 0.5},
    "tremors": {"parkinson disease": 0.8, "hyperthyroidism": 0.6, "essential tremor": 0.7},
    "numbness": {"multiple sclerosis": 0.6, "diabetes": 0.4, "stroke": 0.5, "carpal tunnel syndrome": 0.6},
    "tingling": {"multiple sclerosis": 0.5, "diabetes": 0.4, "carpal tunnel syndrome": 0.6},
    "weakness": {"stroke": 0.6, "multiple sclerosis": 0.5, "myasthenia gravis": 0.6},
    "paralysis": {"stroke": 0.7, "spinal cord injury": 0.8},
    "seizure": {"epilepsy": 0.9, "brain tumor": 0.4},
    "loss of consciousness": {"stroke": 0.4, "epilepsy": 0.6, "heart failure": 0.3},
    "chills": {"malaria": 0.8, "influenza": 0.7, "infection": 0.5},
    "swollen lymph nodes": {"hiv": 0.4, "infection": 0.5, "lymphoma": 0.5},
    "dry mouth": {"diabetes": 0.4, "sjogren syndrome": 0.6},
    "excessive sweating": {"hyperthyroidism": 0.6, "menopause": 0.6, "infection": 0.4},
    "palpitations": {"atrial fibrillation": 0.8, "anxiety disorder": 0.6, "hyperthyroidism": 0.6},
    "swollen ankles": {"heart failure": 0.7, "kidney disease": 0.5, "liver disease": 0.4},
    "coughing blood": {"tuberculosis": 0.6, "lung cancer": 0.5, "pneumonia": 0.3},
    "wheezing": {"asthma": 0.9, "copd": 0.8, "bronchitis": 0.7},
    "snoring": {"sleep apnea": 0.8},
    "male sexual dysfunction": {"diabetes": 0.4, "prostatitis": 0.3},
    "female sexual dysfunction": {"hormonal imbalance": 0.4},
    "irregular periods": {"pcos": 0.8, "thyroid disorder": 0.4},
    "heavy menstrual bleeding": {"fibroids": 0.6, "endometriosis": 0.5},
    "pelvic pain": {"endometriosis": 0.6, "pelvic inflammatory disease": 0.6},
    "breast pain": {"mastitis": 0.5, "fibrocystic breast disease": 0.4},
    "breast lump": {"breast cancer": 0.4, "fibroadenoma": 0.5},
    "vaginal discharge": {"bacterial vaginosis": 0.6, "yeast infection": 0.6},
    "penile discharge": {"urethritis": 0.7, "std": 0.7},
    "genital itching": {"yeast infection": 0.7, "std": 0.5},
    "genital ulcers": {"genital herpes": 0.8, "syphilis": 0.7},
    "easy bleeding": {"hemophilia": 0.7, "liver disease": 0.4},
    "easy bruising": {"hemophilia": 0.6, "liver disease": 0.4},
    "nosebleed": {"hypertension": 0.3, "trauma": 0.5},
    "bleeding gums": {"gingivitis": 0.7, "vitamin c deficiency": 0.4},
    "delayed wound healing": {"diabetes": 0.6, "immune deficiency": 0.4},
    "hair loss": {"thyroid disorder": 0.4, "alopecia": 0.7, "nutritional deficiency": 0.4},
    "dry skin": {"hypothyroidism": 0.5, "eczema": 0.5, "dehydration": 0.4},
    "oily skin": {"acne": 0.6, "hormonal imbalance": 0.4},
    "yellow eyes": {"hepatitis b": 0.6, "hepatitis c": 0.6, "liver disease": 0.7},
    "dark urine": {"hepatitis b": 0.5, "hepatitis c": 0.5, "kidney disease": 0.3},
    "clay-colored stools": {"liver disease": 0.4, "gallstones": 0.3},
    "black stools": {"gi bleeding": 0.6, "peptic ulcer": 0.4},
    "blood in stool": {"hemorrhoids": 0.5, "ibd": 0.6, "colon cancer": 0.3},
    "mucus in stool": {"ibs": 0.6, "ibd": 0.7},
}

DISEASE_NAMES = {
    "influenza": "Influenza",
    "covid-19": "COVID-19",
    "pneumonia": "Pneumonia",
    "common cold": "Common Cold",
    "tuberculosis": "Tuberculosis",
    "malaria": "Malaria",
    "asthma": "Asthma",
    "copd": "COPD",
    "bronchitis": "Bronchitis",
    "heart failure": "Heart Failure",
    "coronary artery disease": "Coronary Artery Disease",
    "gerd": "GERD",
    "panic disorder": "Panic Disorder",
    "anemia": "Anemia",
    "depression": "Depression",
    "hypothyroidism": "Hypothyroidism",
    "chronic kidney disease": "Chronic Kidney Disease",
    "migraine": "Migraine",
    "hypertension": "Hypertension",
    "stroke": "Stroke",
    "gastritis": "Gastritis",
    "peptic ulcer": "Peptic Ulcer",
    "gastroenteritis": "Gastroenteritis",
    "food poisoning": "Food Poisoning",
    "allergic rhinitis": "Allergic Rhinitis",
    "sinusitis": "Sinusitis",
    "vertigo": "Vertigo",
    "ibs": "IBS",
    "ibd": "IBD",
    "appendicitis": "Appendicitis",
    "gallstones": "Gallstones",
    "pancreatitis": "Pancreatitis",
    "fibromyalgia": "Fibromyalgia",
    "osteoarthritis": "Osteoarthritis",
    "rheumatoid arthritis": "Rheumatoid Arthritis",
    "gout": "Gout",
    "lyme disease": "Lyme Disease",
    "type 1 diabetes": "Type 1 Diabetes",
    "type 2 diabetes": "Type 2 Diabetes",
    "hyperthyroidism": "Hyperthyroidism",
    "obesity": "Obesity",
    "eczema": "Eczema",
    "psoriasis": "Psoriasis",
    "acne": "Acne",
    "conjunctivitis": "Conjunctivitis",
    "menopause": "Menopause",
    "pcos": "PCOS",
    "cancer": "Cancer",
    "hiv": "HIV/AIDS",
    "liver disease": "Liver Disease",
    "kidney disease": "Kidney Disease",
    "anxiety disorder": "Anxiety Disorder",
    "bipolar disorder": "Bipolar Disorder",
    "ptsd": "PTSD",
    "alzheimer disease": "Alzheimer's Disease",
    "dementia": "Dementia",
    "parkinson disease": "Parkinson's Disease",
    "multiple sclerosis": "Multiple Sclerosis",
    "epilepsy": "Epilepsy",
    "brain tumor": "Brain Tumor",
    "meningitis": "Meningitis",
    "otitis media": "Otitis Media",
    "meniere disease": "Meniere's Disease",
    "cushing syndrome": "Cushing's Syndrome",
    "sleep apnea": "Sleep Apnea",
    "narcolepsy": "Narcolepsy",
    "hemophilia": "Hemophilia",
    "sjogren syndrome": "Sjogren's Syndrome",
    "alopecia": "Alopecia",
    "pms": "PMS",
    "endometriosis": "Endometriosis",
    "fibroids": "Uterine Fibroids",
    "bacterial vaginosis": "Bacterial Vaginosis",
    "yeast infection": "Yeast Infection",
    "urethritis": "Urethritis",
    "std": "Sexually Transmitted Disease",
    "genital herpes": "Genital Herpes",
    "syphilis": "Syphilis",
    "hemorrhoids": "Hemorrhoids",
    "colon cancer": "Colon Cancer",
    "gi bleeding": "GI Bleeding",
    "lung cancer": "Lung Cancer",
    "spinal cord injury": "Spinal Cord Injury",
    "myasthenia gravis": "Myasthenia Gravis",
    "essential tremor": "Essential Tremor",
    "diabetes insipidus": "Diabetes Insipidus",
    "prostatiis": "Prostatitis",
    "mastitis": "Mastitis",
    "fibrocystic breast disease": "Fibrocystic Breast Disease",
    "laryngitis": "Laryngitis",
    "esophageal cancer": "Esophageal Cancer",
    "arthritis": "Arthritis",
    "stress": "Stress",
    "nutritional deficiency": "Nutritional Deficiency",
    "vitamin c deficiency": "Vitamin C Deficiency",
    "trauma": "Trauma",
    "infection": "Infection",
    "pregnancy": "Pregnancy",
    "hormonal imbalance": "Hormonal Imbalance",
    "dehydration": "Dehydration",
}

# Simple neural network simulation using numpy
# In production, this would be a trained TensorFlow/PyTorch model
class SimpleDLModel:
    def __init__(self):
        self.symptom_list = list(SYMPTOM_DISEASE_MAP.keys())
        self.disease_list = list(DISEASE_NAMES.keys())
        self.symptom_to_idx = {s: i for i, s in enumerate(self.symptom_list)}
        self.disease_to_idx = {d: i for i, d in enumerate(self.disease_list)}
        self.weights = self._init_weights()

    def _init_weights(self):
        # Initialize weight matrix: symptoms x diseases
        weights = np.zeros((len(self.symptom_list), len(self.disease_list)))
        for symptom, diseases_map in SYMPTOM_DISEASE_MAP.items():
            if symptom in self.symptom_to_idx:
                s_idx = self.symptom_to_idx[symptom]
                for disease, weight in diseases_map.items():
                    if disease in self.disease_to_idx:
                        d_idx = self.disease_to_idx[disease]
                        weights[s_idx, d_idx] = weight
        return weights

    def predict(self, symptoms: List[str], age: int, gender: str) -> Dict[str, Any]:
        # Create symptom vector
        symptom_vector = np.zeros(len(self.symptom_list))
        for symptom in symptoms:
            s_lower = symptom.lower().strip()
            # Direct match
            if s_lower in self.symptom_to_idx:
                symptom_vector[self.symptom_to_idx[s_lower]] = 1.0
            else:
                # Fuzzy match - check if any known symptom is contained
                for known_symptom in self.symptom_list:
                    if known_symptom in s_lower or s_lower in known_symptom:
                        symptom_vector[self.symptom_to_idx[known_symptom]] = 0.7
                        break

        # Age and gender adjustments (simple bias)
        age_factor = 1.0
        if age > 65:
            age_factor = 1.1  # Older patients more likely to have chronic conditions
        elif age < 18:
            age_factor = 0.9  # Younger patients less likely to have chronic conditions

        # Compute disease scores
        scores = symptom_vector @ self.weights  # shape: (num_diseases,)

        # Normalize scores to probabilities
        if scores.sum() > 0:
            probabilities = scores / scores.sum()
        else:
            probabilities = np.ones(len(self.disease_list)) / len(self.disease_list)

        # Apply age factor and renormalize
        probabilities = probabilities * age_factor
        probabilities = probabilities / probabilities.sum()

        # Get top predictions
        top_indices = np.argsort(probabilities)[::-1][:5]
        all_predictions = []
        for idx in top_indices:
            disease_key = self.disease_list[idx]
            conf = float(probabilities[idx] * 100)
            all_predictions.append({
                "diseaseKey": disease_key,
                "diseaseName": DISEASE_NAMES.get(disease_key, disease_key),
                "confidence": round(conf, 1),
            })

        top_disease = all_predictions[0]
        return {
            "diseaseKey": top_disease["diseaseKey"],
            "confidence": top_disease["confidence"],
            "diseaseName": top_disease["diseaseName"],
            "allPredictions": all_predictions,
        }

model = SimpleDLModel()

@app.get("/health")
async def health():
    return {"status": "ok", "model": "simple_dl_v1"}

@app.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    try:
        result = model.predict(request.symptoms, request.age, request.gender)
        return PredictionResponse(
            diseaseId=result["diseaseKey"],
            confidence=result["confidence"],
            diseaseName=result["diseaseName"],
            allPredictions=result["allPredictions"],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
