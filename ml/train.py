"""
Train a real DL model on symptom->disease data.
In production, this would use a Kaggle medical dataset.
This script creates and saves a TensorFlow/Keras model.
"""
import numpy as np
import json
import os
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers

# Symptom list (must match the inference model)
SYMPTOM_LIST = [
    "fever", "cough", "shortness of breath", "chest pain", "fatigue",
    "headache", "nausea", "vomiting", "diarrhea", "constipation",
    "abdominal pain", "sore throat", "runny nose", "nasal congestion",
    "sneezing", "body aches", "joint pain", "muscle weakness", "dizziness",
    "fainting", "rash", "itching", "swelling", "bruising", "weight loss",
    "weight gain", "loss of appetite", "increased thirst", "frequent urination",
    "painful urination", "blood in urine", "back pain", "neck pain",
    "blurred vision", "double vision", "hearing loss", "tinnitus", "hoarseness",
    "difficulty swallowing", "heartburn", "bloating", "belching", "jaundice",
    "pale skin", "cold hands and feet", "night sweats", "insomnia",
    "excessive sleepiness", "memory loss", "confusion", "anxiety", "depression",
    "irritability", "mood swings", "tremors", "numbness", "tingling", "weakness",
    "paralysis", "seizure", "loss of consciousness", "chills",
    "swollen lymph nodes", "dry mouth", "excessive sweating", "palpitations",
    "swollen ankles", "coughing blood", "wheezing", "snoring",
    "male sexual dysfunction", "female sexual dysfunction", "irregular periods",
    "heavy menstrual bleeding", "pelvic pain", "breast pain", "breast lump",
    "vaginal discharge", "penile discharge", "genital itching", "genital ulcers",
    "easy bleeding", "easy bruising", "nosebleed", "bleeding gums",
    "delayed wound healing", "hair loss", "dry skin", "oily skin", "yellow eyes",
    "dark urine", "clay-colored stools", "black stools", "blood in stool",
    "mucus in stool",
]

DISEASE_LIST = [
    "influenza", "covid-19", "pneumonia", "common cold", "tuberculosis",
    "malaria", "asthma", "copd", "bronchitis", "heart failure",
    "coronary artery disease", "gerd", "panic disorder", "anemia", "depression",
    "hypothyroidism", "chronic kidney disease", "migraine", "hypertension",
    "stroke", "gastritis", "peptic ulcer", "gastroenteritis", "food poisoning",
    "allergic rhinitis", "sinusitis", "vertigo", "ibs", "ibd",
    "appendicitis", "gallstones", "pancreatitis", "fibromyalgia",
    "osteoarthritis", "rheumatoid arthritis", "gout", "lyme disease",
    "type 1 diabetes", "type 2 diabetes", "hyperthyroidism", "obesity",
    "eczema", "psoriasis", "acne", "conjunctivitis", "menopause",
    "pcos", "cancer", "hiv", "liver disease", "kidney disease",
    "anxiety disorder", "bipolar disorder", "ptsd", "alzheimer disease",
    "dementia", "parkinson disease", "multiple sclerosis", "epilepsy",
    "brain tumor", "meningitis", "otitis media", "meniere disease",
    "cushing syndrome", "sleep apnea", "narcolepsy", "hemophilia",
    "sjogren syndrome", "alopecia", "pms", "endometriosis", "fibroids",
    "bacterial vaginosis", "yeast infection", "urethritis", "std",
    "genital herpes", "syphilis", "hemorrhoids", "colon cancer",
    "gi bleeding", "lung cancer", "spinal cord injury", "myasthenia gravis",
    "essential tremor", "diabetes insipidus",
]

# Generate synthetic training data based on symptom-disease weights
np.random.seed(42)

SYMPTOM_DISEASE_WEIGHTS = {
    # This would be populated from real medical data in production
    "fever": {"influenza": 0.9, "covid-19": 0.8, "pneumonia": 0.7, "malaria": 0.9},
    "cough": {"common cold": 0.8, "influenza": 0.8, "covid-19": 0.8, "pneumonia": 0.9},
    "shortness of breath": {"asthma": 0.9, "copd": 0.9, "covid-19": 0.7, "pneumonia": 0.8},
    "chest pain": {"coronary artery disease": 0.9, "heart failure": 0.5, "panic disorder": 0.5},
    "fatigue": {"influenza": 0.8, "covid-19": 0.7, "anemia": 0.8, "depression": 0.6, "hypothyroidism": 0.8},
    "headache": {"migraine": 0.9, "influenza": 0.7, "hypertension": 0.5, "sinusitis": 0.5},
    "nausea": {"gastritis": 0.7, "gastroenteritis": 0.8, "migraine": 0.6},
    "vomiting": {"gastroenteritis": 0.8, "food poisoning": 0.9},
    "diarrhea": {"gastroenteritis": 0.9, "ibs": 0.6, "food poisoning": 0.8},
    "abdominal pain": {"gastritis": 0.8, "ibs": 0.8, "appendicitis": 0.7, "gallstones": 0.7},
    "sore throat": {"common cold": 0.7, "influenza": 0.5, "covid-19": 0.4},
    "runny nose": {"common cold": 0.9, "allergic rhinitis": 0.9},
    "sneezing": {"common cold": 0.8, "allergic rhinitis": 0.9},
    "nasal congestion": {"common cold": 0.8, "allergic rhinitis": 0.8, "sinusitis": 0.8},
    "body aches": {"influenza": 0.8, "covid-19": 0.6, "fibromyalgia": 0.8},
    "joint pain": {"osteoarthritis": 0.9, "rheumatoid arthritis": 0.8, "gout": 0.9},
    "muscle weakness": {"hypothyroidism": 0.6, "multiple sclerosis": 0.5},
    "dizziness": {"vertigo": 0.9, "anemia": 0.5, "hypoglycemia": 0.6, "hypertension": 0.4},
    "rash": {"eczema": 0.8, "psoriasis": 0.7, "lyme disease": 0.7},
    "joint pain": {"osteoarthritis": 0.9, "rheumatoid arthritis": 0.8},
    "increased thirst": {"type 2 diabetes": 0.8, "type 1 diabetes": 0.8},
    "frequent urination": {"type 2 diabetes": 0.8, "type 1 diabetes": 0.8, "urinary tract infection": 0.7},
    "painful urination": {"urinary tract infection": 0.9},
    "memory loss": {"alzheimer disease": 0.9, "dementia": 0.8},
    "tremors": {"parkinson disease": 0.8, "hyperthyroidism": 0.6},
    "seizure": {"epilepsy": 0.9},
    "wheezing": {"asthma": 0.9, "copd": 0.8},
}

def generate_training_data(num_samples=5000):
    X = []
    y = []
    
    symptom_to_idx = {s: i for i, s in enumerate(SYMPTOM_LIST)}
    disease_to_idx = {d: i for i, d in enumerate(DISEASE_LIST)}
    
    for _ in range(num_samples):
        # Pick a random disease
        disease = np.random.choice(DISEASE_LIST)
        d_idx = disease_to_idx[disease]
        
        # Create symptom vector - symptoms associated with this disease are more likely
        symptom_vector = np.zeros(len(SYMPTOM_LIST))
        
        # Get symptoms associated with this disease
        for symptom, disease_weights in SYMPTOM_DISEASE_WEIGHTS.items():
            if disease in disease_weights:
                if np.random.random() < disease_weights[disease]:
                    symptom_vector[symptom_to_idx[symptom]] = 1.0
        
        # Add some random noise symptoms
        num_noise = np.random.randint(0, 3)
        for _ in range(num_noise):
            noise_symptom = np.random.choice(SYMPTOM_LIST)
            symptom_vector[symptom_to_idx[noise_symptom]] = 1.0
        
        X.append(symptom_vector)
        y.append(disease_to_idx[disease])
    
    return np.array(X), np.array(y)

def train_model():
    X, y = generate_training_data()
    
    # Split train/test
    split = int(0.8 * len(X))
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]
    
    model = keras.Sequential([
        layers.Dense(128, activation='relu', input_shape=(len(SYMPTOM_LIST),)),
        layers.Dropout(0.3),
        layers.Dense(64, activation='relu'),
        layers.Dropout(0.2),
        layers.Dense(32, activation='relu'),
        layers.Dense(len(DISEASE_LIST), activation='softmax')
    ])
    
    model.compile(
        optimizer='adam',
        loss='sparse_categorical_crossentropy',
        metrics=['accuracy']
    )
    
    model.fit(X_train, y_train, epochs=20, batch_size=32, validation_split=0.2, verbose=1)
    
    loss, accuracy = model.evaluate(X_test, y_test, verbose=0)
    print(f"Test accuracy: {accuracy:.4f}")
    
    # Save model
    model.save("ml/model/disease_model.h5")
    
    # Save metadata
    with open("ml/model/metadata.json", "w") as f:
        json.dump({
            "symptom_list": SYMPTOM_LIST,
            "disease_list": DISEASE_LIST,
        }, f)
    
    print("Model saved to ml/model/disease_model.h5")

if __name__ == "__main__":
    os.makedirs("ml/model", exist_ok=True)
    train_model()
