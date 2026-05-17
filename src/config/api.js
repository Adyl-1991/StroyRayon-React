export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
export const USE_API = import.meta.env.VITE_USE_API === 'true'
export const API_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS || 5000)
