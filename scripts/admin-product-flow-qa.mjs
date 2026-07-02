import { existsSync, readFileSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import crypto from 'node:crypto'
import net from 'node:net'
import path from 'node:path'
import { promisify } from 'node:util'

const require = createRequire(import.meta.url)
const { AdminRole, PrismaClient } = require('../api/node_modules/@prisma/client')

const rootDir = process.cwd()
const apiDir = path.join(rootDir, 'api')
const apiEnvPath = path.join(apiDir, '.env')
const viteCliPath = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js')
const nestCliPath = path.join(apiDir, 'node_modules', '@nestjs', 'cli', 'bin', 'nest.js')
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const isWindows = process.platform === 'win32'
const runId = String(Date.now()).slice(-8)
const apiPort = Number(process.env.STAGE37_API_PORT || 4027)
const sitePort = Number(process.env.STAGE37_SITE_PORT || 4187)
const debugPort = Number(process.env.STAGE37_DEBUG_PORT || 9400 + Math.floor(Math.random() * 400))
const apiBaseUrl = process.env.STAGE37_API_URL || `http://127.0.0.1:${apiPort}/api`
const siteBaseUrl = process.env.STAGE37_SITE_URL || `http://127.0.0.1:${sitePort}`
const tempRoot = path.join(process.env.TEMP || rootDir, 'stroyrayon-stage37-qa')
const profileDir = path.join(tempRoot, `chrome-${runId}`)
const uploadFixturePath = path.join(tempRoot, `stage38-product-upload-${runId}.png`)
const startApi = process.env.STAGE37_START_API !== '0' && !process.env.STAGE37_API_URL
const startSite = process.env.STAGE37_START_SITE !== '0' && !process.env.STAGE37_SITE_URL
const adminEmail = process.env.STAGE37_ADMIN_EMAIL || 'stage37-admin@example.local'
const adminPassword = process.env.STAGE37_ADMIN_PASSWORD || 'stage37-local-admin-password'
const productSlug = `stage-37-local-product-${runId}`
const productSku = `SR-STAGE37-${runId}`
const customerPhone = `+99670037${runId.slice(-4)}`
const scrypt = promisify(crypto.scrypt)
const KEY_LENGTH = 64
const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8BQz0AEYBxVSFIAIfoGAXZ3w4cAAAAASUVORK5CYII=',
  'base64',
)
let uploadedProductImagePath = ''

function logStep(message) {
  console.log(`[qa:admin-product-flow] ${message}`)
}

function loadApiEnv() {
  if (!existsSync(apiEnvPath)) return
  const text = readFileSync(apiEnvPath, 'utf8')
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match || process.env[match[1]] !== undefined) continue
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '')
  }
}

function assertLocalDatabase() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) throw new Error('DATABASE_URL is required in api/.env for Stage 37 local QA')
  if (process.env.STAGE37_ALLOW_NONLOCAL_DB === '1') return
  const parsed = new URL(databaseUrl)
  const host = parsed.hostname.replace(/^\[|\]$/g, '')
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
    throw new Error(`Refusing to run Stage 37 QA against non-local database host: ${host}`)
  }
}

function ensureLocalJwtSecret() {
  if (process.env.ADMIN_JWT_SECRET?.length >= 32) return
  process.env.ADMIN_JWT_SECRET = `stage37-local-jwt-secret-${runId}-not-for-production`
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = await scrypt(password, salt, KEY_LENGTH)
  return `scrypt$${salt}$${derivedKey.toString('hex')}`
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function withTimeout(promise, timeoutMs, label) {
  let timer
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)
    }),
  ])
}

function waitForExit(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve()
  return new Promise((resolve) => {
    child.once('exit', resolve)
    child.once('error', resolve)
  })
}

async function runProcess(command, args, timeoutMs) {
  const child = spawn(command, args, { stdio: 'ignore', windowsHide: true })
  await withTimeout(waitForExit(child), timeoutMs, `${command} ${args.join(' ')}`)
}

async function stopProcessTree(child, label, warnings, timeoutMs = 5000) {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return
  try {
    if (isWindows) {
      await runProcess('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], timeoutMs)
    } else {
      child.kill('SIGTERM')
      await withTimeout(waitForExit(child), timeoutMs, `${label} shutdown`)
    }
  } catch (error) {
    warnings.push(`${label}: ${error.message}`)
  }
}

function canConnect(url, timeoutMs = 1000) {
  const target = new URL(url)
  const port = Number(target.port || (target.protocol === 'https:' ? 443 : 80))
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: target.hostname, port })
    const done = (value) => {
      socket.removeAllListeners()
      socket.destroy()
      resolve(value)
    }
    socket.setTimeout(timeoutMs)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
  })
}

async function waitForPort(url, timeoutMs = 30000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    if (await canConnect(url)) return
    await delay(250)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

async function fetchJsonWithRetry(url, timeoutMs = 30000) {
  const started = Date.now()
  let lastError
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return response.json()
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await delay(300)
  }
  throw lastError || new Error(`Timed out fetching ${url}`)
}

async function waitForEndpointOrExit(url, child, label, timeoutMs = 30000) {
  await withTimeout(Promise.race([
    waitForPort(url, timeoutMs),
    waitForExit(child).then(() => {
      throw new Error(`${label} exited before ${url} became available`)
    }),
  ]), timeoutMs + 1000, `${label} startup`)
}

function launch(command, args, options = {}) {
  return spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, ...options })
}

async function createPageTarget() {
  const url = `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(siteBaseUrl)}`
  const response = await fetch(url, { method: 'PUT' })
  return response.ok ? response.json() : null
}

function openWebSocket(url) {
  const ws = new WebSocket(url)
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.close()
      reject(new Error('CDP websocket open timed out'))
    }, 3000)
    ws.addEventListener('open', () => {
      clearTimeout(timer)
      resolve(ws)
    }, { once: true })
    ws.addEventListener('error', () => {
      clearTimeout(timer)
      reject(new Error('CDP websocket open failed'))
    }, { once: true })
  })
}

function createCdpClient(ws) {
  let nextId = 0
  const pending = new Map()
  const listeners = new Map()
  const rejectPending = (error) => {
    for (const [id, item] of pending) {
      clearTimeout(item.timer)
      item.reject(error)
      pending.delete(id)
    }
  }

  ws.addEventListener('message', async (event) => {
    const payload = typeof event.data === 'string'
      ? event.data
      : event.data instanceof Blob
        ? await event.data.text()
        : Buffer.from(event.data).toString('utf8')
    const message = JSON.parse(payload)
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id)
      pending.delete(message.id)
      clearTimeout(item.timer)
      if (message.error) item.reject(new Error(message.error.message))
      else item.resolve(message.result || {})
      return
    }
    for (const listener of listeners.get(message.method) || []) listener(message.params || {})
  })
  ws.addEventListener('close', () => rejectPending(new Error('CDP websocket closed')))
  ws.addEventListener('error', () => rejectPending(new Error('CDP websocket error')))

  return {
    send(method, params = {}) {
      if (ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error(`CDP websocket is not open for ${method}`))
      }
      nextId += 1
      const id = nextId
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error(`CDP command timed out: ${method}`))
        }, 30000)
        pending.set(id, { resolve, reject, timer })
        ws.send(JSON.stringify({ id, method, params }))
      })
    },
    on(method, listener) {
      listeners.set(method, [...(listeners.get(method) || []), listener])
    },
    close() {
      if (ws.readyState === WebSocket.CLOSED) return Promise.resolve()
      return new Promise((resolve) => {
        ws.addEventListener('close', resolve, { once: true })
        ws.addEventListener('error', resolve, { once: true })
        ws.close()
        setTimeout(resolve, 1000)
      })
    },
  }
}

async function connectCdp(timeoutMs = 30000) {
  const started = Date.now()
  let lastError
  while (Date.now() - started < timeoutMs) {
    try {
      const page = await createPageTarget()
      if (!page?.webSocketDebuggerUrl) throw new Error('Chrome page target not found')
      return createCdpClient(await openWebSocket(page.webSocketDebuggerUrl))
    } catch (error) {
      lastError = error
      await delay(250)
    }
  }
  throw lastError || new Error('Unable to connect to Chrome DevTools')
}

async function evaluate(cdp, expression) {
  const response = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || 'Browser evaluation failed')
  }
  return response.result?.value
}

async function waitFor(cdp, expression, timeoutMs = 15000) {
  const started = Date.now()
  let lastError
  while (Date.now() - started < timeoutMs) {
    try {
      if (await evaluate(cdp, expression)) return
    } catch (error) {
      lastError = error
    }
    await delay(200)
  }
  throw lastError || new Error(`Timeout waiting for ${expression}`)
}

async function navigate(cdp, pathname) {
  const url = pathname.startsWith('http') ? pathname : `${siteBaseUrl}${pathname}`
  await cdp.send('Page.navigate', { url })
  await delay(350)
  await waitFor(cdp, "document.readyState === 'complete'", 10000)
  await delay(250)
}

async function setValue(cdp, selector, value) {
  const ok = await evaluate(cdp, `(() => {
    const element = document.querySelector(${JSON.stringify(selector)});
    if (!element) return false;
    const prototype = element.tagName === 'TEXTAREA'
      ? HTMLTextAreaElement.prototype
      : element.tagName === 'SELECT'
        ? HTMLSelectElement.prototype
        : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, ${JSON.stringify(value)});
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`)
  if (!ok) throw new Error(`Element not found: ${selector}`)
}

async function setFileInput(cdp, selector, filePath) {
  const documentResult = await cdp.send('DOM.getDocument', { depth: -1, pierce: true })
  const queryResult = await cdp.send('DOM.querySelector', {
    nodeId: documentResult.root.nodeId,
    selector,
  })
  if (!queryResult.nodeId) throw new Error(`File input not found: ${selector}`)
  await cdp.send('DOM.setFileInputFiles', {
    nodeId: queryResult.nodeId,
    files: [filePath],
  })
}

function addCheck(checks, issues, name, passed, details = '') {
  checks.push({ name, passed, details })
  if (!passed) issues.push({ name, details })
}

async function setupLocalData(prisma) {
  const passwordHash = await hashPassword(adminPassword)
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash, name: 'Stage 37 Admin', role: AdminRole.OWNER, isActive: true },
    create: { email: adminEmail, passwordHash, name: 'Stage 37 Admin', role: AdminRole.OWNER, isActive: true },
  })
  await prisma.product.deleteMany({
    where: { OR: [{ slug: productSlug }, { sku: productSku }] },
  })
  const categories = await prisma.catalogNode.count({ where: { isActive: true } })
  if (!categories) throw new Error('No active catalog categories found. Run the local API seed before Stage 37 QA.')
}

async function cleanupLocalData(prisma) {
  const customers = await prisma.customer.findMany({
    where: { phone: customerPhone },
    select: { id: true },
  })
  const customerIds = customers.map((customer) => customer.id)
  if (customerIds.length) {
    await prisma.order.deleteMany({ where: { customerId: { in: customerIds } } })
    await prisma.customer.deleteMany({ where: { id: { in: customerIds } } })
  }
  await prisma.product.deleteMany({ where: { OR: [{ slug: productSlug }, { sku: productSku }] } })
  await prisma.adminUser.deleteMany({ where: { email: adminEmail } })
  if (uploadedProductImagePath?.startsWith('/uploads/products/')) {
    const uploadRoot = path.resolve(apiDir, 'uploads', 'products')
    const uploadPath = path.resolve(apiDir, uploadedProductImagePath.replace(/^\/+/, ''))
    if (uploadPath.startsWith(`${uploadRoot}${path.sep}`)) {
      await rm(uploadPath, { force: true })
    }
  }
}

async function runBrowserFlow(cdp, checks, issues) {
  await cdp.send('Runtime.enable')
  await cdp.send('Network.enable')
  await cdp.send('Log.enable')
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true })
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
    source: `window.__stage37OpenedUrls = [];
      window.open = (url) => {
        window.__stage37OpenedUrls.push(String(url));
        return { closed: false, close() {} };
      };`,
  })

  await navigate(cdp, '/admin/products')
  await waitFor(cdp, "location.pathname === '/admin/login'")
  addCheck(checks, issues, 'Admin products route redirects to login', true)

  await setValue(cdp, '.admin-login-card input[type=email]', adminEmail)
  await setValue(cdp, '.admin-login-card input[type=password]', adminPassword)
  await evaluate(cdp, "document.querySelector('.admin-login-card').requestSubmit()")
  await waitFor(cdp, "location.pathname === '/admin/orders'", 15000)
  addCheck(checks, issues, 'Admin login succeeds', true)

  await navigate(cdp, '/admin/products/new')
  await waitFor(cdp, "Boolean(document.querySelector('[data-qa=\"admin-product-create-form\"]'))")
  const selectedCategory = await evaluate(cdp, `(() => {
    const select = document.querySelector('[data-qa="product-category"]');
    const options = Array.from(select.options);
    const preferred = options.find((option) => option.textContent.includes('inzhenerdik-santehnika')) || options[0];
    select.value = preferred.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return preferred.textContent.trim();
  })()`)
  addCheck(checks, issues, 'Create form loads categories', Boolean(selectedCategory), selectedCategory)

  await setValue(cdp, '[data-qa="product-title-kg"]', `Stage 37 KG товар ${runId}`)
  await setValue(cdp, '[data-qa="product-title-ru"]', `Stage 37 RU товар ${runId}`)
  await setValue(cdp, '[data-qa="product-slug"]', productSlug)
  await setValue(cdp, '[data-qa="product-sku"]', productSku)
  await setValue(cdp, '[data-qa="product-short-description-kg"]', 'Stage 37 кыска сүрөттөмө')
  await setValue(cdp, '[data-qa="product-description-kg"]', 'Stage 37 кыргызча толук сүрөттөмө')
  await setValue(cdp, '[data-qa="product-description-ru"]', 'Stage 37 русское полное описание')
  await setValue(cdp, '[data-qa="product-price"]', '1234')
  await setValue(cdp, '[data-qa="product-stock"]', '4')
  await setValue(cdp, '[data-qa="product-unit"]', 'даана')
  await setValue(cdp, '[data-qa="product-stock-status"]', 'IN_STOCK')
  await setValue(cdp, '[data-qa="product-admin-note"]', 'Stage 37 local QA product')
  await setFileInput(cdp, '[data-qa="product-image-file"]', uploadFixturePath)
  await waitFor(cdp, "document.querySelector('[data-qa=\"product-image-src\"]')?.value.includes('/uploads/products/')", 15000)
  await waitFor(cdp, "Boolean(document.querySelector('.admin-image-preview img')?.naturalWidth)", 15000)
  const uploadState = await evaluate(cdp, `(() => {
    const imageSrc = document.querySelector('[data-qa="product-image-src"]')?.value || '';
    const preview = document.querySelector('.admin-image-preview img');
    return {
      imageSrc,
      imageAlt: document.querySelector('[data-qa="product-image-alt"]')?.value || '',
      status: document.querySelector('.admin-upload-status')?.textContent || '',
      previewReady: Boolean(preview && preview.complete && preview.naturalWidth > 0),
    };
  })()`)
  uploadedProductImagePath = new URL(uploadState.imageSrc).pathname
  const staticUploadResponse = await fetch(uploadState.imageSrc)
  addCheck(checks, issues, 'Product image file upload populates URL', uploadedProductImagePath.startsWith('/uploads/products/'), uploadState.imageSrc)
  addCheck(checks, issues, 'Product image upload sets alt fallback', Boolean(uploadState.imageAlt), uploadState.imageAlt)
  addCheck(checks, issues, 'Product image upload shows admin success status', uploadState.status.includes('URL'), uploadState.status)
  addCheck(checks, issues, 'Product image upload preview renders', uploadState.previewReady)
  addCheck(checks, issues, 'Uploaded product image is served statically', staticUploadResponse.ok, `${staticUploadResponse.status} ${uploadState.imageSrc}`)
  await setValue(cdp, '[data-qa="product-title-kg"]', `Stage 37 KG товар ${runId}`)
  await setValue(cdp, '[data-qa="product-title-ru"]', `Stage 37 RU товар ${runId}`)
  await setValue(cdp, '[data-qa="product-slug"]', productSlug)
  await setValue(cdp, '[data-qa="product-sku"]', productSku)
  await setValue(cdp, '[data-qa="product-short-description-kg"]', 'Stage 37 кыска сүрөттөмө')
  await setValue(cdp, '[data-qa="product-description-kg"]', 'Stage 37 кыргызча толук сүрөттөмө')
  await setValue(cdp, '[data-qa="product-description-ru"]', 'Stage 37 русское полное описание')
  await setValue(cdp, '[data-qa="product-price"]', '1234')
  await setValue(cdp, '[data-qa="product-stock"]', '4')
  await setValue(cdp, '[data-qa="product-unit"]', 'даана')
  await setValue(cdp, '[data-qa="product-stock-status"]', 'IN_STOCK')
  await setValue(cdp, '[data-qa="product-admin-note"]', 'Stage 37 local QA product')
  await evaluate(cdp, "document.querySelector('[data-qa=\"admin-product-create-form\"]').requestSubmit()")
  await waitFor(cdp, "location.pathname.startsWith('/admin/products/') && location.pathname !== '/admin/products/new'", 15000)
  await waitFor(cdp, "Boolean(document.querySelector('[data-qa=\"admin-product-edit-form\"]'))", 15000)
  const detailText = await evaluate(cdp, 'document.body.innerText')
  addCheck(checks, issues, 'Created product opens admin detail', detailText.includes(productSlug), productSlug)
  addCheck(checks, issues, 'Created product keeps uploaded image in admin detail', detailText.includes('Фото') && detailText.includes('Готово'), detailText.slice(0, 300))

  const updatedTitleKg = `Stage 40B KG товар ${runId}`
  const updatedTitleRu = `Stage 40B RU товар ${runId}`
  await setValue(cdp, '[data-qa="edit-title-kg"]', updatedTitleKg)
  await setValue(cdp, '[data-qa="edit-title-ru"]', updatedTitleRu)
  await setValue(cdp, '[data-qa="edit-short-description-kg"]', 'Stage 40B short description')
  await setValue(cdp, '[data-qa="edit-description-kg"]', 'Stage 40B full KG description')
  await setValue(cdp, '[data-qa="edit-description-ru"]', 'Stage 40B full RU description')
  await setValue(cdp, '[data-qa="edit-spec-key"]', 'Stage 40B spec')
  await setValue(cdp, '[data-qa="edit-spec-value"]', 'Stage 40B value')
  await setValue(cdp, '[data-qa="edit-document-title"]', 'Stage 40B certificate')
  await setValue(cdp, '[data-qa="edit-document-url"]', 'https://example.com/stage40b-certificate.pdf')
  await setValue(cdp, '[data-qa="edit-document-type"]', 'CERTIFICATE')
  await setFileInput(cdp, '[data-qa="edit-image-file"]', uploadFixturePath)
  await waitFor(cdp, "document.querySelectorAll('.admin-gallery-item').length >= 2", 15000)
  await evaluate(cdp, "document.querySelector('[data-qa=\"admin-product-edit-form\"]').requestSubmit()")
  await waitFor(cdp, "document.querySelector('[role=\"status\"]')?.textContent.includes('Товар сохранен') || Boolean(document.querySelector('[role=\"alert\"]'))", 15000)
  const saveFeedback = await evaluate(cdp, `(() => ({
    status: document.querySelector('[role="status"]')?.textContent || '',
    alert: document.querySelector('[role="alert"]')?.textContent || '',
  }))()`)
  addCheck(checks, issues, 'Admin product detail save returns success', saveFeedback.status.includes('Товар сохранен'), JSON.stringify(saveFeedback))
  const editedDetail = await evaluate(cdp, `(() => ({
    title: document.querySelector('[data-qa="edit-title-kg"]')?.value || '',
    spec: document.querySelector('[data-qa="edit-spec-value"]')?.value || '',
    documents: document.querySelectorAll('[data-qa="edit-document-title"]').length,
    images: document.querySelectorAll('.admin-gallery-item').length,
  }))()`)
  addCheck(checks, issues, 'Admin product detail core editor saves title/specs/documents/images', editedDetail.title === updatedTitleKg && editedDetail.spec === 'Stage 40B value' && editedDetail.documents >= 1 && editedDetail.images >= 2, JSON.stringify(editedDetail))

  await navigate(cdp, `/admin/products?q=${encodeURIComponent(productSlug)}`)
  await waitFor(cdp, "Boolean(document.querySelector('.admin-products-table tbody tr'))")
  const listMatch = await evaluate(cdp, `document.body.innerText.includes(${JSON.stringify(productSlug)})`)
  addCheck(checks, issues, 'Created product appears in admin list search', listMatch, productSlug)

  const publicProduct = await fetch(`${apiBaseUrl}/products/${productSlug}`).then((response) => response.json())
  addCheck(checks, issues, 'Created product appears in public API', publicProduct?.slug === productSlug)
  addCheck(checks, issues, 'Public API exposes created price and stock', Number(publicProduct?.price) === 1234 && publicProduct?.stock?.quantity === 4)
  addCheck(checks, issues, 'Public API includes uploaded image', publicProduct?.images?.[0]?.src?.includes('/uploads/products/'), publicProduct?.images?.[0]?.src)
  addCheck(checks, issues, 'Public API exposes edited admin title and descriptions', publicProduct?.titleKg === updatedTitleKg && publicProduct?.descriptionRu === 'Stage 40B full RU description', publicProduct?.titleKg)
  addCheck(checks, issues, 'Public API exposes edited specs and documents', publicProduct?.specs?.['Stage 40B spec'] === 'Stage 40B value' && publicProduct?.documents?.[0]?.title === 'Stage 40B certificate', JSON.stringify({ specs: publicProduct?.specs, documents: publicProduct?.documents }))

  await navigate(cdp, `/catalog/${publicProduct.catalogPath.join('/')}`)
  addCheck(checks, issues, 'Created product has storefront category path', Boolean(publicProduct.catalogPath?.length), publicProduct.catalogPath.join('/'))

  await navigate(cdp, `/search?q=${encodeURIComponent(updatedTitleKg)}`)
  await waitFor(cdp, `document.body.innerText.includes(${JSON.stringify(updatedTitleKg)})`, 15000)
  addCheck(checks, issues, 'Created product appears in storefront search', true)

  await navigate(cdp, `/product/${productSlug}`)
  await waitFor(cdp, "document.readyState === 'complete'", 10000)
  await delay(1200)
  const productPage = await evaluate(cdp, `(() => ({
    path: location.pathname,
    title: document.querySelector('.product-info h1')?.textContent || '',
    body: document.body.innerText,
    imageOk: Array.from(document.images).every((image) => !image.complete || image.naturalWidth > 0),
    addEnabled: Boolean(document.querySelector('.product-info__actions button:not([disabled])')),
  }))()`)
  addCheck(checks, issues, 'Created product page shows edited title', productPage.title.includes(updatedTitleKg) || productPage.title.includes(updatedTitleRu), JSON.stringify({ path: productPage.path, title: productPage.title, body: productPage.body.slice(0, 240) }))
  addCheck(checks, issues, 'Created product page renders', productPage.title.includes(runId), productPage.title)
  addCheck(checks, issues, 'Product page renders edited specs and document', productPage.body.includes('Stage 40B value') && productPage.body.includes('Stage 40B certificate'))
  addCheck(checks, issues, 'Product uploaded image is not broken', productPage.imageOk)
  addCheck(checks, issues, 'Product can be added to cart while active/in stock', productPage.addEnabled)

  await evaluate(cdp, "document.querySelector('.product-info__actions button:not([disabled])').click()")
  await waitFor(cdp, `JSON.parse(localStorage.getItem('stroyrayon_cart') || '[]').some((item) => item.slug === ${JSON.stringify(productSlug)})`)
  await navigate(cdp, '/cart')
  await delay(800)
  const cartBody = await evaluate(cdp, 'document.body.innerText')
  addCheck(checks, issues, 'Created product is visible in cart', cartBody.includes(updatedTitleKg) || cartBody.includes(updatedTitleRu) || cartBody.includes(productSlug), cartBody.slice(0, 260))

  await navigate(cdp, '/checkout')
  await waitFor(cdp, "Boolean(document.querySelector('.checkout-form'))")
  await evaluate(cdp, `(() => {
    window.__stage37OpenedUrls = [];
    window.open = (url) => {
      window.__stage37OpenedUrls.push(String(url));
      return { closed: false, close() {} };
    };
    const fields = document.querySelectorAll('.checkout-form input, .checkout-form textarea');
    const values = ['Stage 37 Buyer', ${JSON.stringify(customerPhone)}, 'Bishkek Stage 37', 'Stage 37 checkout'];
    fields.forEach((field, index) => {
      const prototype = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, values[index]);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
    return fields.length;
  })()`)
  await delay(300)
  await evaluate(cdp, "document.querySelector('.checkout-form').requestSubmit()")
  await waitFor(cdp, "Boolean(document.querySelector('.checkout-success'))", 15000)
  const checkoutResult = await evaluate(cdp, `(() => ({
    success: document.querySelector('.checkout-success')?.innerText || '',
    openedUrl: window.__stage37OpenedUrls?.at(-1) || '',
    preview: document.querySelector('.order-preview pre')?.textContent || '',
  }))()`)
  addCheck(checks, issues, 'Checkout creates order confirmation', /SR-\d{4}-\d{6}/.test(checkoutResult.success), checkoutResult.success)
  addCheck(checks, issues, 'Checkout opens WhatsApp URL', /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(checkoutResult.openedUrl), checkoutResult.openedUrl)
  addCheck(checks, issues, 'WhatsApp message includes created product', checkoutResult.preview.includes(updatedTitleKg) || checkoutResult.preview.includes(updatedTitleRu))

  const token = await evaluate(cdp, "sessionStorage.getItem('stroyrayon_admin_token')")
  const authHeaders = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const adminProduct = await fetch(`${apiBaseUrl}/admin/products?q=${productSlug}`, {
    headers: authHeaders,
  }).then((response) => response.json())
  const productId = adminProduct.items?.[0]?.id
  addCheck(checks, issues, 'Admin API can find created product after checkout', Boolean(productId))

  await navigate(cdp, `/admin/products/${productId}`)
  await waitFor(cdp, "Boolean(document.querySelector('[data-qa=\"admin-product-edit-form\"]'))")
  await setValue(cdp, '[data-qa="edit-price"]', '1299')
  await setValue(cdp, '[data-qa="edit-stock"]', '6')
  await evaluate(cdp, "document.querySelector('[data-qa=\"admin-product-edit-form\"]').requestSubmit()")
  await waitFor(cdp, "document.querySelector('[role=\"status\"]')?.textContent.includes('Товар сохранен')")
  const updatedPublic = await fetch(`${apiBaseUrl}/products/${productSlug}`).then((response) => response.json())
  addCheck(checks, issues, 'Price edit updates storefront API', Number(updatedPublic.price) === 1299, String(updatedPublic.price))
  addCheck(checks, issues, 'Stock edit updates storefront API', updatedPublic.stock?.quantity === 6, String(updatedPublic.stock?.quantity))

  await evaluate(cdp, `(() => {
    const input = document.querySelector('[data-qa="edit-active"]');
    if (input.checked) input.click();
    document.querySelector('[data-qa="admin-product-edit-form"]').requestSubmit();
  })()`)
  await waitFor(cdp, "document.querySelector('[role=\"status\"]')?.textContent.includes('Товар сохранен')")
  const inactiveDetail = await fetch(`${apiBaseUrl}/products/${productSlug}`).then((response) => response.text())
  const inactiveList = await fetch(`${apiBaseUrl}/products?q=${encodeURIComponent(updatedTitleKg)}`).then((response) => response.json())
  addCheck(checks, issues, 'Inactive product is hidden from public detail API', inactiveDetail === '' || inactiveDetail === 'null', inactiveDetail)
  addCheck(checks, issues, 'Inactive product is hidden from public search API', !inactiveList.items?.some((item) => item.slug === productSlug))
}

async function main() {
  loadApiEnv()
  ensureLocalJwtSecret()
  assertLocalDatabase()
  if (!existsSync(chromePath)) throw new Error(`Chrome not found: ${chromePath}`)
  await mkdir(tempRoot, { recursive: true })
  await writeFile(uploadFixturePath, tinyPng)

  const prisma = new PrismaClient()
  const cleanupWarnings = []
  const checks = []
  const issues = []
  const consoleErrors = []
  const failedRequests = []
  const processOutput = []
  let apiServer = null
  let siteServer = null
  let chrome = null
  let cdp = null

  try {
    await setupLocalData(prisma)
    logStep('local admin and test namespace ready')

    if (startApi) {
      apiServer = launch(process.execPath, [nestCliPath, 'start'], {
        cwd: apiDir,
        env: {
          ...process.env,
          HOST: '127.0.0.1',
          PORT: String(apiPort),
          CORS_ORIGIN: siteBaseUrl,
        },
      })
      apiServer.stdout.on('data', (data) => processOutput.push(String(data).trim()))
      apiServer.stderr.on('data', (data) => processOutput.push(String(data).trim()))
      logStep(`API starting on ${apiBaseUrl}`)
      await waitForEndpointOrExit(apiBaseUrl.replace(/\/api$/, ''), apiServer, 'Nest API')
    }
    await fetchJsonWithRetry(`${apiBaseUrl}/health`, 30000)
    logStep('API ready')

    if (startSite) {
      siteServer = launch(process.execPath, [viteCliPath, '--host', '127.0.0.1', '--port', String(sitePort)], {
        cwd: rootDir,
        env: {
          ...process.env,
          VITE_API_BASE_URL: apiBaseUrl,
          VITE_USE_API: 'true',
        },
      })
      siteServer.stdout.on('data', (data) => processOutput.push(String(data).trim()))
      siteServer.stderr.on('data', (data) => processOutput.push(String(data).trim()))
      logStep(`Vite starting on ${siteBaseUrl}`)
      await waitForEndpointOrExit(siteBaseUrl, siteServer, 'Vite')
    }
    logStep('site ready')

    chrome = spawn(chromePath, [
      '--headless=new',
      '--disable-gpu',
      '--disable-gpu-compositing',
      '--disable-gpu-sandbox',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-extensions',
      '--disable-sync',
      '--disable-default-apps',
      '--disable-features=Vulkan,DefaultANGLEVulkan,VulkanFromANGLE,SkiaGraphite,DawnGraphiteCache,UseSkiaRenderer',
      '--use-angle=swiftshader',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--remote-allow-origins=*',
      `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`,
      'about:blank',
    ], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    chrome.stdout.on('data', (data) => processOutput.push(String(data).trim()))
    chrome.stderr.on('data', (data) => processOutput.push(String(data).trim()))
    await fetchJsonWithRetry(`http://127.0.0.1:${debugPort}/json/version`, 30000)
    cdp = await connectCdp()
    cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
      consoleErrors.push(exceptionDetails?.exception?.description || exceptionDetails?.text || 'Runtime exception')
    })
    cdp.on('Runtime.consoleAPICalled', ({ type, args }) => {
      if (type === 'error') consoleErrors.push(args.map((arg) => arg.value || arg.description || '').join(' '))
    })
    cdp.on('Log.entryAdded', ({ entry }) => {
      if (entry?.level === 'error') consoleErrors.push(entry.text)
    })
    cdp.on('Network.responseReceived', ({ response, type }) => {
      if (response.url.includes('/favicon.')) return
      if (response.status >= 400 && ['Document', 'Script', 'Stylesheet', 'Image', 'Font', 'XHR', 'Fetch'].includes(type)) {
        failedRequests.push(`${response.status} ${type}: ${response.url}`)
      }
    })

    await runBrowserFlow(cdp, checks, issues)
    addCheck(checks, issues, 'No browser console errors', consoleErrors.length === 0, [...new Set(consoleErrors)].join(' | '))
    addCheck(checks, issues, 'No failed browser network requests', failedRequests.length === 0, [...new Set(failedRequests)].join(' | '))

    const summary = {
      passed: issues.length === 0,
      apiBaseUrl,
      siteBaseUrl,
      productSlug,
      checks: checks.length,
      failedChecks: issues.length,
      issues,
      cleanupWarnings,
    }
    console.log(JSON.stringify(summary, null, 2))
    if (issues.length) process.exitCode = 2
  } catch (error) {
    const diagnostics = processOutput.filter(Boolean).slice(-20).join(' | ')
    if (diagnostics) console.error(`Process diagnostics: ${diagnostics}`)
    throw error
  } finally {
    if (cdp) {
      await withTimeout(cdp.send('Browser.close'), 3000, 'Chrome close').catch((error) => cleanupWarnings.push(`Chrome close: ${error.message}`))
      await withTimeout(cdp.close(), 2000, 'CDP close').catch((error) => cleanupWarnings.push(`CDP close: ${error.message}`))
    }
    await stopProcessTree(chrome, 'Chrome', cleanupWarnings)
    await stopProcessTree(siteServer, 'Vite', cleanupWarnings)
    await stopProcessTree(apiServer, 'Nest API', cleanupWarnings)
    await cleanupLocalData(prisma).catch((error) => cleanupWarnings.push(`local data cleanup: ${error.message}`))
    await prisma.$disconnect().catch((error) => cleanupWarnings.push(`Prisma disconnect: ${error.message}`))
    await rm(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 }).catch((error) => cleanupWarnings.push(`profile cleanup: ${error.message}`))
    if (cleanupWarnings.length) console.warn(`Cleanup warnings: ${cleanupWarnings.join(' | ')}`)
    logStep('cleanup complete')
  }
}

main()
  .then(() => {
    process.exit(process.exitCode || 0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
