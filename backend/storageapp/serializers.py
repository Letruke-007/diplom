from rest_framework import serializers
from .models import StoredFile

class StoredFileSerializer(serializers.ModelSerializer):
    has_public_link = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = StoredFile
        fields = [
            "id",
            "original_name",
            "size",
            "uploaded_at",
            "last_downloaded_at",
            "comment",
            "has_public_link",
            "public_token",
        ]
        read_only_fields = ["size", "uploaded_at", "last_downloaded_at", "has_public_link", "public_token"]

    def get_has_public_link(self, obj):
        return bool(getattr(obj, "public_token", None))

    @staticmethod
    def _keep_extension(new_name: str, old_name: str) -> str:
        """Если в new_name нет расширения — переносим расширение из old_name (если оно там есть)."""
        if not new_name:
            return new_name
        new = new_name.strip()
        if "." in new and not new.endswith("."):
            return new
        # расширение из старого имени
        if "." in old_name and not old_name.endswith("."):
            ext = old_name[old_name.rfind(".") :]
            return f"{new}{ext}"
        return new

    def update(self, instance: StoredFile, validated_data):
        # переносим расширение, если его не указали
        if "original_name" in validated_data:
            validated_data["original_name"] = self._keep_extension(
                validated_data["original_name"],
                instance.original_name or "",
            )
        return super().update(instance, validated_data)
