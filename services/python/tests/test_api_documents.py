"""T-035 - Tests for ``POST /api/documents/generate`` (Slice 3a STUB).

100 % coverage on ``app.api.endpoints.documents``.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient

# gitleaks:allow — non-secret literal used only in unit tests to drive the
# X-API-Key dependency against a known value.
_VALID_KEY = "test-fake-not-a-secret-fixture-value-only"  # gitleaks:allow


@pytest.fixture(autouse=True)
def set_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """Every test in this module runs with the shared secret set."""
    monkeypatch.setenv("PYTHON_SERVICE_API_KEY", _VALID_KEY)


def _valid_request_payload() -> dict[str, Any]:
    """Return a representative valid DocumentGenerateRequest."""
    return {
        "study": {
            "anlage_kwp": 100.0,
            "pv_erzeugung_kwh_jahr": 95000.0,
            "pv_eigenverbrauch_kwh_jahr": 60000.0,
            "pv_verkauf_eur_kwh": 0.08,
            "verbrauch_kwh_jahr": 80000.0,
            "versorger_preis_eur_kwh": 0.35,
            "pacht_eur_pro_kwp": 100.0,
            "vertragslaufzeit_jahre": 20,
            "co2_override": False,
        },
        "derived_values": {
            "ersparnis_pro_jahr": 16200.0,
            "ersparnis_pro_monat": 1350.0,
            "ersparnis_20_jahre": 324000.0,
            "pacht_einnahme_einmalig": 200000.0,
            "gesamterzeugung_20j": 1900000.0,
            "gesamtvorteil": 524000.0,
            "co2_tonnen_pro_jahr": 45.03,
            "co2_hektar_mischwald": 0.797,
            "co2_fussballfelder_pro_jahr": 1.02,
        },
        "customer_name": "Max Mustermann",
        "object_name": "Einkaufszentrum Linzgau",
        "consultant_name": "Erika Beraterin",
        "image_before_path": None,
        "image_after_path": None,
    }


def test_documents_generate_returns_501_stub(client: TestClient) -> None:
    """POST /api/documents/generate with valid body returns 501 stub."""
    response = client.post(
        "/api/documents/generate",
        json=_valid_request_payload(),
        headers={"X-API-Key": _VALID_KEY},
    )
    assert response.status_code == 501
    body = response.json()
    assert body["status"] == "pending"
    assert "Slice 3b" in body["message"]
    assert "T-037" in body["blocking_task"]


def test_documents_generate_missing_api_key_returns_401(client: TestClient) -> None:
    """No X-API-Key header → 401."""
    response = client.post("/api/documents/generate", json=_valid_request_payload())
    assert response.status_code == 401


def test_documents_generate_wrong_api_key_returns_401(client: TestClient) -> None:
    """Wrong X-API-Key value → 401."""
    response = client.post(
        "/api/documents/generate",
        json=_valid_request_payload(),
        headers={"X-API-Key": "wrong-key"},
    )
    assert response.status_code == 401


def test_documents_generate_invalid_body_returns_422(client: TestClient) -> None:
    """Pydantic validation runs even though the handler stubs — 422 on bad body."""
    payload = _valid_request_payload()
    payload["customer_name"] = ""  # min_length=1 violation
    response = client.post(
        "/api/documents/generate",
        json=payload,
        headers={"X-API-Key": _VALID_KEY},
    )
    assert response.status_code == 422


def test_documents_generate_negative_kwp_in_study_returns_422(client: TestClient) -> None:
    """Validation cascades into nested StudyCalcInput → 422 on negative kWp."""
    payload = _valid_request_payload()
    payload["study"]["anlage_kwp"] = -1.0
    response = client.post(
        "/api/documents/generate",
        json=payload,
        headers={"X-API-Key": _VALID_KEY},
    )
    assert response.status_code == 422
