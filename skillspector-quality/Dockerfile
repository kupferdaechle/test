# syntax=docker/dockerfile:1
FROM python:3.13-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:0.5.21 /uv /uvx /bin/
ENV UV_LINK_MODE=copy

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl \
    && rm -rf /var/lib/apt/lists/*

RUN uv venv /opt/venv
ENV VIRTUAL_ENV=/opt/venv PATH="/opt/venv/bin:$PATH"

# Install the real SkillRater (skillspector) first so the bundled fallback stays
# dormant and the full 20-analyzer security scan is available. Not on PyPI, so we
# fetch the HTTPS tarball. Override the ref with --build-arg SKILLSPECTOR_REF=...
ARG SKILLSPECTOR_REF=main
RUN curl -sSL "https://codeload.github.com/larsroettig/SkillRater/tar.gz/refs/heads/${SKILLSPECTOR_REF}" \
        -o /tmp/skillrater.tar.gz \
    && mkdir -p /src/skillrater \
    && tar xzf /tmp/skillrater.tar.gz -C /src/skillrater --strip-components=1 \
    && uv pip install /src/skillrater

COPY pyproject.toml README.md /src/app/
COPY src /src/app/src
RUN uv pip install /src/app[code]

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
