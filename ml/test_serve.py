"""Run with: pip install -r requirements-dev.txt && pytest   (from the ml/ directory)"""
from fastapi.testclient import TestClient

import serve

client = TestClient(serve.app)


def post(symptoms, age=40, gender="Male"):
    return client.post("/predict", json={"symptoms": symptoms, "age": age, "gender": gender})


def test_health():
    body = client.get("/health").json()
    assert body["status"] == "ok" and body["diseases"] == 84


def test_flu_like_symptoms_rank_flu_first():
    body = post(["fever", "cough", "body aches", "chills"]).json()
    assert body["allPredictions"][0]["diseaseName"] == "Influenza"
    assert body["diseaseName"] == body["allPredictions"][0]["diseaseName"]
    confidences = [p["confidence"] for p in body["allPredictions"]]
    assert confidences == sorted(confidences, reverse=True) and max(confidences) <= 99


def test_free_text_and_unknown_symptoms():
    body = post(["high fever", "Sore-throat", "banana craving"]).json()
    assert body["unmatchedSymptoms"] == ["banana craving"]
    assert body["allPredictions"]


def test_nothing_recognised_returns_empty_not_an_error():
    body = post(["zzz"]).json()
    assert body["allPredictions"] == [] and body["diseaseName"] is None


def test_validation():
    assert post([]).status_code == 422
    assert post(["fever"], age=-1).status_code == 422
    assert post(["fever"], age=200).status_code == 422


def test_names_match_the_convex_knowledge_base():
    import json

    knowledge = json.loads(serve.KNOWLEDGE_PATH.read_text())
    names = {p["diseaseName"] for p in post(["fever", "cough", "headache", "nausea"]).json()["allPredictions"]}
    assert names <= set(knowledge["diseases"])
