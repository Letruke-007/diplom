from django.urls import path
from . import views

urlpatterns = [
    # список + загрузка
    path('files', views.list_files),                          # GET + POST

    # PATCH/rename/comment
    path('files/<int:pk>', views.patch_file),                 # PATCH

    # LEGACY удаление
    path('files/<int:pk>/delete', views.delete_file),         # DELETE или POST

    # скачать (авторизовано)
    path('files/<int:pk>/download', views.download_file),     # GET

    # публичные ссылки
    path('files/<int:pk>/public-link', views.issue_public),           # POST
    path('files/<int:pk>/public-link/delete', views.revoke_public),   # POST

    # публичная отдача по токену (без /api)
    path('d/<str:token>', views.public_download),
]
