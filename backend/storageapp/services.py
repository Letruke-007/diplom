import secrets

from pathlib import Path
from django.conf import settings
from django.utils import timezone
from .models import StoredFile

def ensure_user_storage_dir(user) -> Path:
    base = Path(settings.MEDIA_ROOT)
    if not user.storage_rel_path:
        # Детерминированный каталог пользователя
        user.storage_rel_path = f"u/{user.username[:2].lower()}/{user.username}"
        user.save(update_fields=['storage_rel_path'])
    p = base / user.storage_rel_path
    p.mkdir(parents=True, exist_ok=True)
    return p

def save_uploaded(django_file, user, comment: str = '') -> StoredFile:
    # Лимит из настроек
    max_bytes = int(getattr(settings, 'MAX_UPLOAD_MB', 500)) * 1024 * 1024
    size = getattr(django_file, 'size', None)
    if size is not None and size > max_bytes:
        raise ValueError("File too large")

    # Каталог пользователя
    user_dir = ensure_user_storage_dir(user)

    # Создадим запись, чтобы получить UUID имени на диске
    sf = StoredFile(
        owner=user,
        original_name=django_file.name,
        rel_dir=user.storage_rel_path,
        size=size or 0,
        comment=comment,
        uploaded_at=timezone.now()
    )
    sf.save()

    # Подкаталог по первым двум символам UUID
    subdir = Path(user_dir) / str(sf.disk_name)[:2]
    subdir.mkdir(parents=True, exist_ok=True)

    # Полный путь
    dst = subdir / str(sf.disk_name)

    # Сохраняем файл чанками
    with open(dst, 'wb') as out:
        for chunk in getattr(django_file, 'chunks', lambda: [django_file.read()])():
            out.write(chunk)

    # На случай если size не был известен заранее
    try:
        sf.size = dst.stat().st_size
        sf.save(update_fields=['size'])
    except Exception:
        pass

    return sf

def delete_stored_file(sf: StoredFile) -> None:
    try:
        path = Path(settings.MEDIA_ROOT) / sf.rel_path
        if path.exists():
            path.unlink()
    except Exception:
        # логировать по желанию
        pass
    sf.delete()

def issue_public_link(sf: StoredFile) -> str:
    token = secrets.token_urlsafe(24)
    sf.public_token = token
    sf.save(update_fields=['public_token'])
    return token

def revoke_public_link(sf: StoredFile) -> StoredFile:
    sf.public_token = None
    sf.save(update_fields=['public_token'])
    return sf

def resolve_public_link(token: str) -> StoredFile | None:
    try:
        return StoredFile.objects.get(public_token=token)
    except StoredFile.DoesNotExist:
        return None
