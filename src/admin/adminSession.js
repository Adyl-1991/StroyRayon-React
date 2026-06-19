const TOKEN_KEY = import.meta.env.VITE_ADMIN_TOKEN_STORAGE_KEY || 'stroyrayon_admin_token'

export function getAdminToken() {
  return window.sessionStorage.getItem(TOKEN_KEY)
}

export function setAdminToken(token) {
  window.sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearAdminToken() {
  window.sessionStorage.removeItem(TOKEN_KEY)
}

export function hasAdminToken() {
  return Boolean(getAdminToken())
}
