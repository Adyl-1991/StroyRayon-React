import { API_BASE_URL, API_TIMEOUT_MS } from '../config/api'

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = options.status || null
    this.cause = options.cause
  }
}

export async function apiGet(path, options = {}) {
  return apiRequest('GET', path, null, options)
}

export async function apiPost(path, payload, options = {}) {
  return apiRequest('POST', path, payload, options)
}

export async function apiPostForm(path, formData, options = {}) {
  return apiRequest('POST', path, formData, options)
}

export async function apiPatch(path, payload, options = {}) {
  return apiRequest('PATCH', path, payload, options)
}

async function apiRequest(method, path, payload, options = {}) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), options.timeout || API_TIMEOUT_MS)

  try {
    const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`)
    Object.entries(options.params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value))
    })

    const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData
    const response = await fetch(url, {
      method,
      headers: {
        Accept: 'application/json',
        ...(payload === null || isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
      },
      ...(payload === null ? {} : { body: isFormData ? payload : JSON.stringify(payload) }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      const message = Array.isArray(body?.message)
        ? body.message.join(', ')
        : body?.message || `API request failed: ${response.status}`
      throw new ApiError(message, { status: response.status })
    }

    const text = await response.text()
    return text ? JSON.parse(text) : null
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError('API is unavailable', { cause: error })
  } finally {
    window.clearTimeout(timeoutId)
  }
}
