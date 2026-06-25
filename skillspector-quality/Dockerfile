# syntax=docker/dockerfile:1
FROM python:3.13-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:0.5.21 /uv /uvx /bin/
ENV UV_LINK_MODE=copy

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN uv venv /opt/venv
ENV VIRTUAL_ENV=/opt/venv PATH="/opt/venv/bin:$PATH"

COPY pyproject.toml README.md /src/app/
COPY src /src/app/src
RUN uv pip install /src/app[code]

# Install webapp deps directly (they are declared in pyproject but also need
# to be accessible when running the webapp module from the project root).
RUN uv pip install fastapi "uvicorn[standard]" python-dotenv python-multipart

FROM python:3.13-slim AS runtime

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

RUN useradd -m -u 1001 appuser
USER appuser

WORKDIR /app
COPY webapp ./webapp
COPY src ./src

EXPOSE 8000

CMD ["python", "-m", "webapp.server"]
