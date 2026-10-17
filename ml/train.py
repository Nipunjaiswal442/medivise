"""
Trains a small Keras classifier on SYNTHETIC data and saves it where serve.py looks for it.

    pip install -r requirements-train.txt
    python train.py            # run from anywhere; writes ml/model/

IMPORTANT: the training samples are generated from the very same symptom weights in
ml/knowledge.json, so the reported accuracy only measures how well the network re-learns those
hand-written weights. It says nothing about clinical validity. Replace generate_training_data()
with real, de-identified clinical data (and validate with clinicians) before relying on it.
"""
from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
KNOWLEDGE_PATH = HERE / "knowledge.json"
MODEL_DIR = HERE / "model"
SAMPLES = 20000
SEED = 42


def generate_training_data(knowledge: dict, rng: np.random.Generator):
    symptoms = knowledge["symptoms"]
    diseases = knowledge["diseases"]
    s_idx = {s: i for i, s in enumerate(symptoms)}
    d_idx = {d: i for i, d in enumerate(diseases)}

    profile = defaultdict(list)  # disease -> [(symptom index, weight)]
    for link in knowledge["links"]:
        profile[link["disease"]].append((s_idx[link["symptom"]], link["weight"]))
    trainable = [d for d in diseases if profile[d]]

    X = np.zeros((SAMPLES, len(symptoms)), dtype="float32")
    y = np.zeros(SAMPLES, dtype="int64")
    for n in range(SAMPLES):
        disease = trainable[rng.integers(len(trainable))]
        for idx, weight in profile[disease]:
            if rng.random() < weight:
                X[n, idx] = 1.0
        for idx in rng.integers(len(symptoms), size=rng.integers(0, 3)):  # 0-2 unrelated symptoms
            X[n, idx] = 1.0
        if not X[n].any():  # make sure every sample has at least one symptom
            X[n, profile[disease][0][0]] = 1.0
        y[n] = d_idx[disease]
    return X, y


def main() -> None:
    import tensorflow as tf
    from tensorflow import keras
    from tensorflow.keras import layers

    knowledge = json.loads(KNOWLEDGE_PATH.read_text())
    rng = np.random.default_rng(SEED)
    tf.keras.utils.set_random_seed(SEED)

    X, y = generate_training_data(knowledge, rng)
    split = int(0.8 * len(X))  # samples are i.i.d., so a plain split is fine
    X_train, X_test, y_train, y_test = X[:split], X[split:], y[:split], y[split:]

    model = keras.Sequential(
        [
            layers.Input(shape=(len(knowledge["symptoms"]),)),
            layers.Dense(128, activation="relu"),
            layers.Dropout(0.3),
            layers.Dense(64, activation="relu"),
            layers.Dropout(0.2),
            layers.Dense(len(knowledge["diseases"]), activation="softmax"),
        ]
    )
    model.compile(optimizer="adam", loss="sparse_categorical_crossentropy", metrics=["accuracy"])
    model.fit(X_train, y_train, epochs=15, batch_size=64, validation_split=0.2, verbose=2)
    _, accuracy = model.evaluate(X_test, y_test, verbose=0)
    print(f"Accuracy on held-out synthetic samples: {accuracy:.3f} (not a clinical metric)")

    MODEL_DIR.mkdir(exist_ok=True)
    model.save(MODEL_DIR / "disease_model.keras")
    (MODEL_DIR / "metadata.json").write_text(
        json.dumps({"symptom_list": knowledge["symptoms"], "disease_list": knowledge["diseases"]})
    )
    print(f"Saved model to {MODEL_DIR}")


if __name__ == "__main__":
    main()
