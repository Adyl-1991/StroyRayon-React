import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { adminLogin } from '../api/adminApi'
import { hasAdminToken } from './adminSession'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (hasAdminToken()) return <Navigate to="/admin/orders" replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await adminLogin({ email, password })
      const target = location.state?.from?.startsWith('/admin/')
        ? location.state.from
        : '/admin/orders'
      navigate(target, { replace: true })
    } catch (requestError) {
      setError(
        requestError.status === 401
          ? 'Неверный email или пароль.'
          : requestError.message || 'API недоступен. Проверьте backend.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="admin-login">
      <form className="admin-login-card" onSubmit={handleSubmit}>
        <div>
          <span className="admin-eyebrow">StroyRayon CRM</span>
          <h1>Вход в CRM</h1>
          <p>Управление заказами доступно только уполномоченным сотрудникам.</p>
        </div>
        <label>
          Электронная почта
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            minLength={8}
            required
          />
        </label>
        {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
        <button className="admin-primary-button" type="submit" disabled={submitting}>
          {submitting ? 'Входим…' : 'Войти'}
        </button>
      </form>
    </main>
  )
}
