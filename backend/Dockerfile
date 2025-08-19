# ---------- 1) Frontend build (Vite) ----------
FROM node:20-alpine AS fe
WORKDIR /app
COPY frontend/ ./
RUN npm install
RUN npm run build

# ---------- 2) Backend build (Django) ----------
FROM python:3.12-slim-bookworm AS be
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /srv/app

# --- Офлайн wheelhouse и requirements ---
COPY wheelhouse/ /wheels/
COPY backend/requirements/prod.txt /srv/app/requirements.txt

# --- Диагностическая офлайн-установка по одному пакету (POSIX sh) ---
ENV PIP_NO_INDEX=1 PIP_FIND_LINKS=/wheels
RUN set -eu; \
    awk 'NF && $1 !~ /^#/' /srv/app/requirements.txt > /tmp/req_no_comments.txt; \
    grep -vE '^[[:space:]]*-' /tmp/req_no_comments.txt > /tmp/req_clean.txt || true; \
    i=0; \
    while IFS= read -r line; do \
        i=$((i+1)); \
        log="/tmp/pip_${i}.log"; \
        echo ">>> Installing: ${line}"; \
        python -m pip install -vvv --only-binary=:all: "${line}" --log "${log}"; \
    done < /tmp/req_clean.txt

# --- Код бэкенда ---
COPY backend/ /srv/app/

# --- Фронтовая статика ---
COPY --from=fe /app/dist/ /srv/app/static_front/
COPY frontend/public/styles.css /srv/app/static_front/styles.css

EXPOSE 8000
CMD ["gunicorn", "mycloud.wsgi:application", "-b", "0.0.0.0:8000", "-w", "3"]