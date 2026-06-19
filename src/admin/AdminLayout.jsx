import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { adminLogout, getAdminProfile } from '../api/adminApi'

export function AdminLayout() {
  const navigate = useNavigate()
  const [admin, setAdmin] = useState(null)

  useEffect(() => {
    let active = true
    getAdminProfile()
      .then((profile) => {
        if (active) setAdmin(profile)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  async function handleLogout() {
    await adminLogout().catch(() => {})
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <strong>StroyRayon CRM</strong>
          <span>{admin ? `${admin.name} · ${admin.role}` : 'Администрирование'}</span>
        </div>
        <nav aria-label="Admin navigation">
          <NavLink to="/admin/orders">Заказы</NavLink>
          <button type="button" onClick={handleLogout}>Выйти</button>
        </nav>
      </header>
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
