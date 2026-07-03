import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { adminLogout, getAdminProfile } from '../api/adminApi'
import { roleLabel } from './adminPermissions'

export function AdminLayout() {
  const navigate = useNavigate()
  const [admin, setAdmin] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    getAdminProfile()
      .then((profile) => {
        if (active) setAdmin(profile)
      })
      .catch(() => {
        if (active) navigate('/admin/login', { replace: true })
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [navigate])

  async function handleLogout() {
    await adminLogout().catch(() => {})
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <strong>StroyRayon CRM</strong>
          <span>{admin ? `${admin.name} · ${roleLabel(admin.role)}` : 'Администрирование'}</span>
        </div>
        <nav aria-label="Admin navigation">
          <NavLink to="/admin/orders">Заказы</NavLink>
          <NavLink to="/admin/products">Товары</NavLink>
          <button type="button" onClick={handleLogout}>Выйти</button>
        </nav>
      </header>
      <main className="admin-main">
        {loading ? <div className="admin-state">Загружаем профиль…</div> : <Outlet context={{ admin }} />}
      </main>
    </div>
  )
}
