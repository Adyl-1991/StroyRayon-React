import { apiGet, apiPatch, apiPost } from './client'
import { clearAdminToken, getAdminToken, setAdminToken } from '../admin/adminSession'

function authorizedOptions(options = {}) {
  const token = getAdminToken()
  return {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  }
}

async function adminRequest(request) {
  try {
    return await request()
  } catch (error) {
    if (error.status === 401) {
      clearAdminToken()
      if (window.location.pathname !== '/admin/login') {
        window.location.replace('/admin/login')
      }
    }
    throw error
  }
}

export async function adminLogin(credentials) {
  const result = await apiPost('/admin/auth/login', credentials)
  setAdminToken(result.accessToken)
  return result
}

export function getAdminProfile() {
  return adminRequest(() => apiGet('/admin/auth/me', authorizedOptions()))
}

export async function adminLogout() {
  try {
    await adminRequest(() => apiPost('/admin/auth/logout', {}, authorizedOptions()))
  } finally {
    clearAdminToken()
  }
}

export function getAdminOrders(params = {}) {
  return adminRequest(() => apiGet('/admin/orders', authorizedOptions({ params })))
}

export function getAdminOrder(id) {
  return adminRequest(() => apiGet(`/admin/orders/${id}`, authorizedOptions()))
}

export function updateAdminOrderStatus(id, status) {
  return adminRequest(() =>
    apiPatch(`/admin/orders/${id}/status`, { status }, authorizedOptions()),
  )
}

export function updateAdminOrderNote(id, note) {
  return adminRequest(() =>
    apiPatch(`/admin/orders/${id}/note`, { note }, authorizedOptions()),
  )
}

export function getAdminProducts(params = {}) {
  return adminRequest(() => apiGet('/admin/products', authorizedOptions({ params })))
}

export function getAdminProduct(id) {
  return adminRequest(() => apiGet(`/admin/products/${id}`, authorizedOptions()))
}

export function updateAdminProductPrice(id, price) {
  return adminRequest(() =>
    apiPatch(`/admin/products/${id}/price`, { price }, authorizedOptions()),
  )
}

export function updateAdminProductStock(id, payload) {
  return adminRequest(() =>
    apiPatch(`/admin/products/${id}/stock`, payload, authorizedOptions()),
  )
}

export function updateAdminProductActive(id, isActive) {
  return adminRequest(() =>
    apiPatch(`/admin/products/${id}/active`, { isActive }, authorizedOptions()),
  )
}

export function updateAdminProductNote(id, note) {
  return adminRequest(() =>
    apiPatch(`/admin/products/${id}/note`, { note }, authorizedOptions()),
  )
}
