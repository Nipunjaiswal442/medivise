"""
Medivise inference service (FastAPI).

POST /predict {symptoms, age, gender} -> ranked list of likely conditions.

Two engines, chosen at start-up:
  * "keras"      - if ml/model/disease_model.keras and ml/model/metadata.json exist (train.py) and
                   TensorFlow is installed. Output: softmax probabilities.
  * "rule-based" - otherwise. Weighted overlap between the entered symptoms and the symptom
                   weights in ml/knowledge.json (exported from the Convex seed data with
                   `npm run export:ml`). This is not machine learning.

Neither engine uses age or gender yet; they are accepted for forward compatibility.
Outputs are decision-support hints from unvalidated demo data, not diagnoses.
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

HERE = Path(__file__).resolve().parent
KNOWLEDGE_PATH = HERE / "knowledge.json"
MODEL_PATH = HERE / "model" / "disease_model.keras"
METADATA_PATH = HERE / "model" / "metadata.json"
TOP_N = 5


def normalize(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


class Predictor:
    def __init__(self) -> None:
        if not KNOWLEDGE_PATH.exists():
            raise RuntimeError(
                f"{KNOWLEDGE_PATH} is missing. Run `npm run export:ml` from the repository root."
            )
        knowledge = json.loads(KNOWLEDGE_PATH.read_text())
        self.diseases: List[str] = knowledge["diseases"]
        self.symptoms: List[str] = knowledge["symptoms"]
        self.symptom_index = {s: i for i, s in enumerate(self.symptoms)}
        self.disease_index = {d: i for i, d in enumerate(self.diseases)}
        self._key_to_index = {normalize(s): i for i, s in enumerate(self.symptoms)}

        # weights[symptom, disease]
        self.weights = np.zeros((len(self.symptoms), len(self.diseases)))
        for link in knowledge["links"]:
            self.weights[self.symptom_index[link["symptom"]], self.disease_index[link["disease"]]] = link["weight"]
        self.disease_totals = self.weights.sum(axis=0)

        self.keras_model: Optional[Any] = None
        self.name = "rule-based"
        self._try_load_keras()

    def _try_load_keras(self) -> None:
        if not (MODEL_PATH.exists() and METADATA_PATH.exists()):
            return
        try:
            from tensorflow import keras  # type: ignore
        except ImportError:
            print("Trained model found but TensorFlow is not installed; using the rule-based engine.")
            return
        meta = json.loads(METADATA_PATH.read_text())
        if meta["symptom_list"] != self.symptoms or meta["disease_list"] != self.diseases:
            print("Trained model does not match ml/knowledge.json (re-run train.py); using the rule-based engine.")
            return
        self.keras_model = keras.models.load_model(MODEL_PATH)
        self.name = "keras"

    def match(self, entered: List[str]) -> tuple[List[int], List[str]]:
        """Maps free text to symptom indices: exact, then known-name-in-text, then unique substring."""
        keys = list(self._key_to_index)
        matched: List[int] = []
        unmatched: List[str] = []
        for raw in entered:
            key = normalize(raw)
            if not key:
                continue
            idx = self._key_to_index.get(key)
            if idx is None:
                inside = [k for k in keys if len(k) >= 3 and f" {k} " in f" {key} "]
                if inside:
                    idx = self._key_to_index[max(inside, key=len)]
            if idx is None and len(key) >= 4:
                containing = [k for k in keys if f" {key} " in f" {k} "]
                if len(containing) == 1:
                    idx = self._key_to_index[containing[0]]
            if idx is None:
                unmatched.append(raw.strip())
            elif idx not in matched:
                matched.append(idx)
        return matched, unmatched

    def predict(self, symptoms: List[str]) -> Dict[str, Any]:
        matched, unmatched = self.match(symptoms)
        if not matched:
            return {"model": self.name, "allPredictions": [], "unmatchedSymptoms": unmatched}

        vector = np.zeros(len(self.symptoms))
        vector[matched] = 1.0

        if self.keras_model is not None:
            scores = self.keras_model.predict(vector[None, :], verbose=0)[0] * 100.0
        else:
            hit = vector @ self.weights
            with np.errstate(divide="ignore", invalid="ignore"):
                scores = np.where(self.disease_totals > 0, hit / self.disease_totals, 0.0) * 100.0
            scores = np.minimum(scores, 99.0)

        ranked = [i for i in np.argsort(scores)[::-1] if scores[i] > 0][:TOP_N]
        predictions = [
            {"diseaseName": self.diseases[i], "confidence": round(float(scores[i]), 1)} for i in ranked
        ]
        return {"model": self.name, "allPredictions": predictions, "unmatchedSymptoms": unmatched}


class PredictionRequest(BaseModel):
    symptoms: List[str] = Field(min_length=1, max_length=30)
    age: int = Field(ge=0, le=130)
    gender: str


class Prediction(BaseModel):
    diseaseName: str
    confidence: float


class PredictionResponse(BaseModel):
    model: str
    diseaseId: Optional[str] = None  # kept for compatibility: same as diseaseName
    diseaseName: Optional[str] = None
    confidence: float = 0.0
    allPredictions: List[Prediction]
    unmatchedSymptoms: List[str]


app = FastAPI(title="Medivise inference service")
predictor = Predictor()


@app.get("/health")
def health() -> Dict[str, Any]:
    return {"status": "ok", "model": predictor.name, "diseases": len(predictor.diseases)}


@app.post("/predict", response_model=PredictionResponse)
def predict(request: PredictionRequest) -> PredictionResponse:
    try:
        result = predictor.predict(request.symptoms)
    except Exception as exc:  # pragma: no cover - defensive
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    top = result["allPredictions"][0] if result["allPredictions"] else None
    return PredictionResponse(
        model=result["model"],
        diseaseId=top["diseaseName"] if top else None,
        diseaseName=top["diseaseName"] if top else None,
        confidence=top["confidence"] if top else 0.0,
        allPredictions=result["allPredictions"],
        unmatchedSymptoms=result["unmatchedSymptoms"],
    )


if __name__ == "__main__":
    import os

    import uvicorn

    uvicorn.run(app, host=os.environ.get("HOST", "127.0.0.1"), port=int(os.environ.get("PORT", "8000")))
