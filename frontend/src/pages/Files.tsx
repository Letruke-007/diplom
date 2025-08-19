import React, { useEffect, useState } from "react";
import FileRow from "../components/FileRow";

type FileItem = {
  id: number;
  original_name: string;
  size: number;
  uploaded_at: string;
  last_downloaded_at: string | null;
  comment: string;
  has_public_link: boolean;
  public_token?: string | null;
};

const Files: React.FC = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [commentBeforeUpload, setCommentBeforeUpload] = useState("");

  const fetchFiles = async () => {
    const resp = await fetch("/api/files/", { credentials: "include" });
    if (!resp.ok) throw new Error(String(resp.status));
    const data = await resp.json();
    setFiles(data);
  };

  useEffect(() => {
    fetchFiles().catch(() => {});
  }, []);

  const onFileUpdated = (updated: FileItem) => {
    setFiles((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
  };
  const onFileDeleted = (id: number) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleUpload = async (file: File) => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (commentBeforeUpload.trim()) {
        fd.append("comment", commentBeforeUpload.trim());
      }
      const resp = await fetch("/api/files/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!resp.ok) throw new Error(String(resp.status));
      await fetchFiles();
      setCommentBeforeUpload("");
    } catch {
      alert("Не удалось загрузить файл");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <h2>Мои файлы</h2>

      {/* Зона загрузки */}
      <div className="card upload-card">
        <input
          id="upload-input"
          type="file"
          className="visually-hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
            e.currentTarget.value = ""; 
          }}
          disabled={busy}
        />
        <div className="upload-row">
          <input
            placeholder="Комментарий"
            value={commentBeforeUpload}
            onChange={(e) => setCommentBeforeUpload(e.target.value)}
            className="input"
          />
          <label htmlFor="upload-input" className="btn btn-primary">
            Выбрать файл
          </label>
        </div>
        <div className="hint">Подсказка: можно добавить комментарий перед загрузкой</div>
      </div>

      {/* Таблица */}
      <div className="table-wrap">
        <table className="table table-files">
          <colgroup>
            <col className="col-name" />
            <col className="col-size" />
            <col className="col-up" />
            <col className="col-down" />
            <col className="col-comment" />
            <col className="col-link" />
            <col className="col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th>Имя файла</th>
              <th>Размер</th>
              <th>Загружен</th>
              <th>Скачан</th>
              <th>Комментарий</th>
              <th>Публичная ссылка</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {files.map((f) => (
              <FileRow
                key={f.id}
                file={f}
                onFileUpdated={onFileUpdated}
                onFileDeleted={onFileDeleted}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 12 }}>
        <button className="btn" onClick={() => fetchFiles()} disabled={busy}>
          Обновить
        </button>
      </div>
    </div>
  );
};

export default Files;
