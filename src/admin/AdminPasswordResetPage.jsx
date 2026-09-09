import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmAdminPasswordReset, requestAdminPasswordReset } from '../api/adminApi'
import { Seo } from '../components/seo/Seo'
import '../styles/admin.css'

export function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  async function submit(event) {
    event.preventDefault(); setSubmitting(true); setError('')
    try { const result = await requestAdminPasswordReset(email); setMessage(result.message) } catch { setError('Не удалось отправить запрос. Попробуйте позже.') } finally { setSubmitting(false) }
  }
  return <main className="admin-login"><Seo title="Восстановление пароля CRM" noIndex /><form className="admin-login-card" onSubmit={submit}>
    <div><span className="admin-eyebrow">StroyRayon CRM</span><h1>Восстановление пароля</h1><p>Введите рабочий email. Если он зарегистрирован, мы отправим ссылку на 15 минут.</p></div>
    <label>Электронная почта<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
    {message && <div className="admin-alert admin-alert-success" role="status">{message}</div>}
    {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
    <button className="admin-primary-button" disabled={submitting}>{submitting ? 'Отправляем…' : 'Отправить ссылку'}</button><Link className="admin-login-link" to="/admin/login">Вернуться ко входу</Link>
  </form></main>
}

export function AdminResetPasswordPage() {
  const [params] = useSearchParams(); const token = params.get('token') || ''
  const [password, setPassword] = useState(''); const [confirmation, setConfirmation] = useState(''); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [submitting, setSubmitting] = useState(false)
  async function submit(event) {
    event.preventDefault(); if (password !== confirmation) { setError('Пароли не совпадают.'); return }; setSubmitting(true); setError('')
    try { const result = await confirmAdminPasswordReset(token, password); setMessage(result.message) } catch (requestError) { setError(requestError.message || 'Ссылка недействительна или устарела.') } finally { setSubmitting(false) }
  }
  return <main className="admin-login"><Seo title="Новый пароль CRM" noIndex /><form className="admin-login-card" onSubmit={submit}>
    <div><span className="admin-eyebrow">StroyRayon CRM</span><h1>Новый пароль</h1><p>Создайте пароль длиной не менее 12 символов.</p></div>
    <label>Новый пароль<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength="12" required /></label>
    <label>Повторите пароль<input type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength="12" required /></label>
    {message && <div className="admin-alert admin-alert-success" role="status">{message} <Link to="/admin/login">Войти</Link></div>}
    {error && <div className="admin-alert admin-alert-error" role="alert">{error}</div>}
    <button className="admin-primary-button" disabled={submitting || !token}>{submitting ? 'Сохраняем…' : 'Сменить пароль'}</button>
  </form></main>
}
