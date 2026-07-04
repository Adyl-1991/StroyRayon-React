const args = new Set(process.argv.slice(2))
const checkBackend = !args.has('--frontend-only')
const checkFrontend = !args.has('--backend-only')
const allowLocal = args.has('--allow-local')

const failures = []
const warnings = []

function requireEnv(name, section) {
  const value = process.env[name]?.trim()
  if (!value) failures.push(`${section}: ${name} is required`)
  return value || ''
}

function parseUrl(value, label) {
  try {
    return new URL(value)
  } catch {
    failures.push(`${label} must be a valid URL`)
    return null
  }
}

function isLocalUrl(url) {
  return ['localhost', '127.0.0.1', '0.0.0.0'].includes(url.hostname)
}

function validatePublicHttpsUrl(name, value, { requireApiPath = false } = {}) {
  const url = parseUrl(value, name)
  if (!url) return
  if (url.protocol !== 'https:') failures.push(`${name} must use https:// in production`)
  if (!allowLocal && isLocalUrl(url)) failures.push(`${name} must not point to localhost in production`)
  if (requireApiPath && !url.pathname.replace(/\/+$/g, '').endsWith('/api')) {
    failures.push(`${name} must include the /api path used by the frontend API client`)
  }
}

if (checkBackend) {
  const databaseUrl = requireEnv('DATABASE_URL', 'backend')
  if (databaseUrl && !databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
    failures.push('backend: DATABASE_URL must be a PostgreSQL connection string')
  }

  const adminJwtSecret = requireEnv('ADMIN_JWT_SECRET', 'backend')
  if (adminJwtSecret && adminJwtSecret.length < 32) {
    failures.push('backend: ADMIN_JWT_SECRET must contain at least 32 characters')
  }

  const corsOrigin = requireEnv('CORS_ORIGIN', 'backend')
  if (corsOrigin) {
    const origins = corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean)
    if (!origins.length || origins.includes('*')) {
      failures.push('backend: CORS_ORIGIN must contain explicit frontend origins, not *')
    }
    for (const origin of origins) {
      const parsed = parseUrl(origin, `backend: CORS_ORIGIN origin ${origin}`)
      if (!parsed) continue
      if (parsed.protocol !== 'https:' && !allowLocal) {
        failures.push(`backend: CORS_ORIGIN origin ${origin} must use https:// in production`)
      }
      if (!allowLocal && isLocalUrl(parsed)) {
        failures.push(`backend: CORS_ORIGIN origin ${origin} must not point to localhost in production`)
      }
    }
  }

  const publicApiOrigin = requireEnv('PUBLIC_API_ORIGIN', 'backend')
  if (publicApiOrigin) validatePublicHttpsUrl('backend: PUBLIC_API_ORIGIN', publicApiOrigin)

  const storageDriver = requireEnv('STORAGE_DRIVER', 'backend').toLowerCase()
  if (storageDriver && !['local', 's3'].includes(storageDriver)) {
    failures.push('backend: STORAGE_DRIVER must be local or s3')
  }
  if (storageDriver === 'local') {
    warnings.push('backend: STORAGE_DRIVER=local requires a persistent disk/volume in production')
  }
  if (storageDriver === 's3') {
    for (const name of [
      'S3_ENDPOINT',
      'S3_REGION',
      'S3_BUCKET',
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
      'S3_PUBLIC_BASE_URL',
    ]) {
      requireEnv(name, 'backend storage')
    }
    const s3Endpoint = process.env.S3_ENDPOINT?.trim()
    const s3PublicBaseUrl = process.env.S3_PUBLIC_BASE_URL?.trim()
    if (s3Endpoint) validatePublicHttpsUrl('backend storage: S3_ENDPOINT', s3Endpoint)
    if (s3PublicBaseUrl) validatePublicHttpsUrl('backend storage: S3_PUBLIC_BASE_URL', s3PublicBaseUrl)
  }
}

if (checkFrontend) {
  const viteUseApi = requireEnv('VITE_USE_API', 'frontend')
  if (viteUseApi && viteUseApi !== 'true') {
    failures.push('frontend: VITE_USE_API must be true for production')
  }
  const viteApiBaseUrl = requireEnv('VITE_API_BASE_URL', 'frontend')
  if (viteApiBaseUrl) validatePublicHttpsUrl('frontend: VITE_API_BASE_URL', viteApiBaseUrl, { requireApiPath: true })
}

const result = {
  passed: failures.length === 0,
  checked: {
    backend: checkBackend,
    frontend: checkFrontend,
  },
  failures,
  warnings,
}

console.log(JSON.stringify(result, null, 2))
if (!result.passed) process.exitCode = 1
