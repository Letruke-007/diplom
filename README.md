# MyCloud — дипломный проект

Веб-приложение для обмена файлами и управления доступом.  
Проект состоит из **Django backend** и **React frontend**, работает в Docker-контейнерах.

## 🚀 Возможности
- Загрузка и хранение файлов
- Переименование и добавление комментариев
- Создание публичных ссылок для скачивания
- Авторизация и администрирование через Django
- REST API для работы с файлами
- Поддержка Docker-сборки и деплоя на сервер

## 🛠 Технологии
- **Backend:** Python 3.12, Django, Django REST Framework
- **Frontend:** React, Vite
- **База данных:** PostgreSQL
- **Инфраструктура:** Docker Compose
- **CI/CD:** GitHub Actions

## ⚙️ Локальный запуск

1. Клонировать репозиторий:
   ```bash
   git clone git@github.com:Letruke-007/diplom.git
   cd diplom
   ```

2. Создать файл окружения `.env`:
   ```env
   POSTGRES_DB=mycloud
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=postgres
   POSTGRES_HOST=db
   POSTGRES_PORT=5432
   DJANGO_SECRET_KEY=super-secret-key
   ```

3. Собрать и запустить:
   ```bash
   docker compose up --build
   ```

4. Применить миграции:
   ```bash
   docker compose exec backend python manage.py migrate
   ```

5. Создать суперпользователя:
   ```bash
   docker compose exec backend python manage.py createsuperuser
   ```

6. Открыть приложение:
   ```
   http://localhost:8000
   ```

## 🧪 Запуск тестов

### В Docker-контейнере
```bash
docker compose run --rm backend python manage.py test -v 2
```

### На GitHub Actions
Тесты запускаются автоматически при каждом пуше в ветку `main`.

## 📦 CI/CD

В проекте настроены два workflow:

- **CI (unit tests)** — проверка миграций и юнит-тестов на GitHub Actions.
- **CI (docker tests)** — проверка сборки и тестов в Docker Compose.

## ✅ Статус сборок

[![CI (unit tests)](https://github.com/Letruke-007/diplom/actions/workflows/ci.yml/badge.svg)](https://github.com/Letruke-007/diplom/actions/workflows/ci.yml)  
[![CI (docker tests)](https://github.com/Letruke-007/diplom/actions/workflows/docker-tests.yml/badge.svg)](https://github.com/Letruke-007/diplom/actions/workflows/docker-tests.yml)

## 🚀 Deployment

Для развёртывания на сервере:

1. Зайти на сервер и клонировать репозиторий (или обновить код, если он уже есть):
   ```bash
   ssh user@server
   cd ~/mycloud
   git pull origin main
   ```

2. Собрать и запустить контейнеры:
   ```bash
   docker compose up -d --build
   ```

3. Применить миграции и собрать статику:
   ```bash
   docker compose exec backend python manage.py migrate --noinput
   docker compose exec backend python manage.py collectstatic --noinput
   ```

4. Перезапустить контейнеры:
   ```bash
   docker compose restart
   ```

Теперь приложение доступно по адресу сервера (например, `https://mycloud.example.com`).
