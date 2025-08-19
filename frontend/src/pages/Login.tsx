import { useForm } from 'react-hook-form'
import { useLoginMutation, useMeQuery } from '../features/auth/authApi'
import { Navigate, useNavigate } from 'react-router-dom'
import { useState } from 'react'

type Form = { username: string; password: string }

export default function Login() {
  const { data: me } = useMeQuery()
  const [login] = useLoginMutation()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>()
  const [serverError, setServerError] = useState<string | null>(null)

  if (me) return <Navigate to="/files" replace />

  const onSubmit = async (values: Form) => {
    try {
      setServerError(null)
      await login(values).unwrap()
      navigate('/files')
    } catch (e: any) {
      setServerError(e?.data?.detail || 'Ошибка входа')
    }
  }

  return (
    <div className="max-w-420 center">
      <h1>Вход</h1>

      <form className="panel" onSubmit={handleSubmit(onSubmit)}>
        {serverError && <div className="form-error">{serverError}</div>}

        <label>
          Логин
          <input
            type="text"
            placeholder="Ваш логин"
            autoComplete="username"
            {...register('username', { required: 'Укажите логин' })}
          />
        </label>
        {errors.username && <div className="form-error">{errors.username.message}</div>}

        <label>
          Пароль
          <input
            type="password"
            placeholder="Ваш пароль"
            {...register('password', { required: 'Укажите пароль' })}
            autoComplete="current-password"
          />
        </label>
        {errors.password && <div className="form-error">{errors.password.message}</div>}

        <button className="btn" type="submit" disabled={isSubmitting} style={{ marginTop: 12 }}>
          {isSubmitting ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </div>
  )
}
