import { useForm } from 'react-hook-form'
import { useRegisterMutation } from '../features/auth/authApi'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'

type Form = {
  username: string
  full_name: string
  email: string
  password: string
}

const USERNAME_RE = /^[A-Za-z][A-Za-z0-9]{3,19}$/
// ≥6 символов, минимум 1 заглавная, 1 цифра и 1 спецсимвол
const PASSWORD_RE = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/

export default function Register() {
  const [registerUser] = useRegisterMutation()
  const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>()
  const [serverError, setServerError] = useState<string | null>(null)

  const onSubmit = async (values: Form) => {
    try {
      setServerError(null)
      await registerUser(values).unwrap()
      navigate('/login')
    } catch (e: any) {
      setServerError(e?.data?.detail || 'Не удалось создать аккаунт')
    }
  }

  return (
    <div className="max-w-480 center">
      <h1>Регистрация</h1>

      <form className="panel" onSubmit={handleSubmit(onSubmit)}>
        {serverError && <div className="form-error">{serverError}</div>}

        <label>
          Логин
          <input
            type="text"
            placeholder="Латиница и цифры (4–20)"
            {...register('username', {
              required: 'Укажите логин',
              pattern: { value: USERNAME_RE, message: 'Допустимы буквы и цифры, начинается с буквы (4–20)' }
            })}
            autoComplete="username"
          />
        </label>
        {errors.username && <div className="form-error">{errors.username.message}</div>}

        <label>
          Имя
          <input
            type="text"
            placeholder="Как к вам обращаться"
            {...register('full_name', { required: 'Укажите имя' })}
            autoComplete="name"
          />
        </label>
        {errors.full_name && <div className="form-error">{errors.full_name.message}</div>}

        <label>
          Email
          <input
            type="email"
            placeholder="you@example.com"
            {...register('email', { required: 'Укажите email' })}
            autoComplete="email"
          />
        </label>
        {errors.email && <div className="form-error">{errors.email.message}</div>}

        <label>
          Пароль
          <input
            type="password"
            placeholder="Минимум 6 символов, A-Z, цифра и символ"
            {...register('password', {
              required: 'Придумайте пароль',
              pattern: { value: PASSWORD_RE, message: 'Пароль: ≥6 символов, заглавная буква, цифра и спецсимвол' }
            })}
            autoComplete="new-password"
          />
        </label>
        {errors.password && <div className="form-error">{errors.password.message}</div>}

        <button className="btn" type="submit" disabled={isSubmitting} style={{ marginTop: 12 }}>
          {isSubmitting ? 'Создаём…' : 'Создать аккаунт'}
        </button>
      </form>
    </div>
  )
}
