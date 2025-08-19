import React, { useState } from "react";

// dev-only console wrappers
const dev = (fn: keyof Console) =>
  (...args: any[]) => { if (import.meta?.env?.DEV) (console[fn] as any)(...args); };

const debugDev = dev('debug');
const logDev   = dev('log');
const warnDev  = dev('warn');
const errorDev = dev('error');

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

interface Props {
  file: FileItem;
  onFileUpdated: (updated: FileItem) => void;
  onFileDeleted: (id: number) => void;
}

// --- локальные стили для компактных икон-кнопок ---
const iconBtnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 36,
  height: 36,
  borderRadius: 10,
  border: "1px solid #d0d5dd",
  background: "#fff",
  textDecoration: "none",
};
const iconBtnDangerStyle: React.CSSProperties = {
  ...iconBtnStyle,
  borderColor: "#fda4a4",
  background: "#fff0f0",
};

// --- CSRF helpers ---
function getCookie(name: string): string | undefined {
  const m = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
  return m ? decodeURIComponent(m.pop()!) : undefined;
}

let csrfTokenCache: string | null = null;

async function ensureCsrf(): Promise<string> {
  if (csrfTokenCache) return csrfTokenCache;

  const fromCookie = getCookie("csrftoken");
  if (fromCookie) {
    csrfTokenCache = fromCookie;
    return csrfTokenCache;
  }

  const resp = await fetch("/api/auth/csrf", {
    method: "GET",
    credentials: "include",
  });
  if (!resp.ok) throw new Error(`Failed to init CSRF: ${resp.status}`);

  const after = getCookie("csrftoken");
  if (!after) throw new Error("CSRF cookie not found after /api/auth/csrf");
  csrfTokenCache = after;
  return csrfTokenCache;
}

/** Универсальный detail-fetch: пробует /api/files/<id> и затем /api/files/<id>/ при 404 */
async function smartDetailFetch(
  id: number | string,
  init: RequestInit
): Promise<Response> {
  const primary = `/api/files/${id}`.replace(/\/+$/, "");
  let resp = await fetch(primary, init);
  if (resp.status === 404) {
    const fallback = `${primary}/`;
    debugDev("smartDetailFetch: 404 -> retry with trailing slash:", fallback);
    resp = await fetch(fallback, init);
  }
  return resp;
}

/** Экшен над файлом (например, public-link, delete): пробует без/со завершающего слеша */
async function smartActionFetch(
  id: number | string,
  action: string,
  init: RequestInit
): Promise<Response> {
  const base = `/api/files/${id}`.replace(/\/+$/, "");
  const variants = [
    `${base}/${action}`,      // без завершающего
    `${base}/${action}/`,     // с завершающим
  ];

  let lastResp: Response | null = null;
  for (const url of variants) {
    const resp = await fetch(url, init);
    if (resp.status !== 404) return resp;
    debugDev("smartActionFetch: 404, trying next variant", url);
    lastResp = resp;
  }
  // Если все варианты дали 404 — вернём последний ответ (для диагностики)
  return lastResp as Response;
}

const FileRow: React.FC<Props> = ({ file, onFileUpdated, onFileDeleted }) => {
  if (!file) return null;

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(file.original_name);
  const [isEditingComment, setIsEditingComment] = useState(false);
  const [commentDraft, setCommentDraft] = useState(file.comment || "");
  const [busy, setBusy] = useState(false);

  // Сохраняем расширение, если пользователь не указал его явно в новом имени
  const keepExtension = (input: string, fromName: string) => {
    const trimmed = input.trim();
    if (!trimmed) return trimmed;

    const dot = trimmed.lastIndexOf(".");
    the hasExt = dot > 0 && dot < trimmed.length - 1;
    if (hasExt) return trimmed;

    const oldDot = fromName.lastIndexOf(".");
    const oldHasExt = oldDot > 0 && oldDot < fromName.length - 1;
    return oldHasExt ? `${trimmed}${fromName.slice(oldDot)}` : trimmed;
  };

  const patchFile = async (payload: Partial<FileItem>) => {
    const token = await ensureCsrf();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-CSRFToken": token,
      "X-Requested-With": "XMLHttpRequest",
    };

    const init: RequestInit = {
      method: "PATCH",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    };

    debugDev("[PATCH] try", `/api/files/${file.id}`, "payload:", payload);
    const resp = await smartDetailFetch(file.id, init);
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      errorDev("[PATCH] status =", resp.status, "body =", txt.slice(0, 400));
      throw new Error(`PATCH failed: ${resp.status} ${txt}`);
    }
    return (await resp.json()) as FileItem;
  };

  // ----- Переименование -----
  const handleRenameSave = async (draft?: string) => {
    logDev("RENAME_SAVE_START", { draft, nameDraft, original: file.original_name });
    const candidate = draft ?? nameDraft;
    const finalName = keepExtension(candidate, file.original_name);

    if (!finalName || finalName === file.original_name) {
      setIsEditingName(false);
      setNameDraft(file.original_name);
      return;
    }
    setBusy(true);
    try {
      logDev("RENAME_SAVE", { id: file.id, finalName });
      const updated = await patchFile({ original_name: finalName });
      onFileUpdated(updated);
      setIsEditingName(false);
    } catch (e) {
      errorDev(e as any);
      alert("Не удалось переименовать файл");
    } finally {
      setBusy(false);
    }
  };

  // ----- Комментарий -----
  const handleCommentSave = async (draft?: string) => {
    const candidate = draft ?? commentDraft;
    setBusy(true);
    try {
      const updated = await patchFile({ comment: candidate });
      onFileUpdated(updated);
      setIsEditingComment(false);
    } catch (e) {
      errorDev(e as any);
      alert("Не удалось сохранить комментарий");
    } finally {
      setBusy(false);
    }
  };

  // ----- Удаление -----
  const handleDelete = async () => {
    if (!confirm(`Удалить файл «${file.original_name}»?`)) return;
    setBusy(true);
    try {
      const token = await ensureCsrf();
      const headers: Record<string, string> = {
        "X-CSRFToken": token,
        "X-Requested-With": "XMLHttpRequest",
      };

      const init: RequestInit = {
        method: "DELETE",
        headers,
        credentials: "include",
      };

      debugDev("[DELETE] try", `/api/files/${file.id}/delete`);
      let resp = await smartActionFetch(file.id, "delete", init);
      if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        errorDev("[DELETE] status =", resp.status, "body =", txt.slice(0, 400));
        throw new Error(`DELETE failed: ${resp.status}`);
      }
      onFileDeleted(file.id);
    } catch (e) {
      errorDev(e as any);
      alert("Не удалось удалить файл");
    } finally {
      setBusy(false);
    }
  };

  // ----- Публичные ссылки -----
  const issuePublicLink = async (): Promise<{ url: string; token: string }> => {
    const csrfToken = await ensureCsrf();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-CSRFToken": csrfToken,
      "X-Requested-With": "XMLHttpRequest",
    };
    const init: RequestInit = {
      method: "POST",
      headers,
      credentials: "include",
    };

    debugDev("[PUBLIC LINK] issue");
    const resp = await smartActionFetch(file.id, "public-link", init);
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      errorDev("[PUBLIC LINK] issue status =", resp.status, "body =", txt.slice(0, 400));
      throw new Error(`Issue link failed: ${resp.status} ${txt}`);
    }

    const data = await resp.json();
    const linkToken = (data.token ?? data.public_token) as string | undefined;
    if (!linkToken) throw new Error("Сервер не вернул токен публичной ссылки");

    const url = (data.url as string | undefined) ?? `${location.origin}/d/${linkToken}`;
    return { url, token: linkToken };
  };

  const revokePublicLink = async () => {
    const token = await ensureCsrf();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-CSRFToken": token,
      "X-Requested-With": "XMLHttpRequest",
    };
    const init: RequestInit = {
      method: "POST",
      headers,
      credentials: "include",
    };

    debugDev("[PUBLIC LINK] revoke");
    const resp = await smartActionFetch(file.id, "public-link/delete", init);
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      errorDev("[PUBLIC LINK] revoke status =", resp.status, "body =", txt.slice(0, 400));
      throw new Error(`Revoke link failed: ${resp.status} ${txt}`);
    }
  };

  const handleCreateOrCopyLink = async () => {
    try {
      const isCreating = !file.has_public_link || !file.public_token;

      if (isCreating) {
        // Создаём ссылку и сразу работаем с url из ответа
        const { url, token } = await issuePublicLink();

        // Обновляем состояние родителя: теперь у файла есть публичная ссылка
        onFileUpdated({
          ...file,
          has_public_link: true,
          public_token: token,
        });

        // Пытаемся скопировать — если нельзя, просто покажем адрес
        try {
          await navigator.clipboard.writeText(url);
          alert("Ссылка создана и скопирована: " + url);
        } catch {
          alert("Ссылка создана: " + url);
        }
        return;
      }

      // Ссылка уже есть — просто копируем существующий адрес
      const url = `${location.origin}/d/${file.public_token}`;
      try {
        await navigator.clipboard.writeText(url);
        alert("Ссылка скопирована: " + url);
      } catch {
        alert("Ссылка: " + url);
      }
    } catch (e) {
      errorDev(e as any);
      alert("Не удалось создать/скопировать ссылку");
    }
  };

  const handleRevokeLink = async () => {
    if (!confirm("Удалить публичную ссылку?")) return;
    setBusy(true);
    try {
      await revokePublicLink();
      onFileUpdated({
        ...file,
        has_public_link: false,
        public_token: null,
      });
    } catch (e) {
      errorDev(e as any);
      alert("Не удалось удалить ссылку");
    } finally {
      setBusy(false);
    }
  };

  // ----- Prompt-обёртки -----
  const openRenamePrompt = async () => {
    const current = nameDraft ?? file.original_name;
    const input = window.prompt("Новое имя файла", current);
    if (input === null) return; // Отмена
    setNameDraft(input);
    await handleRenameSave(input);
  };

  const openCommentPrompt = async () => {
    const current = (commentDraft ?? file.comment ?? "").toString();
    const input = window.prompt("Комментарий к файлу", current);
    if (input === null) return; // Отмена
    setCommentDraft(input);
    await handleCommentSave(input);
  };

  return (
    <tr>
      {/* Имя файла / переименование */}
      <td style={{ width: "100%", minWidth: 420 }}>
        {isEditingName ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
            <input
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSave();
                if (e.key === "Escape") {
                  setIsEditingName(false);
                  setNameDraft(file.original_name);
                }
              }}
              autoFocus
              disabled={busy}
              placeholder="Новое имя файла"
              style={{ flex: 1, minWidth: 360, padding: "6px 10px" }}
            />
            <button
              className="btn"
              type="button"
              onClick={(e) => {
                e.preventDefault();
                logDev("RENAME_BTN_CLICK");
                handleRenameSave();
              }}
              disabled={busy}
            >
              Сохранить
            </button>
            <button
              className="btn btn--secondary"
              onClick={() => {
                setIsEditingName(false);
                setNameDraft(file.original_name);
              }}
              disabled={busy}
            >
              Отмена
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span
              onDoubleClick={openRenamePrompt}
              style={{ cursor: "pointer" }}
              title="Двойной клик для переименования"
            >
              {file.original_name}
            </span>
            <button
              className="btn btn--secondary"
              onClick={openRenamePrompt}
              disabled={busy}
              title="Переименовать"
            >
              ✏️
            </button>
          </div>
        )}
      </td>

      {/* Размер */}
      <td>{(file.size / 1024).toFixed(1)} KB</td>

      {/* Дата загрузки */}
      <td>{new Date(file.uploaded_at).toLocaleString()}</td>

      {/* Дата скачивания */}
      <td>{file.last_downloaded_at ? new Date(file.last_downloaded_at).toLocaleString() : "—"}</td>

      {/* Комментарий */}
      <td>
        {isEditingComment ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCommentSave();
                if (e.key === "Escape") {
                  setIsEditingComment(false);
                  setCommentDraft(file.comment || "");
                }
              }}
              autoFocus
              disabled={busy}
              placeholder="Комментарий"
              style={{ minWidth: 280, padding: "6px 10px" }}
            />
            <button className="btn" type="button" onClick={() => handleCommentSave()} disabled={busy}>
              Сохранить
            </button>
            <button
              className="btn btn--secondary"
              type="button"
              onClick={() => {
                setIsEditingComment(false);
                setCommentDraft(file.comment || "");
              }}
              disabled={busy}
            >
              Отмена
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>{file.comment || "—"}</span>
            <button
              className="btn btn--secondary"
              onClick={openCommentPrompt}
              disabled={busy}
              title="Изменить комментарий"
            >
              ✏️
            </button>
          </div>
        )}
      </td>

      {/* Публичная ссылка */}
      <td>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            alignItems: "center",
            maxWidth: "100%",
            lineHeight: 1.2,
          }}
        >
          <span
            style={{ textDecoration: "underline", cursor: "pointer" }}
            onClick={handleCreateOrCopyLink}
            title={file.has_public_link ? "Скопировать ссылку" : "Создать ссылку"}
          >
            {file.has_public_link ? "Скопировать ссылку" : "Создать ссылку"}
          </span>

          {file.has_public_link && file.public_token ? (
            <>
              <a
                href={`/d/${file.public_token}`}
                target="_blank"
                rel="noreferrer"
                title="Открыть публичную ссылку"
              >
                Открыть
              </a>
              <button
                className="btn btn--secondary"
                type="button"
                onClick={handleRevokeLink}
                disabled={busy}
                title="Удалить ссылку"
              >
                Удалить
              </button>
            </>
          ) : null}
        </div>
      </td>

      {/* Действия */}
      <td>
        <div style={{ display: "flex", gap: 8 }}>
          <a
            href={`/api/files/${file.id}/download`}
            title="Скачать"
            aria-label="Скачать"
            rel="noopener noreferrer"
            style={iconBtnStyle}
          >
            ⬇️
          </a>
          <button
            onClick={handleDelete}
            disabled={busy}
            title="Удалить"
            aria-label="Удалить"
            type="button"
            style={iconBtnDangerStyle}
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  );
};

export default FileRow;
