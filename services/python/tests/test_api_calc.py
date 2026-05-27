"""T-035 - Tests for ``POST /api/calc`` + the verify_api_key dependency.

100 % coverage on ``app.api.endpoints.calc`` and ``app.api.dependencies``.
"""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.domain.calculations import compose_all
from app.schemas.calc import StudyCalcInput

# gitleaks:allow — non-secret literal used only in unit tests to drive the
# X-API-Key dependency against a known value.
_VALID_KEY = "test-fake-not-a-secret-fixture-value-only"  # gitleaks:allow
_TOLERANCE_MONETARY = 1e-6
_TOLERANCE_CO2 = 1e-4


@pytest.fixture(autouse=True)
def set_api_key(monkeypatch: pytest.MonkeyPatch) -> None:
    """Every test in this module runs with the shared secret set."""
    monkeypatch.setenv("PYTHON_SERVICE_API_KEY", _VALID_KEY)


def _valid_input_payload() -> dict[str, Any]:
    """Return a representative valid StudyCalcInput as a JSON-serialisable dict."""
    return {
        "anlage_kwp": 100.0,
        "pv_erzeugung_kwh_jahr": 95000.0,
        "pv_eigenverbrauch_kwh_jahr": 60000.0,
        "pv_verkauf_eur_kwh": 0.08,
        "verbrauch_kwh_jahr": 80000.0,
        "versorger_preis_eur_kwh": 0.35,
        "pacht_eur_pro_kwp": 100.0,
        "vertragslaufzeit_jahre": 20,
        "co2_override": False,
    }


def _close(actual: float, expected: float, tolerance: float) -> bool:
    """Relative tolerance check matching the T-034 parity convention."""
    if expected == 0:
        return abs(actual) <= tolerance
    return abs(actual - expected) / abs(expected) <= tolerance


def test_calc_happy_path_returns_compose_all(client: TestClient) -> None:
    """POST /api/calc with valid body returns the compose_all output verbatim."""
    payload = _valid_input_payload()
    response = client.post("/api/calc", json=payload, headers={"X-API-Key": _VALID_KEY})

    assert response.status_code == 200
    body = response.json()

    expected = compose_all(StudyCalcInput(**payload))
    assert _close(body["ersparnis_pro_jahr"], expected.ersparnis_pro_jahr, _TOLERANCE_MONETARY)
    assert _close(body["ersparnis_pro_monat"], expected.ersparnis_pro_monat, _TOLERANCE_MONETARY)
    assert _close(body["ersparnis20_jahre"], expected.ersparnis20_jahre, _TOLERANCE_MONETARY)
    assert _close(
        body["pacht_einnahme_einmalig"], expected.pacht_einnahme_einmalig, _TOLERANCE_MONETARY
    )
    assert _close(body["gesamterzeugung20j"], expected.gesamterzeugung20j, _TOLERANCE_MONETARY)
    assert _close(body["gesamtvorteil"], expected.gesamtvorteil, _TOLERANCE_MONETARY)
    assert _close(body["co2_tonnen_pro_jahr"], expected.co2_tonnen_pro_jahr, _TOLERANCE_CO2)
    assert _close(body["co2_hektar_mischwald"], expected.co2_hektar_mischwald, _TOLERANCE_CO2)
    assert _close(
        body["co2_fussballfelder_pro_jahr"], expected.co2_fussballfelder_pro_jahr, _TOLERANCE_CO2
    )


def test_calc_missing_api_key_returns_401(client: TestClient) -> None:
    """No X-API-Key header -> 401."""
    response = client.post("/api/calc", json=_valid_input_payload())
    assert response.status_code == 401
    assert "Missing X-API-Key" in response.json()["detail"]


def test_calc_wrong_api_key_returns_401(client: TestClient) -> None:
    """Wrong X-API-Key value -> 401."""
    response = client.post(
        "/api/calc",
        json=_valid_input_payload(),
        headers={"X-API-Key": "wrong-key"},
    )
    assert response.status_code == 401
    assert "Invalid X-API-Key" in response.json()["detail"]


def test_calc_negative_kwp_returns_422(client: TestClient) -> None:
    """Pydantic rejects negative anlage_kwp (ge=0 constraint) -> 422."""
    payload = _valid_input_payload()
    payload["anlage_kwp"] = -1.0
    response = client.post("/api/calc", json=payload, headers={"X-API-Key": _VALID_KEY})
    assert response.status_code == 422


def test_calc_negative_versorger_preis_returns_422(client: TestClient) -> None:
    """Pydantic rejects negative versorger_preis_eur_kwh -> 422."""
    payload = _valid_input_payload()
    payload["versorger_preis_eur_kwh"] = -0.1
    response = client.post("/api/calc", json=payload, headers={"X-API-Key": _VALID_KEY})
    assert response.status_code == 422


def test_calc_zero_vertragslaufzeit_returns_422(client: TestClient) -> None:
    """Pydantic rejects vertragslaufzeit_jahre < 1 -> 422."""
    payload = _valid_input_payload()
    payload["vertragslaufzeit_jahre"] = 0
    response = client.post("/api/calc", json=payload, headers={"X-API-Key": _VALID_KEY})
    assert response.status_code == 422


def test_calc_extra_field_returns_422(client: TestClient) -> None:
    """Pydantic ``extra=forbid`` rejects unknown fields -> 422."""
    payload = _valid_input_payload()
    payload["unknown_field"] = "garbage"
    response = client.post("/api/calc", json=payload, headers={"X-API-Key": _VALID_KEY})
    assert response.status_code == 422


def test_calc_api_key_unset_returns_500(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """If PYTHON_SERVICE_API_KEY is unset, protected endpoints return 500."""
    monkeypatch.delenv("PYTHON_SERVICE_API_KEY", raising=False)
    response = client.post(
        "/api/calc",
        json=_valid_input_payload(),
        headers={"X-API-Key": "anything"},
    )
    assert response.status_code == 500
    assert "PYTHON_SERVICE_API_KEY" in response.json()["detail"]


def test_calc_with_co2_override(client: TestClient) -> None:
    """co2_override=True with override values flows through unchanged."""
    payload = _valid_input_payload()
    payload["co2_override"] = True
    payload["co2_tonnen_pro_jahr_override"] = 50.0
    payload["co2_hektar_mischwald_override"] = 0.9
    payload["co2_fussballfelder_pro_jahr_override"] = 1.15

    response = client.post("/api/calc", json=payload, headers={"X-API-Key": _VALID_KEY})
    assert response.status_code == 200
    body = response.json()
    assert _close(body["co2_tonnen_pro_jahr"], 50.0, _TOLERANCE_CO2)
    assert _close(body["co2_hektar_mischwald"], 0.9, _TOLERANCE_CO2)
    assert _close(body["co2_fussballfelder_pro_jahr"], 1.15, _TOLERANCE_CO2)
