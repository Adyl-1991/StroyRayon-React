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
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), options.timeout || API_TIMEOUT_MS)

  try {
    const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`)
    Object.entries(options.params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      url.searchParams.set(key, Array.isArray(value) ? value.join(',') : String(value))
    })

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new ApiError(`API request failed: ${response.status}`, { status: response.status })
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

export async function apiPost(path, payload, options = {}) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), options.timeout || API_TIMEOUT_MS)

  try {
    const url = new URL(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`)
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new ApiError(`API request failed: ${response.status}`, { status: response.status })
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
