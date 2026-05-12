# ── Stage 1: builder ──────────────────────────────────────────────────────────
FROM python:3.12-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache gcc musl-dev libffi-dev

COPY essential-req.txt .
RUN pip install --no-cache-dir --prefix=/install -r essential-req.txt

# ── Stage 2: runtime ──────────────────────────────────────────────────────────
FROM python:3.12-alpine AS runtime

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY app/ ./app/
COPY .env .env

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
