import { Link } from 'react-router-dom'
import ProtectedRoute from '../components/ProtectedRoute'
import { useMeQuery } from '../features/auth/authApi'
import { useDeleteUserMutation, useListUsersQuery, usePatchUserMutation } from '../features/users/usersApi'
import { fmtSize } from '../utils/format'
import { useEffect, useMemo, useState } from 'react'

export default function Admin() {
  const { data: me } = useMeQuery()
  const [q, setQ] = useState('')
  const debouncedQ = useDebouncedValue(q, 300)
  const { data, isLoading, refetch } = useListUsersQuery(
    debouncedQ ? { q: debouncedQ } : undefined
  )

  const [patch] = usePatchUserMutation()
  const [del] = useDeleteUserMutation()

  if (!me?.is_admin) {
    return (
      <ProtectedRoute>
        <div className="panel" style={{ padding: 16 }}>Доступ запрещён</div>
      </ProtectedRoute>
    )
  }

  const items = (data as any)?.results ?? []

  return (
    <ProtectedRoute>
      <div className="container">
        <h2>Администрирование</h2>

        <div className="panel" style={{ marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Поиск (логин, имя, email)…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ width: 360 }}
          />
          <button className="btn" style={{ marginLeft: 8 }} onClick={() => refetch()}>
            Обновить
          </button>
        </div>

        <div className="panel">
          {isLoading ? (
            <div style={{ padding: 12 }}>Загрузка…</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Логин</th>
                  <th>Имя</th>
                  <th>Email</th>
                  <th>Админ</th>
                  <th>Активен</th>
                  <th>Файлов</th>
                  <th>Размер</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u: any) => (
                  <tr key={u.id}>
                    <td>{u.id}</td>
                    <td>{u.username}</td>
                    <td>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!u.is_admin}
                        onChange={() => patch({ id: u.id, patch: { is_admin: !u.is_admin } })}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        checked={!!u.is_active}
                        onChange={() => patch({ id: u.id, patch: { is_active: !u.is_active } })}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>{u.files_count ?? 0}</td>
                    <td style={{ textAlign: 'right' }}>{fmtSize(u.files_total_size ?? 0)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <Link className="btn" to={{ pathname: '/files', search: `?user=${u.id}` }}>
                        Открыть хранилище
                      </Link>
                      &nbsp;
                      <button
                        className="btn btn--danger"
                        onClick={() => del(u.id).then(() => refetch())}
                        disabled={me?.id === u.id}
                        title={me?.id === u.id ? 'Нельзя деактивировать себя' : undefined}
                      >
                        Деактивировать
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}

function useDebouncedValue<T>(value: T, delay = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}
