from urllib.parse import quote as urlquote
from pathlib import Path

from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import StoredFile
from . import services


def _is_admin(user) -> bool:
    return bool(getattr(user, "is_admin", False) or getattr(user, "is_superuser", False))


def _serialize(sf: StoredFile) -> dict:
    return {
        "id": sf.id,
        "original_name": sf.original_name,
        "size": sf.size,
        "uploaded_at": sf.uploaded_at.isoformat() if sf.uploaded_at else None,
        "last_downloaded_at": sf.last_downloaded_at.isoformat() if sf.last_downloaded_at else None,
        "comment": sf.comment,
        "public_token": sf.public_token,
        "has_public_link": bool(sf.public_token),
    }


@api_view(["GET", "POST"])
@permission_classes([AllowAny])
def list_files(request):
    if request.method == "GET":
        # Admins can inspect other users' storage via ?user=<id>
        target_user_id = request.GET.get("user")
        if request.user.is_authenticated:
            if target_user_id is not None:
                if not _is_admin(request.user):
                    return Response({"detail": "You do not have permission to view other users' files."}, status=403)
                try:
                    uid = int(target_user_id)
                except (TypeError, ValueError):
                    return Response({"detail": "Invalid 'user' parameter"}, status=400)
                qs = StoredFile.objects.filter(owner_id=uid)
            else:
                qs = StoredFile.objects.all() if _is_admin(request.user) else StoredFile.objects.filter(owner=request.user)
            files_list = [_serialize(x) for x in qs.order_by("-uploaded_at", "-id")]
        else:
            files_list = []

        return Response({
            "items": files_list,
            "data": files_list,
            "results": files_list
        })

    if not request.user.is_authenticated:
        return Response({"detail": "Authentication credentials were not provided."}, status=401)

    up = request.FILES.get("file")
    if not up:
        return Response({"detail": "file is required"}, status=400)
    comment = request.data.get("comment", "")
    try:
        sf = services.save_uploaded(up, request.user, comment=comment)
    except ValueError as e:
        return Response({"detail": str(e)}, status=400)
    return Response(_serialize(sf), status=201)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def patch_file(request, pk: int):
    sf = get_object_or_404(StoredFile, pk=pk)
    if not (_is_admin(request.user) or request.user == sf.owner):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    original_name = request.data.get("original_name")
    comment = request.data.get("comment")

    changed = False
    if original_name is not None:
        sf.original_name = str(original_name).strip()
        changed = True
    if comment is not None:
        sf.comment = str(comment)
        changed = True

    if changed:
        sf.save(update_fields=["original_name", "comment"])
    return Response(_serialize(sf))


@api_view(["DELETE", "POST"])
@permission_classes([IsAuthenticated])
def delete_file(request, file_id: int = None, pk: int = None):
    _id = file_id or pk
    qs = StoredFile.objects.all()
    sf = get_object_or_404(qs, id=_id)
    
    if not _is_admin(request.user) and sf.owner_id != request.user.id:
        return Response({"detail": "Forbidden"}, status=403)
    try:
        if sf.file:
            sf.file.delete(save=False)
    except Exception:
        pass
    StoredFile.objects.filter(pk=sf.pk).delete()
    return Response({"status": "deleted"})


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def download_file(request, pk: int):
    sf = get_object_or_404(StoredFile, pk=pk)
    if not (_is_admin(request.user) or request.user == sf.owner):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    sf.last_downloaded_at = timezone.now()
    sf.save(update_fields=["last_downloaded_at"])

    f = open(sf.path_on_disk, "rb")
    resp = FileResponse(f)
    resp["Content-Disposition"] = f'attachment; filename="{urlquote(sf.original_name)}"'
    return resp


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def issue_public(request, pk: int):
    sf = get_object_or_404(StoredFile, pk=pk)
    if not (_is_admin(request.user) or request.user == sf.owner):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    token = services.issue_public_link(sf)
    return Response({"token": token})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def revoke_public(request, pk: int):
    sf = get_object_or_404(StoredFile, pk=pk)
    if not (_is_admin(request.user) or request.user == sf.owner):
        return Response({"detail": "Forbidden"}, status=status.HTTP_403_FORBIDDEN)

    services.revoke_public_link(sf)
    return Response({"status": "revoked"})


@api_view(["GET"])
@permission_classes([AllowAny])
def public_download(request, token: str):
    sf = services.resolve_public_link(token)
    if not sf:
        raise Http404

    sf.last_downloaded_at = timezone.now()
    sf.save(update_fields=["last_downloaded_at"])

    f = open(sf.path_on_disk, "rb")
    resp = FileResponse(f)
    resp["Content-Disposition"] = f'attachment; filename="{urlquote(sf.original_name)}"'
    return resp
