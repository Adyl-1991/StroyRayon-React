const LOCAL_API_BASE_URL = 'http://localhost:4000/api'
const PRODUCTION_API_BASE_URL = 'https://api.stroyrayon.kg/api'

function getDefaultApiBaseUrl() {
  if (typeof window === 'undefined') return LOCAL_API_BASE_URL

  const hostname = window.location.hostname
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'
  return isLocalHost ? LOCAL_API_BASE_URL : PRODUCTION_API_BASE_URL
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || getDefaultApiBaseUrl()
export const USE_API = import.meta.env.VITE_USE_API === 'true'
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 5000)
