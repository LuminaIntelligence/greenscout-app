"""T-035 - Tests for ``GET /version``.

100 % coverage on ``app.api.endpoints.version``.
"""

from fastapi.testclient import TestClient


def test_version_endpoint_returns_service_identity(client: TestClient) -> None:
    """GET /version returns the service name + version."""
    response = client.get("/version")
    assert response.status_code == 200
    body = response.json()
    assert body == {"name": "greenscout-pyservice", "version": "0.1.0"}


def test_version_endpoint_is_unauthenticated(client: TestClient) -> None:
    """GET /version works without X-API-Key (operations-friendly)."""
    response = client.get("/version")
    assert response.status_code == 200
