import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { hasAdminToken } from './adminSession'

export function AdminProtectedRoute() {
  const location = useLocation()
  if (!hasAdminToken()) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
