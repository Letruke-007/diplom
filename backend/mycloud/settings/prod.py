from .base import *  # noqa

DEBUG = False

# === Доступные хосты ===
ALLOWED_HOSTS = [
    "mycloud-diploma.duckdns.org",
    "localhost",
    "127.0.0.1",
]

# === Работа за обратным прокси по HTTPS ===
# Сообщаем Django реальную схему из заголовка, который прокидывает Nginx
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# === CSRF / Session cookies ===
# Доверяем origin именно с https:// (важно указать схему)
CSRF_TRUSTED_ORIGINS = [
    "https://mycloud-diploma.duckdns.org",
]

# Куки только по HTTPS
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True

# SameSite — фронт и бэк у тебя с одного домена, Lax оптимален
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"

# Обычно csrftoken читается фронтом из cookie, поэтому HttpOnly оставляем False
CSRF_COOKIE_HTTPONLY = False

# === CORS (если установлен django-cors-headers) ===
# Для одного домена CORS не обязателен, но эти настройки не помешают.
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    "https://mycloud-diploma.duckdns.org",
]

# === Доп. безопасность (можно включить позже, когда всё стабильно) ===
# SECURE_HSTS_SECONDS = 31536000
# SECURE_HSTS_INCLUDE_SUBDOMAINS = True
# SECURE_HSTS_PRELOAD = True
