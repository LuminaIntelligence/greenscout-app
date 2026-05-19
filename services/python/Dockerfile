# syntax=docker/dockerfile:1.7
# GreenScout Python service — FastAPI + uvicorn.
# Single-stage slim Python runtime. LibreOffice (for PDF rendering) lands in
# T-039 and is intentionally NOT installed here. Slim (Debian) is chosen over
# alpine because LibreOffice packaging on alpine is unreliable.

FROM python:3.12-slim

WORKDIR /app

# Standard hygiene: don't buffer stdout, don't write .pyc to disk, fail fast on
# pip resolver issues.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Non-root user (CLAUDE.md §3 hardening — defence in depth).
RUN groupadd --system --gid 1001 gsgroup \
 && useradd --system --uid 1001 --gid gsgroup --create-home gsuser

# Python deps first so this layer caches across source-only changes.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Application code.
COPY --chown=gsuser:gsgroup app ./app

USER gsuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
