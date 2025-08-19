# ---------- 1) Frontend build (Vite) ----------
FROM node:20-alpine AS fe
WORKDIR /app
COPY frontend/ ./
RUN npm install && npm run build

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

# --- Устанавливаем зависимости ---
ENV PIP_NO_INDEX=1 PIP_FIND_LINKS=/wheels
RUN set -eu; \
    awk 'NF && $1 !~ /^#/' /srv/app/requirements.txt > /tmp/req_no_comments.txt; \
    grep -vE '^[[:space:]]*-' /tmp/req_no_comments.txt > /tmp/req_clean.txt || true; \
    pip install --no-cache-dir -r /tmp/req_clean.txt

# --- Копируем backend код ---
COPY backend/ /srv/app/

# --- Копируем статические файлы фронта из предыдущего этапа ---
COPY --from=fe /app/dist/ /usr/share/nginx/html/

# --- Django collectstatic (если у тебя используются статики) ---
# RUN python manage.py collectstatic --noinput

CMD ["gunicorn", "mycloud.wsgi:application", "--bind", "0.0.0.0:8000"]
