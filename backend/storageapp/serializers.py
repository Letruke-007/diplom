from rest_framework import serializers
from .models import StoredFile
import os

class StoredFileSerializer(serializers.ModelSerializer):
    has_public_link = serializers.SerializerMethodField()

    class Meta:
        model = StoredFile
        fields = [
            'id',
            'original_name',
            'size',
            'uploaded_at',
            'last_downloaded_at',
            'comment',
            'has_public_link'
        ]

    def get_has_public_link(self, obj):
        return bool(obj.public_token)

    def update(self, instance, validated_data):
       
        new_name = validated_data.get("original_name")
        if new_name:
            base, ext = os.path.splitext(new_name.strip())
            if not ext:
                _, old_ext = os.path.splitext(instance.original_name or "")
                if old_ext:
                    validated_data["original_name"] = f"{new_name}{old_ext}"
        return super().update(instance, validated_data)
