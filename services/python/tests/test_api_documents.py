"""T-038 / T-039 — Tests for ``POST /api/documents/generate``.

The real PPTX generator is exercised end-to-end against the real
template (T-037 placeholderised) in
``tests/test_pptx_generator.py``. Here we focus on the FastAPI
endpoint's request validation + happy-path wiring + error mapping;
LibreOffice is mocked subprocess-level via ``app.services.pdf_renderer``.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Any
from unittest.mock import patch

import pytest

if TYPE_CHECKING:
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
            "pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit": 1_200_000.0,
            "stromkosten_ohne_pv_eur_jahr": 28000.0,
            "stromkosten_mit_pv_eur_jahr": 19000.0,
        },
        "customer_name": "Max Mustermann",
        "object_name": "Einkaufszentrum Linzgau",
        "consultant_name": "Erika Beraterin",
        "image_before_path": None,
        "image_after_path": None,
    }


def _patch_libreoffice(tmp_path: Path) -> Any:
    """Patch subprocess.run + shutil.which so render_pdf writes a fake PDF beside the PPTX."""

    def fake_run(*args: object, **kwargs: object) -> Any:
        # The handler tells render_pdf to write `<stem>.pdf` into the same outdir as the PPTX.
        # Inspect the args list for the `--outdir` argument and the input path.
        cmd_obj = args[0] if args else kwargs.get("args")
        assert isinstance(cmd_obj, list)
        # python-pptx's stubbed list[Unknown] forces an explicit Any-cast here.
        cmd: list[str] = [str(item) for item in cmd_obj]  # pyright: ignore[reportUnknownVariableType, reportUnknownArgumentType]
        outdir_idx = cmd.index("--outdir") + 1
        outdir = Path(cmd[outdir_idx])
        pptx = Path(cmd[-1])
        (outdir / (pptx.stem + ".pdf")).write_bytes(b"%PDF-1.4 fake\n%%EOF")
        from types import SimpleNamespace

        return SimpleNamespace(returncode=0, stdout="ok", stderr="")

    return [
        patch("app.services.pdf_renderer.shutil.which", return_value="/usr/bin/libreoffice"),
        patch("app.services.pdf_renderer.subprocess.run", side_effect=fake_run),
    ]


# --- happy path ------------------------------------------------------


def test_documents_generate_happy_path(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Valid request -> PPTX + PDF written to GENERATED_DIR; response carries both paths."""
    monkeypatch.setenv("GENERATED_DIR", str(tmp_path))

    cms = _patch_libreoffice(tmp_path)
    for cm in cms:
        cm.start()
    try:
        response = client.post(
            "/api/documents/generate",
            json=_valid_request_payload(),
            headers={"X-API-Key": _VALID_KEY},
        )
    finally:
        for cm in cms:
            cm.stop()

    assert response.status_code == 200, response.text
    body = response.json()
    assert body["pptx_path"].endswith(".pptx")
    assert body["pdf_path"].endswith(".pdf")
    assert Path(body["pptx_path"]).exists()
    assert Path(body["pdf_path"]).exists()
    # Files should be inside the configured GENERATED_DIR.
    assert str(tmp_path) in body["pptx_path"]


def test_documents_generate_ignores_missing_image_paths(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Caller passes paths that don't exist -> generator falls back, request still 200."""
    monkeypatch.setenv("GENERATED_DIR", str(tmp_path))
    payload = _valid_request_payload()
    payload["image_before_path"] = "/no/such/before.png"
    payload["image_after_path"] = "/no/such/after.png"

    cms = _patch_libreoffice(tmp_path)
    for cm in cms:
        cm.start()
    try:
        response = client.post(
            "/api/documents/generate",
            json=payload,
            headers={"X-API-Key": _VALID_KEY},
        )
    finally:
        for cm in cms:
            cm.stop()

    assert response.status_code == 200, response.text


# --- auth + validation ----------------------------------------------


def test_documents_generate_missing_api_key_returns_401(client: TestClient) -> None:
    response = client.post("/api/documents/generate", json=_valid_request_payload())
    assert response.status_code == 401


def test_documents_generate_wrong_api_key_returns_401(client: TestClient) -> None:
    response = client.post(
        "/api/documents/generate",
        json=_valid_request_payload(),
        headers={"X-API-Key": "wrong-key"},
    )
    assert response.status_code == 401


def test_documents_generate_invalid_body_returns_422(client: TestClient) -> None:
    payload = _valid_request_payload()
    payload["customer_name"] = ""  # min_length=1 violation
    response = client.post(
        "/api/documents/generate",
        json=payload,
        headers={"X-API-Key": _VALID_KEY},
    )
    assert response.status_code == 422


def test_documents_generate_negative_kwp_returns_422(client: TestClient) -> None:
    payload = _valid_request_payload()
    payload["study"]["anlage_kwp"] = -1.0
    response = client.post(
        "/api/documents/generate",
        json=payload,
        headers={"X-API-Key": _VALID_KEY},
    )
    assert response.status_code == 422


# --- error mapping --------------------------------------------------


def test_documents_generate_500_when_template_missing(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """If the template path can't be resolved, the endpoint surfaces 500."""
    monkeypatch.setenv("GENERATED_DIR", str(tmp_path))
    with patch(
        "app.api.endpoints.documents._TEMPLATE_PATH",
        Path(tmp_path) / "does-not-exist.pptx",
    ):
        response = client.post(
            "/api/documents/generate",
            json=_valid_request_payload(),
            headers={"X-API-Key": _VALID_KEY},
        )
    assert response.status_code == 500
    assert "template missing" in response.json()["detail"].lower()


def test_documents_generate_500_when_libreoffice_fails(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """LibreOffice non-zero exit propagates as 500."""
    monkeypatch.setenv("GENERATED_DIR", str(tmp_path))
    from types import SimpleNamespace

    with (
        patch("app.services.pdf_renderer.shutil.which", return_value="/usr/bin/libreoffice"),
        patch(
            "app.services.pdf_renderer.subprocess.run",
            return_value=SimpleNamespace(returncode=1, stdout="", stderr="boom"),
        ),
    ):
        response = client.post(
            "/api/documents/generate",
            json=_valid_request_payload(),
            headers={"X-API-Key": _VALID_KEY},
        )

    assert response.status_code == 500
    assert "pdf rendering failed" in response.json()["detail"].lower()


def test_documents_generate_500_when_pptx_generator_throws(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """An unexpected PPTX-generation exception is surfaced as 500."""
    monkeypatch.setenv("GENERATED_DIR", str(tmp_path))
    with patch(
        "app.api.endpoints.documents.generate_pptx",
        side_effect=RuntimeError("synthetic"),
    ):
        response = client.post(
            "/api/documents/generate",
            json=_valid_request_payload(),
            headers={"X-API-Key": _VALID_KEY},
        )
    assert response.status_code == 500
    assert "pptx generation failed" in response.json()["detail"].lower()


# --- _build_context smoke (formatting) ------------------------------


def test_build_context_includes_every_known_placeholder() -> None:
    """The context builder fills every placeholder key referenced in the mapping doc."""
    from app.api.endpoints.documents import _build_context
    from app.schemas.documents import DocumentGenerateRequest

    req = DocumentGenerateRequest(**_valid_request_payload())
    ctx = _build_context(req)
    expected_keys = {
        "consultant_full_name",
        "customer_object_address",
        "customer_object_address_with_flurstueck",
        "customer_object_name",
        "customer_object_short_name_and_city",
        "flurstueck",
        "anlage_kwp",
        "modul_anzahl",
        "modul_flaeche_m2",
        "pv_erzeugung_kwh_jahr",
        "pv_eigenverbrauch_kwh_jahr",
        "pv_verkauf_ct_kwh",
        "eigenverbrauchsquote_prozent",
        "netzeinspeisung_kwh_jahr",
        "versorger_preis_ct_kwh",
        "pacht_einnahme_einmalig_eur",
        "ersparnis_pro_jahr_eur",
        "ersparnis_pro_monat_eur",
        "ersparnis_gesamt_vertragslaufzeit_eur",
        "gesamterzeugung_vertragslaufzeit_kwh",
        "gesamtvorteil_eur",
        "pv_eigenverbrauch_kwh_gesamt_vertragslaufzeit",
        "stromkosten_ohne_pv_eur_jahr",
        "stromkosten_mit_pv_eur_jahr",
        "szenario_1_preis_ct_kwh",
        "szenario_1_ersparnis_eur",
        "szenario_2_preis_ct_kwh",
        "szenario_2_ersparnis_eur",
        "szenario_3_preis_ct_kwh",
        "szenario_3_ersparnis_eur",
        "co2_tonnen_pro_jahr",
        "co2_hektar_mischwald",
        "co2_fussballfelder_pro_jahr",
        "co2_tonnen_gesamt_vertragslaufzeit",
        "co2_fussballfelder_gesamt_vertragslaufzeit",
        "termin_vorschlag_1",
        "termin_vorschlag_2",
    }
    assert expected_keys.issubset(set(ctx.keys()))


def test_german_currency_formatting() -> None:
    """27500 -> '27.500'."""
    from app.api.endpoints.documents import _format_currency_eur

    assert _format_currency_eur(27500.0) == "27.500"
    assert _format_currency_eur(1234567.0) == "1.234.567"


def test_german_decimal_formatting() -> None:
    from app.api.endpoints.documents import _format_decimal

    assert _format_decimal(1234.56, 2) == "1.234,56"
    assert _format_decimal(1.0, 0) == "1"


def test_anlage_kwp_formatting_integer_when_whole() -> None:
    from app.api.endpoints.documents import _format_anlage_kwp

    assert _format_anlage_kwp(257.0) == "257"
    assert _format_anlage_kwp(257.12) == "257,12"


def test_safe_filename_segment_strips_metacharacters() -> None:
    from app.api.endpoints.documents import _safe_filename_segment

    assert _safe_filename_segment("../../etc/passwd") == "etc_passwd"
    assert _safe_filename_segment("Linzgau Center / GmbH") == "Linzgau_Center_GmbH"
    assert _safe_filename_segment("") == "study"


def test_eigenverbrauchsquote_zero_division_guard() -> None:
    """pv_erzeugung==0 must not divide-by-zero in the eigenverbrauchsquote field."""
    from app.api.endpoints.documents import _build_context
    from app.schemas.documents import DocumentGenerateRequest

    payload = _valid_request_payload()
    payload["study"]["pv_erzeugung_kwh_jahr"] = 0.0
    payload["study"]["pv_eigenverbrauch_kwh_jahr"] = 0.0
    req = DocumentGenerateRequest(**payload)
    ctx = _build_context(req)
    assert ctx["eigenverbrauchsquote_prozent"] == "0"


def test_documents_generate_with_real_image_paths(
    client: TestClient, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    """When real image paths are passed, the generator embeds them in the PPTX."""
    from PIL import Image

    before = tmp_path / "before.png"
    after = tmp_path / "after.png"
    Image.new("RGB", (32, 32), (50, 50, 50)).save(before, "PNG")
    Image.new("RGB", (32, 32), (200, 200, 50)).save(after, "PNG")

    monkeypatch.setenv("GENERATED_DIR", str(tmp_path / "gen"))
    payload = _valid_request_payload()
    payload["image_before_path"] = str(before)
    payload["image_after_path"] = str(after)

    cms = _patch_libreoffice(tmp_path)
    for cm in cms:
        cm.start()
    try:
        response = client.post(
            "/api/documents/generate",
            json=payload,
            headers={"X-API-Key": _VALID_KEY},
        )
    finally:
        for cm in cms:
            cm.stop()

    assert response.status_code == 200, response.text
