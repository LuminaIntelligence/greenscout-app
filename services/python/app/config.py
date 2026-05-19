"""Application configuration.

Will adopt `pydantic-settings` when the first env-consuming feature lands
(likely T-035 — the FastAPI study/calc/document endpoints). The env
variables to read are documented in the root `.env.example` (see
PYTHON_SERVICE_API_KEY, PYTHON_SERVICE_TIMEOUT_SECONDS, UPLOADS_DIR,
GENERATED_DIR, etc.).
"""

# TODO(T-035): pydantic-settings integration with env-loading from .env.
