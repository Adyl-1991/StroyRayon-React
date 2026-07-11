const args = new Set(process.argv.slice(2))
const allowLocal = args.has('--allow-local')

const rawBaseUrl =
  process.env.PRODUCTION_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  'https://api.stroyrayon.kg/api'

const adminEmail = process.env.PRODUCTION_ADMIN_EMAIL || process.env.ADMIN_EMAIL || ''
const adminPassword = process.env.PRODUCTION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || ''
const productId = process.env.PRODUCTION_SMOKE_PRODUCT_ID || process.env.SMOKE_PRODUCT_ID || ''
const expectedImageBaseUrl = (
  process.env.PRODUCTION_EXPECTED_IMAGE_BASE_URL ||
  'https://pub-f9c20e9a8b41477593b4d90d78a6fc3b.r2.dev'
).replace(/\/+$/g, '')

const checks = []
const issues = []

function normalizeApiBaseUrl(value) {
  const parsed = new URL(value)
  parsed.pathname = parsed.pathname.replace(/\/+$/g, '')
  if (!parsed.pathname.endsWith('/api')) {
    parsed.pathname = `${parsed.pathname}/api`.replace(/\/+/g, '/')
  }
  return parsed.toString().replace(/\/+$/g, '')
}

function addCheck(name, pass, detail = '') {
  checks.push({ name, pass, detail })
  if (!pass) issues.push(`${name}${detail ? `: ${detail}` : ''}`)
}

function isLocalUrl(url) {
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  return { response, body }
}

function requireSmokeEnv() {
  const missing = []
  if (!adminEmail) missing.push('PRODUCTION_ADMIN_EMAIL')
  if (!adminPassword) missing.push('PRODUCTION_ADMIN_PASSWORD')
  if (!productId) missing.push('PRODUCTION_SMOKE_PRODUCT_ID')
  if (missing.length) {
    throw new Error(`Upload smoke requires ${missing.join(', ')}. Use a safe hidden/test product id.`)
  }
}

function tinyPngFile() {
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAFAgJ/l9X4qAAAAABJRU5ErkJggg=='
  const buffer = Buffer.from(base64, 'base64')
  const blob = new Blob([buffer], { type: 'image/png' })
  return { blob, size: buffer.length }
}

async function main() {
  requireSmokeEnv()
  const apiBaseUrl = normalizeApiBaseUrl(rawBaseUrl)
  const parsedBase = new URL(apiBaseUrl)
  addCheck('API base URL is not localhost', allowLocal || !isLocalUrl(parsedBase), apiBaseUrl)

  const login = await fetchJson(`${apiBaseUrl}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword }),
  })
  const token = login.body?.accessToken
  addCheck('Admin login returns token', login.response.ok && Boolean(token), `HTTP ${login.response.status}`)
  if (!token) throw new Error('Cannot continue upload smoke without an admin token')

  const authHeaders = { Authorization: `Bearer ${token}` }
  const before = await fetchJson(`${apiBaseUrl}/admin/products/${encodeURIComponent(productId)}`, { headers: authHeaders })
  const beforeImageIds = new Set((before.body?.images || []).map((image) => image.id))
  addCheck('Smoke product detail is reachable', before.response.ok && before.body?.id === productId, `HTTP ${before.response.status}`)

  const file = tinyPngFile()
  const formData = new FormData()
  formData.append('file', file.blob, `stage40g-upload-smoke-${Date.now()}.png`)
  const upload = await fetchJson(`${apiBaseUrl}/admin/products/${encodeURIComponent(productId)}/images`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  })
  const uploadedImage = (upload.body?.images || []).find((image) => !beforeImageIds.has(image.id))
  addCheck('Gallery upload attaches a new image', upload.response.ok && Boolean(uploadedImage?.id), `HTTP ${upload.response.status}`)
  addCheck('Uploaded image has public src', Boolean(uploadedImage?.src), uploadedImage?.src || 'missing')
  addCheck(
    'Uploaded image uses expected public storage base URL',
    uploadedImage?.src?.startsWith(`${expectedImageBaseUrl}/`) === true,
    uploadedImage?.src || 'missing',
  )
  addCheck(
    'Uploaded image retains persistent storage metadata',
    uploadedImage?.storageDriver === 's3' && Boolean(uploadedImage?.storageKey),
    `${uploadedImage?.storageDriver || 'missing'} / ${uploadedImage?.storageKey || 'missing'}`,
  )

  const persisted = await fetchJson(`${apiBaseUrl}/admin/products/${encodeURIComponent(productId)}`, { headers: authHeaders })
  const persistedImage = (persisted.body?.images || []).find((image) => image.id === uploadedImage?.id)
  addCheck(
    'Uploaded image record persists in product detail',
    persisted.response.ok && persistedImage?.src === uploadedImage?.src,
    `HTTP ${persisted.response.status}`,
  )

  if (uploadedImage?.src && /^https?:\/\//.test(uploadedImage.src)) {
    const imageResponse = await fetch(uploadedImage.src)
    await imageResponse.arrayBuffer()
    addCheck('Uploaded public image URL is reachable', imageResponse.ok, `${uploadedImage.src} -> HTTP ${imageResponse.status}`)
  }

  if (uploadedImage?.id) {
    const altText = `Stage 40G upload smoke ${new Date().toISOString()}`
    const update = await fetchJson(`${apiBaseUrl}/admin/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(uploadedImage.id)}`, {
      method: 'PATCH',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ alt: altText }),
    })
    const updatedImage = (update.body?.images || []).find((image) => image.id === uploadedImage.id)
    addCheck('Uploaded image alt can be updated', update.response.ok && updatedImage?.alt === altText, `HTTP ${update.response.status}`)

    const detach = await fetchJson(`${apiBaseUrl}/admin/products/${encodeURIComponent(productId)}/images/${encodeURIComponent(uploadedImage.id)}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    const detached = !(detach.body?.images || []).some((image) => image.id === uploadedImage.id)
    addCheck('Uploaded image can be detached safely', detach.response.ok && detached, `HTTP ${detach.response.status}`)
    addCheck('Delete endpoint returns storage delete result', Boolean(detach.body?.storageDelete), JSON.stringify(detach.body?.storageDelete))
  }

  const result = {
    passed: issues.length === 0,
    apiBaseUrl,
    productId,
    checks,
    failedChecks: issues.length,
    issues,
  }
  console.log(JSON.stringify(result, null, 2))
  if (!result.passed) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
