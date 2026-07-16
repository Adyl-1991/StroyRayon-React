const args = new Set(process.argv.slice(2))
const allowLocal = args.has('--allow-local')

const rawBaseUrl =
  process.env.PRODUCTION_API_BASE_URL ||
  process.env.VITE_API_BASE_URL ||
  'https://api.stroyrayon.kg/api'

const adminEmail = process.env.PRODUCTION_ADMIN_EMAIL || process.env.ADMIN_EMAIL || ''
const adminPassword = process.env.PRODUCTION_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || ''
const requestedProductSlug = process.env.PRODUCTION_SMOKE_PRODUCT_SLUG || process.env.SMOKE_PRODUCT_SLUG || ''

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

async function fetchOk(url, options = {}) {
  const response = await fetch(url, options)
  await response.arrayBuffer()
  return response
}

async function main() {
  let apiBaseUrl
  try {
    apiBaseUrl = normalizeApiBaseUrl(rawBaseUrl)
  } catch (error) {
    throw new Error(`PRODUCTION_API_BASE_URL/VITE_API_BASE_URL is invalid: ${error.message}`)
  }

  const parsedBase = new URL(apiBaseUrl)
  addCheck('API base URL is not localhost', allowLocal || !isLocalUrl(parsedBase), apiBaseUrl)
  addCheck('API base URL includes /api', parsedBase.pathname.endsWith('/api'), apiBaseUrl)

  const health = await fetchJson(`${apiBaseUrl}/health`)
  addCheck('Health endpoint returns HTTP 200', health.response.ok, `HTTP ${health.response.status}`)
  addCheck('Health status is ok', health.body?.status === 'ok', JSON.stringify(health.body))
  addCheck('Health database is ok', health.body?.database === 'ok', JSON.stringify(health.body))

  const catalog = await fetchJson(`${apiBaseUrl}/catalog/tree`)
  addCheck('Catalog tree returns HTTP 200', catalog.response.ok, `HTTP ${catalog.response.status}`)
  addCheck('Catalog tree is non-empty', Array.isArray(catalog.body) && catalog.body.length > 0, JSON.stringify(catalog.body)?.slice(0, 240))

  const products = await fetchJson(`${apiBaseUrl}/products?limit=5`)
  const productItems = Array.isArray(products.body?.items) ? products.body.items : []
  addCheck('Products list returns HTTP 200', products.response.ok, `HTTP ${products.response.status}`)
  addCheck('Products list has items', productItems.length > 0, JSON.stringify(products.body)?.slice(0, 240))

  const productSlug = requestedProductSlug || productItems[0]?.slug
  addCheck('Product slug available for detail smoke', Boolean(productSlug), productSlug || 'missing')
  let productDetail = null
  if (productSlug) {
    const detail = await fetchJson(`${apiBaseUrl}/products/${encodeURIComponent(productSlug)}`)
    productDetail = detail.body
    addCheck('Product detail returns HTTP 200', detail.response.ok, `HTTP ${detail.response.status}`)
    addCheck('Product detail has matching slug', productDetail?.slug === productSlug, JSON.stringify(productDetail)?.slice(0, 240))

    const variants = Array.isArray(productDetail?.variants) ? productDetail.variants : []
    if (variants.length) {
      addCheck(
        'Product detail exposes commercially valid active variants',
        variants.every(
          (variant) =>
            variant.id &&
            variant.titleKg &&
            variant.sku &&
            variant.stockStatus &&
            (Number(variant.price) > 0 || variant.stockStatus === 'out_of_stock'),
        ),
        `${variants.length} variants; first: ${JSON.stringify(variants[0])}`,
      )
    }

    const images = Array.isArray(productDetail?.images) ? productDetail.images : []
    const imageUrls = images.map((image) => image?.src).filter(Boolean).filter((src) => /^https?:\/\//.test(src))
    if (imageUrls.length) {
      const imageResponse = await fetchOk(imageUrls[0])
      addCheck('First absolute product image URL is reachable', imageResponse.ok, `${imageUrls[0]} -> HTTP ${imageResponse.status}`)
    } else {
      addCheck('Product detail has image entries', images.length > 0, 'absolute image URL check skipped')
    }
  }

  const unauth = await fetchJson(`${apiBaseUrl}/admin/products?limit=1`)
  addCheck('Protected admin endpoint rejects unauthenticated request', unauth.response.status === 401, `HTTP ${unauth.response.status}`)

  if (adminEmail && adminPassword) {
    const login = await fetchJson(`${apiBaseUrl}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: adminEmail, password: adminPassword }),
    })
    const token = login.body?.accessToken
    addCheck('Admin login returns token', login.response.ok && Boolean(token), `HTTP ${login.response.status}`)
    if (token) {
      const headers = { Authorization: `Bearer ${token}` }
      const profile = await fetchJson(`${apiBaseUrl}/admin/auth/me`, { headers })
      addCheck('Admin profile accepts authenticated token', profile.response.ok && Boolean(profile.body?.email), `HTTP ${profile.response.status}`)
      const adminProducts = await fetchJson(`${apiBaseUrl}/admin/products?limit=1`, { headers })
      addCheck('Admin products accepts authenticated token', adminProducts.response.ok, `HTTP ${adminProducts.response.status}`)
    }
  } else {
    checks.push({
      name: 'Admin login smoke skipped',
      pass: true,
      detail: 'Set PRODUCTION_ADMIN_EMAIL and PRODUCTION_ADMIN_PASSWORD to run it',
      skipped: true,
    })
  }

  const result = {
    passed: issues.length === 0,
    apiBaseUrl,
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
