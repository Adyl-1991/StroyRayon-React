import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const baseUrl = process.env.STAGE28_BASE_URL || 'http://127.0.0.1:4182'
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const debugPort = Number(process.env.STAGE28_DEBUG_PORT || 9348)
const tempRoot = path.join(process.env.TEMP || process.cwd(), 'stroyrayon-stage28-qa')
const profileDir = path.join(tempRoot, `chrome-${Date.now()}`)
const screenshotDir = path.join(tempRoot, 'screenshots')

const allViewports = [
  { key: '360', width: 360, height: 800, mobile: true },
  { key: '390', width: 390, height: 844, mobile: true },
  { key: '430', width: 430, height: 932, mobile: true },
  { key: '768', width: 768, height: 1024, mobile: false },
  { key: '1024', width: 1024, height: 900, mobile: false },
  { key: '1440', width: 1440, height: 1000, mobile: false },
]

const allRoutes = [
  { id: 'home', path: '/' },
  { id: 'catalog', path: '/catalog' },
  { id: 'category', path: '/catalog/stroymaterial' },
  { id: 'subcategory', path: '/catalog/inzhenerdik-santehnika/ppr-trubalar-fitingder' },
  { id: 'product', path: '/product/ppr-truba-pn20' },
  { id: 'cart', path: '/cart' },
  { id: 'checkout', path: '/checkout' },
  { id: 'search', path: '/search?q=%D0%BF%D0%BF%D1%80' },
  { id: 'contacts', path: '/contacts' },
  { id: 'delivery', path: '/delivery' },
  { id: 'about', path: '/about' },
  { id: 'payment', path: '/payment' },
  { id: 'return', path: '/return' },
  { id: 'privacy', path: '/privacy' },
  { id: 'admin-login', path: '/admin/login', admin: true },
  { id: 'admin-orders', path: '/admin/orders', admin: true, redirectsToLogin: true },
  { id: 'admin-products', path: '/admin/products', admin: true, redirectsToLogin: true },
]

const screenshotKeys = new Set([
  'home-360',
  'catalog-390',
  'product-430',
  'cart-390',
  'checkout-390',
  'admin-login-390',
  'home-1440',
])

const routeFilter = process.env.STAGE28_ROUTE
const viewportFilter = Number(process.env.STAGE28_VIEWPORT || 0)
const routes = routeFilter ? allRoutes.filter((route) => route.path === routeFilter) : allRoutes
const viewports = viewportFilter ? allViewports.filter((viewport) => viewport.width === viewportFilter) : allViewports

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(url, timeoutMs = 15000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Chrome is still starting.
    }
    await delay(200)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function launchChrome() {
  if (!existsSync(chromePath)) throw new Error(`Chrome not found: ${chromePath}`)
  return spawn(chromePath, [
    '--headless',
    '--disable-gpu',
    '--no-first-run',
    '--disable-background-networking',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ], { stdio: 'ignore' })
}

async function connect() {
  await waitFor(`http://127.0.0.1:${debugPort}/json/version`)
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()
  const page = targets.find((target) => target.type === 'page')
  if (!page?.webSocketDebuggerUrl) throw new Error('Chrome page target not found')

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })

  let nextId = 0
  const pending = new Map()
  const listeners = new Map()

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const promise = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) promise.reject(new Error(message.error.message))
      else promise.resolve(message.result || {})
      return
    }
    for (const listener of listeners.get(message.method) || []) listener(message.params || {})
  })

  const send = (method, params = {}) => {
    nextId += 1
    ws.send(JSON.stringify({ id: nextId, method, params }))
    return new Promise((resolve, reject) => pending.set(nextId, { resolve, reject }))
  }

  const on = (method, listener) => {
    const current = listeners.get(method) || []
    current.push(listener)
    listeners.set(method, current)
    return () => listeners.set(method, (listeners.get(method) || []).filter((item) => item !== listener))
  }

  return { ws, send, on }
}

async function evaluate(cdp, expression) {
  const response = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Browser evaluation failed')
  return response.result?.value
}

async function setViewport(cdp, viewport) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: viewport.mobile })
}

async function navigate(cdp, pathname) {
  await cdp.send('Page.navigate', { url: `${baseUrl}${pathname}` })
  await delay(350)
  await evaluate(cdp, `new Promise((resolve) => {
    const started = Date.now();
    const ready = () => document.readyState === 'complete';
    const tick = () => ready() || Date.now() - started > 1200
      ? setTimeout(() => resolve(true), 100)
      : setTimeout(tick, 100);
    tick();
  })`)
}

async function inspect(cdp) {
  return evaluate(cdp, `(() => {
    const root = document.documentElement;
    const body = document.body;
    const text = body?.innerText?.trim() || '';
    const brokenImages = Array.from(document.images)
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.currentSrc || image.src || image.alt || 'unknown');
    return {
      url: location.href,
      title: document.title,
      h1: document.querySelector('h1')?.innerText?.trim() || '',
      textLength: text.length,
      overflow: Math.max(root.scrollWidth, body?.scrollWidth || 0) - root.clientWidth,
      overflowElements: Array.from(document.querySelectorAll('body *'))
        .map((element) => {
          const box = element.getBoundingClientRect();
          return {
            tag: element.tagName.toLowerCase(),
            className: typeof element.className === 'string' ? element.className : '',
            left: Math.round(box.left),
            right: Math.round(box.right),
            width: Math.round(box.width),
          };
        })
        .filter((item) => item.right > root.clientWidth + 1 || item.left < -1)
        .slice(0, 12),
      brokenImages,
      publicHeader: Boolean(document.querySelector('.site-header')),
      publicFooter: Boolean(document.querySelector('.site-footer')),
      adminShell: Boolean(document.querySelector('.admin-shell, .admin-login')),
      fatalText: /unexpected error|application error|cannot read properties|failed to fetch/i.test(text),
    };
  })()`)
}

async function capture(cdp, filename) {
  const image = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  })
  const output = path.join(screenshotDir, filename)
  await writeFile(output, Buffer.from(image.data, 'base64'))
  return output
}

async function buyerFlow(cdp) {
  await evaluate(cdp, `(() => {
    localStorage.clear();
    sessionStorage.clear();
    return true;
  })()`)
  await navigate(cdp, '/product/ppr-truba-pn20')
  const added = await evaluate(cdp, `(() => {
    const variant = document.querySelector('.variant-option');
    if (variant) variant.click();
    const button = document.querySelector('.product-info__actions button:not([disabled])');
    if (!button) return false;
    button.click();
    return true;
  })()`)
  await delay(350)
  await navigate(cdp, '/cart')
  const cartBefore = await evaluate(cdp, `(() => ({
    items: document.querySelectorAll('.cart-item').length,
    quantity: document.querySelector('.quantity-control span')?.textContent?.trim() || ''
  }))()`)
  const incremented = await evaluate(cdp, `(() => {
    const buttons = document.querySelectorAll('.quantity-control button');
    if (!buttons[1]) return false;
    buttons[1].click();
    return true;
  })()`)
  await delay(250)
  const quantityAfter = await evaluate(cdp, `document.querySelector('.quantity-control span')?.textContent?.trim() || ''`)
  await navigate(cdp, '/checkout')
  const checkout = await evaluate(cdp, `(() => ({
    form: Boolean(document.querySelector('.checkout-form')),
    summary: Boolean(document.querySelector('.cart-summary')),
    disclaimer: /баа|налич|кампа|тактоо|акыркы/i.test(document.body.innerText)
  }))()`)
  return { added, cartBefore, incremented, quantityAfter, checkout }
}

async function main() {
  await mkdir(screenshotDir, { recursive: true })
  const chrome = launchChrome()
  const results = []
  const consoleErrors = []
  const failedRequests = []
  const localhostRequests = []

  try {
    const cdp = await connect()
    await Promise.all([
      cdp.send('Page.enable'),
      cdp.send('Runtime.enable'),
      cdp.send('Network.enable'),
      cdp.send('Log.enable'),
    ])

    cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => {
      consoleErrors.push(exceptionDetails?.exception?.description || exceptionDetails?.text || 'Runtime exception')
    })
    cdp.on('Log.entryAdded', ({ entry }) => {
      if (entry?.level === 'error') consoleErrors.push(entry.text)
    })
    cdp.on('Network.requestWillBeSent', ({ request }) => {
      if (/localhost:4000|127\.0\.0\.1:4000/.test(request?.url || '')) localhostRequests.push(request.url)
    })
    cdp.on('Network.loadingFailed', ({ errorText, type }) => {
      if (type !== 'Other') failedRequests.push(`${type}: ${errorText}`)
    })

    for (const viewport of viewports) {
      await setViewport(cdp, viewport)
      for (const route of routes) {
        const errorStart = consoleErrors.length
        const failedStart = failedRequests.length
        await navigate(cdp, route.path)
        const details = await inspect(cdp)
        const key = `${route.id}-${viewport.key}`
        let screenshot = null
        if (screenshotKeys.has(key)) screenshot = await capture(cdp, `${key}.png`)
        results.push({
          route: route.path,
          viewport: viewport.width,
          admin: Boolean(route.admin),
          redirectsToLogin: Boolean(route.redirectsToLogin),
          ...details,
          consoleErrors: consoleErrors.slice(errorStart),
          failedRequests: failedRequests.slice(failedStart),
          screenshot,
        })
      }
    }

    await setViewport(cdp, viewports.find((item) => item.width === 390) || viewports[0])
    const buyer = await buyerFlow(cdp)
    const issues = results.flatMap((result) => {
      const found = []
      if (result.textLength < 20) found.push('blank page')
      if (result.overflow > 1) {
        const elements = result.overflowElements
          .map((item) => `${item.tag}.${item.className || '-'} [${item.left},${item.right}]`)
          .join(', ')
        found.push(`horizontal overflow ${result.overflow}px${elements ? `: ${elements}` : ''}`)
      }
      if (result.brokenImages.length) found.push(`broken images: ${result.brokenImages.join(', ')}`)
      if (result.consoleErrors.length) found.push(`console errors: ${result.consoleErrors.join(' | ')}`)
      if (result.failedRequests.length) found.push(`failed requests: ${result.failedRequests.join(' | ')}`)
      if (result.fatalText) found.push('fatal error text visible')
      if (result.admin && (result.publicHeader || result.publicFooter)) found.push('public layout visible in admin')
      if (!result.admin && (!result.publicHeader || !result.publicFooter)) found.push('public layout missing')
      if (result.redirectsToLogin && !result.url.endsWith('/admin/login')) found.push('protected admin route did not redirect')
      return found.map((issue) => ({ route: result.route, viewport: result.viewport, issue }))
    })

    const summary = {
      baseUrl,
      routeChecks: results.length,
      viewports: viewports.map((item) => item.width),
      issues,
      localhostRequests: [...new Set(localhostRequests)],
      buyer,
      screenshots: results.filter((item) => item.screenshot).map((item) => item.screenshot),
      results,
    }
    const resultFile = path.join(tempRoot, `result-${new URL(baseUrl).hostname}.json`)
    await writeFile(resultFile, JSON.stringify(summary, null, 2), 'utf8')
    console.log(JSON.stringify({
      baseUrl,
      routeChecks: results.length,
      viewports: summary.viewports,
      issues,
      localhostRequests: summary.localhostRequests,
      buyer,
      screenshots: summary.screenshots,
      resultFile,
    }, null, 2))
    cdp.ws.close()
    if (issues.length || localhostRequests.length) process.exitCode = 2
  } finally {
    chrome.kill()
    await rm(profileDir, { recursive: true, force: true }).catch(() => {})
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
