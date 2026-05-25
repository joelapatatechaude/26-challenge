FROM registry.access.redhat.com/ubi9/python-311:latest

WORKDIR /app

# Install dependencies as root before dropping to unprivileged user
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source and read-only skills knowledge base
COPY src/ ./src/
COPY skills-output/ ./skills-output/
COPY config/ ./config/

# Writable output dir — will be overridden by a PVC mount in OpenShift
RUN mkdir -p /app/decks && chown -R 1001:0 /app/decks && chmod -R g=u /app/decks

# UBI9 python-311 already drops to UID 1001
USER 1001

ENV PYTHONPATH=/app/src \
    SKILLS_ROOT=/app/skills-output \
    DECKS_DIR=/app/decks \
    PYTHONUNBUFFERED=1

EXPOSE 8080

CMD ["uvicorn", "api.app:app", "--host", "0.0.0.0", "--port", "8080", "--log-level", "info"]
