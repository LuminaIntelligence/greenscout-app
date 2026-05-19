"""Shared pytest fixtures for the GreenScout Python service tests."""

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session")
def client() -> Iterator[TestClient]:
    """Synchronous FastAPI test client. Reused across all tests in a session."""
    with TestClient(app) as test_client:
        yield test_client
