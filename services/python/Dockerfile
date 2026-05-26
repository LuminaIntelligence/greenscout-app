# syntax=docker/dockerfile:1.7
# GreenScout Python service — FastAPI + uvicorn.
# Single-stage slim Python runtime. T-039 installs LibreOffice for headless
# PPTX -> PDF rendering. Slim (Debian) is chosen over alpine because LibreOffice
# packaging on alpine is unreliable.

FROM python:3.12-slim

WORKDIR /app

# Standard hygiene: don't buffer stdout, don't write .pyc to disk, fail fast on
# pip resolver issues.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# T-039 — LibreOffice headless PDF rendering. We install the smallest subset
# of the LibreOffice suite that can still render PPTX -> PDF:
#   * libreoffice-impress     PowerPoint reader.
#   * libreoffice-core        core conversion engine.
# Plus DejaVu + Liberation fonts so the rendered PDFs have sane fallbacks for
# any glyph the deck pulls outside of the embedded Gabarito family.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        libreoffice-core \
        libreoffice-impress \
        fonts-dejavu \
        fonts-liberation \
 && apt-get clean \
 && rm -rf /var/lib/apt/lists/*

# Non-root user (CLAUDE.md §3 hardening — defence in depth).
RUN groupadd --system --gid 1001 gsgroup \
 && useradd --system --uid 1001 --gid gsgroup --create-home gsuser

# Python deps first so this layer caches across source-only changes.
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Application code.
COPY --chown=gsuser:gsgroup app ./app

# PPTX template authored in T-037. The documents endpoint resolves
# /app/templates/Machbarkeitsstudie-PV-Template_v1_6.pptx by preference.
# Build context is services/python/, so we COPY from the repo root via
# the build-arg-less COPY ../../templates trick is not possible; instead
# the compose / CI build wires the template via a bind mount mounted at
# /app/templates. The default fallback path (relative to the source
# tree) keeps the test suite + dev runner happy.

USER gsuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
