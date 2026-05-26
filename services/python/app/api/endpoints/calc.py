"""T-035 — ``POST /api/calc`` endpoint.

Stateless calc endpoint. Accepts a full ``StudyCalcInput`` body, runs
the authoritative ``compose_all`` from ``app.domain.calculations``,
and returns the computed ``DerivedValues``. No DB connection — the
Next.js side owns the Prisma DB and sends the inputs verbatim.

Guarded by ``X-API-Key`` (shared secret with Next.js) — see
``app.api.dependencies.verify_api_key``.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.api.dependencies import verify_api_key
from app.domain.calculations import compose_all
from app.schemas.calc import DerivedValues, StudyCalcInput

router = APIRouter(prefix="/api", tags=["calc"])


@router.post(
    "/calc",
    response_model=DerivedValues,
    dependencies=[Depends(verify_api_key)],
    summary="Compute all derived values from a StudyCalcInput.",
)
def post_calc(inputs: StudyCalcInput) -> DerivedValues:
    """Run the authoritative calc pipeline and return all derived values."""
    return compose_all(inputs)
