"""T-035 — FastAPI dependencies.

`verify_api_key` is the shared-secret guard applied to every non-health,
non-version endpoint. The Next.js side reads ``PYTHON_SERVICE_API_KEY``
from env and sends it as the ``X-API-Key`` header on every outbound
call (see ``src/lib/python-service-client.ts``).

The Python service refuses to start if ``PYTHON_SERVICE_API_KEY`` is
unset — there's no implicit fallback. Validation happens lazily on the
first protected request so the test client can still drive ``/health``
and ``/version`` without env setup.

@see SPEC.md §6.3 (Security)
@see CLAUDE.md §7.3 (Auth/security changes — schema pre-approved via
     .env.example PYTHON_SERVICE_API_KEY since T-006)
"""

from __future__ import annotations

import os
import secrets

from fastapi import Header, HTTPException, status

_API_KEY_ENV = "PYTHON_SERVICE_API_KEY"


def _expected_key() -> str:
    """Return the configured shared secret or raise 500 if unset.

    Lazy lookup keeps ``/health`` and ``/version`` reachable in test
    environments that omit the env entirely.
    """
    value = os.environ.get(_API_KEY_ENV, "")
    if not value:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{_API_KEY_ENV} is not configured on the Python service.",
        )
    return value


def verify_api_key(x_api_key: str | None = Header(default=None)) -> None:
    """Validate the ``X-API-Key`` header against ``PYTHON_SERVICE_API_KEY``.

    Returns silently on a match; raises ``401`` on a missing or
    incorrect key. ``secrets.compare_digest`` provides constant-time
    comparison to prevent timing-side-channel attacks against the
    shared secret.
    """
    if x_api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-API-Key header.",
        )

    expected = _expected_key()
    if not secrets.compare_digest(x_api_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid X-API-Key.",
        )
