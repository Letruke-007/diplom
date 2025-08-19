import ProtectedRoute from '../components/ProtectedRoute'
import { Link, useSearchParams } from 'react-router-dom'
import { useListFilesQuery } from '../features/files/filesApi'
import UploadForm from '../components/UploadForm'
import FileRow from '../components/FileRow'

export default function Files() {
  const [sp] = useSearchParams()
  const userParam = sp.get('user')
  const userId = userParam ? Number(userParam) : undefined

  const { data, isLoading, refetch } = useListFilesQuery(
    userId ? { user: userId } : undefined as any
  )
  const items = Array.isArray(data?.results) ? data!.results : []

  const handleFileUpdated = () => refetch()
  const handleFileDeleted = () => refetch()

  return (
    <ProtectedRoute>
      <div>
        {userId ? (
          <div className="panel" style={{ marginBottom: 12 }}>
            <Link to="/admin">← Назад в админку</Link>
          </div>
        ) : null}

        <h2>{userId ? `Файлы пользователя #${userId}` : 'Мои файлы'}</h2>

        {userId ? (
          <div className="panel" style={{ marginBottom: 12 }}>
            Вы просматриваете хранилище пользователя <b>#{userId}</b>.
            Загрузка файлов отключена для предотвращения случайной заливки.
          </div>
        ) : null}

        <div className="panel">
          {!userId && <UploadForm />}

          {isLoading ? (
            <div style={{ padding: 12 }}>Загрузка…</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Имя файла</th>
                  <th>Размер</th>
                  <th>Загружен</th>
                  <th>Скачан</th>
                  <th>Комментарий</th>
                  <th>Публичная ссылка</th>
                  
                  <th style={{ width: 180 }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {items.length ? (
                  items.map((f: any) => (
                    <FileRow
                      key={f.id}
                      file={f}
                      onFileUpdated={handleFileUpdated}
                      onFileDeleted={handleFileDeleted}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: 12 }}></td>
                      Нет файлов                    
                  </tr>
                )}
              </tbody>
            </table>
          )}

          <button className="btn" onClick={() => refetch()} style={{ marginTop: 8 }}>
            Обновить
          </button>
        </div>
      </div>
    </ProtectedRoute>
  )
}
