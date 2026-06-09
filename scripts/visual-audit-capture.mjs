import { mkdir, rm, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const root = process.cwd()
const reportDir = path.join(root, 'reports', 'visual-audit')
const screenshotDir = path.join(reportDir, 'screenshots')
const baseUrl = process.env.VISUAL_AUDIT_BASE_URL || 'http://127.0.0.1:5173'
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const debugPort = Number(process.env.VISUAL_AUDIT_DEBUG_PORT || 9333)
const userDataDir = path.join(process.env.TEMP || root, `stroyrayon-visual-audit-${Date.now()}`)

const viewports = [
  { key: 'desktop', label: 'Desktop 1440x1200', width: 1440, height: 1200, mobile: false },
  { key: 'tablet', label: 'Tablet 768x1200', width: 768, height: 1200, mobile: false },
  { key: 'mobile', label: 'Mobile 390x844', width: 390, height: 844, mobile: true },
]

const routes = [
  { id: '01-home', label: 'Home', path: '/' },
  { id: '02-catalog', label: 'Catalog', path: '/catalog' },
  { id: '03-catalog-stroymaterial', label: 'Catalog / stroymaterial', path: '/catalog/stroymaterial' },
  { id: '04-catalog-profilder', label: 'Catalog / stroymaterial / profilder', path: '/catalog/stroymaterial/profilder' },
  { id: '05-catalog-engineering', label: 'Catalog / inzhenerdik-santehnika', path: '/catalog/inzhenerdik-santehnika' },
  { id: '06-catalog-ppr', label: 'Catalog / PPR pipes and fittings', path: '/catalog/inzhenerdik-santehnika/ppr-trubalar-fitingder' },
  { id: '07-catalog-elektrika', label: 'Catalog / elektrika', path: '/catalog/elektrika' },
  { id: '08-catalog-ventilyaciya', label: 'Catalog / ventilyaciya', path: '/catalog/ventilyaciya' },
  { id: '09-catalog-instrument', label: 'Catalog / instrument', path: '/catalog/instrument' },
  { id: '10-catalog-teplyi-pol', label: 'Catalog / teplyi-pol', path: '/catalog/teplyi-pol' },
  { id: '11-catalog-bak-koroo', label: 'Catalog / bak-koroo', path: '/catalog/bak-koroo' },
  { id: '12-catalog-paint', label: 'Catalog / boiok-tush-kagaz', path: '/catalog/boiok-tush-kagaz' },
  { id: '13-product-ppr-truba', label: 'Product / ppr-truba-pn20', path: '/product/ppr-truba-pn20' },
  { id: '14-product-ppr-ugolok', label: 'Product / ppr-ugolok-90', path: '/product/ppr-ugolok-90' },
  { id: '15-product-kabel-requested', label: 'Product / kabel-vvgng requested slug', path: '/product/kabel-vvgng' },
  { id: '16-product-gips-requested', label: 'Product / gips-shtukaturka requested slug', path: '/product/gips-shtukaturka' },
  { id: '17-product-smesitel-requested', label: 'Product / smesitel-kuhnya requested slug', path: '/product/smesitel-kuhnya' },
  { id: '18-product-vent-grid', label: 'Product / ventilation grille', path: '/product/ventilyaciya-reshetkasy-150x150mm' },
  { id: '19-search-ppr', label: 'Search / ppr', path: '/search?q=%D0%BF%D0%BF%D1%80' },
  { id: '20-search-kabel', label: 'Search / cable', path: '/search?q=%D0%BA%D0%B0%D0%B1%D0%B5%D0%BB%D1%8C' },
  { id: '21-search-plaster', label: 'Search / plaster', path: '/search?q=%D1%88%D1%82%D1%83%D0%BA%D0%B0%D1%82%D1%83%D1%80%D0%BA%D0%B0' },
  { id: '22-search-vent', label: 'Search / ventilation', path: '/search?q=%D0%B2%D0%B5%D0%BD%D1%82%D0%B8%D0%BB%D1%8F%D1%86%D0%B8%D1%8F' },
  { id: '23-search-warm-floor', label: 'Search / warm floor', path: '/search?q=%D1%82%D0%B5%D0%BF%D0%BB%D1%8B%D0%B9%20%D0%BF%D0%BE%D0%BB' },
  { id: '24-cart-empty', label: 'Cart / empty', path: '/cart' },
  { id: '25-checkout-empty', label: 'Checkout / empty', path: '/checkout' },
  { id: '29-contacts', label: 'Contacts', path: '/contacts' },
  { id: '30-delivery', label: 'Delivery and payment', path: '/delivery' },
]

const interactiveRoutes = [
  { id: '26-product-ppr-25mm', label: 'Interactive / PPR 25 mm selected', path: '/product/ppr-truba-pn20', mode: 'variant25' },
  { id: '27-cart-ppr-25mm', label: 'Interactive / cart with PPR 25 mm', path: '/cart', mode: 'cart' },
  { id: '28-checkout-ppr-25mm', label: 'Interactive / checkout with PPR 25 mm', path: '/checkout', mode: 'checkout' },
]

const issues = []

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitFor(url, timeoutMs = 15000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return response
    } catch {
      // keep waiting
    }
    await delay(250)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function startChrome() {
  if (!existsSync(chromePath)) {
    throw new Error(`Chrome not found at ${chromePath}`)
  }

  return spawn(chromePath, [
    '--headless',
    '--disable-gpu',
    '--no-first-run',
    '--hide-scrollbars',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    'about:blank',
  ], {
    stdio: 'ignore',
    detached: false,
  })
}

async function connectPage() {
  await waitFor(`http://127.0.0.1:${debugPort}/json/version`)
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()
  const page = targets.find((target) => target.type === 'page')
  if (!page?.webSocketDebuggerUrl) throw new Error('No Chrome page target found')

  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })

  let commandId = 0
  const pending = new Map()
  const events = new EventTarget()

  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id)
      pending.delete(message.id)
      if (message.error) reject(new Error(message.error.message || JSON.stringify(message.error)))
      else resolve(message.result || {})
      return
    }
    if (message.method) {
      events.dispatchEvent(new CustomEvent(message.method, { detail: message.params || {} }))
    }
  })

  function send(method, params = {}) {
    commandId += 1
    ws.send(JSON.stringify({ id: commandId, method, params }))
    return new Promise((resolve, reject) => pending.set(commandId, { resolve, reject }))
  }

  function waitEvent(name, timeoutMs = 12000) {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        events.removeEventListener(name, onEvent)
        resolve(null)
      }, timeoutMs)
      function onEvent(event) {
        clearTimeout(timeout)
        events.removeEventListener(name, onEvent)
        resolve(event.detail)
      }
      events.addEventListener(name, onEvent)
    })
  }

  return { ws, send, waitEvent }
}

async function evaluate(cdp, expression, awaitPromise = true) {
  const result = await cdp.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
  })
  return result.result?.value
}

async function setupViewport(cdp, viewport) {
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile,
  })
  await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: viewport.mobile })
}

async function navigate(cdp, routePath) {
  const load = cdp.waitEvent('Page.loadEventFired')
  await cdp.send('Page.navigate', { url: `${baseUrl}${routePath}` })
  await load
  await evaluate(cdp, `new Promise((resolve) => {
    const ready = () => Array.from(document.images).every((img) => img.complete)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => {})
    const started = Date.now()
    const tick = () => {
      if (ready() || Date.now() - started > 3000) resolve(true)
      else setTimeout(tick, 100)
    }
    setTimeout(tick, 350)
  })`)
  await delay(300)
}

async function clickByText(cdp, selector, text) {
  return evaluate(cdp, `(() => {
    const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
    const target = nodes.find((node) => node.textContent.includes(${JSON.stringify(text)}));
    if (!target) return false;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    target.click();
    return true;
  })()`)
}

async function clickFirst(cdp, selector) {
  return evaluate(cdp, `(() => {
    const target = document.querySelector(${JSON.stringify(selector)});
    if (!target) return false;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    target.click();
    return true;
  })()`)
}

async function applyMode(cdp, mode) {
  if (mode === 'variant25' || mode === 'cart' || mode === 'checkout') {
    await clickByText(cdp, '.variant-option', '25 мм')
    await delay(300)
  }
  if (mode === 'cart' || mode === 'checkout') {
    await clickFirst(cdp, '.product-info__actions button:not([disabled])')
    await delay(500)
    await navigate(cdp, mode === 'cart' ? '/cart' : '/checkout')
  }
}

async function capture(cdp, filename) {
  const dimensions = await evaluate(cdp, `(() => {
    const body = document.body;
    const doc = document.documentElement;
    return {
      width: Math.max(body.scrollWidth, doc.scrollWidth, doc.clientWidth),
      height: Math.max(body.scrollHeight, doc.scrollHeight, doc.clientHeight),
      title: document.title,
      text: body.innerText.slice(0, 800),
      brokenImages: Array.from(document.images).filter((img) => img.complete && img.naturalWidth === 0).length
    };
  })()`)

  const width = Math.min(Math.ceil(dimensions.width || 1200), 2400)
  const height = Math.min(Math.ceil(dimensions.height || 1200), 9000)
  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width, height, scale: 1 },
  })
  const outPath = path.join(screenshotDir, filename)
  await writeFile(outPath, Buffer.from(screenshot.data, 'base64'))
  return {
    file: filename,
    bytes: Buffer.byteLength(screenshot.data, 'base64'),
    dimensions: { width, height },
    title: dimensions.title,
    brokenImages: dimensions.brokenImages,
    textSample: dimensions.text,
  }
}

function htmlEscape(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

async function createReport(results) {
  const critical = issues.filter((issue) => issue.severity === 'Critical').length
  const important = issues.filter((issue) => issue.severity === 'Important').length
  const minor = issues.filter((issue) => issue.severity === 'Minor').length
  const brokenImages = results.reduce((sum, group) => sum + group.captures.reduce((inner, item) => inner + Number(item.brokenImages || 0), 0), 0)
  const screenshotCount = results.reduce((sum, group) => sum + group.captures.length, 0)

  const routeSections = results.map((group) => `
    <section class="route">
      <h2>${htmlEscape(group.label)}</h2>
      <p><code>${htmlEscape(group.path)}</code></p>
      <p class="comment">${htmlEscape(group.comment || 'Visual pass captured for layout, images, typography, and responsive behavior review.')}</p>
      <div class="shots">
        ${group.captures.map((shot) => `
          <figure>
            <figcaption>${htmlEscape(shot.viewportLabel)} - ${shot.dimensions.width}x${shot.dimensions.height}${shot.brokenImages ? ` - broken images: ${shot.brokenImages}` : ''}</figcaption>
            <a href="screenshots/${htmlEscape(shot.file)}"><img src="screenshots/${htmlEscape(shot.file)}" alt="${htmlEscape(group.label)} ${htmlEscape(shot.viewportLabel)} screenshot"></a>
          </figure>
        `).join('')}
      </div>
    </section>
  `).join('\n')

  const issueRows = issues.map((issue) => `
    <tr>
      <td>${htmlEscape(issue.severity)}</td>
      <td><code>${htmlEscape(issue.page)}</code></td>
      <td>${htmlEscape(issue.viewport)}</td>
      <td>${htmlEscape(issue.problem)}</td>
      <td>${htmlEscape(issue.suggestedFix)}</td>
      <td><code>${htmlEscape(issue.screenshot)}</code></td>
    </tr>
  `).join('\n')

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>StroyRayon Visual Audit</title>
  <style>
    :root { color-scheme: light; --bg:#f7f5ef; --panel:#fff; --ink:#10251d; --muted:#60716a; --line:#ddd4c4; --brand:#1f6b4a; }
    body { margin:0; font-family: Arial, sans-serif; background:var(--bg); color:var(--ink); }
    header { padding:32px; background:#fff; border-bottom:1px solid var(--line); }
    main { padding:24px 32px 48px; }
    h1 { margin:0 0 8px; }
    h2 { margin:0 0 8px; }
    code { background:#eef3ef; padding:2px 5px; border-radius:4px; }
    .summary { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:12px; margin-top:20px; }
    .metric { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:14px; }
    .metric strong { display:block; font-size:28px; color:var(--brand); }
    .route { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:18px; margin:18px 0; }
    .comment { color:var(--muted); }
    .shots { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:14px; align-items:start; }
    figure { margin:0; border:1px solid var(--line); border-radius:6px; overflow:hidden; background:#fafafa; }
    figcaption { padding:8px 10px; font-size:13px; color:var(--muted); border-bottom:1px solid var(--line); }
    img { display:block; width:100%; height:360px; object-fit:contain; background:#f7f7f7; }
    table { border-collapse:collapse; width:100%; background:#fff; border:1px solid var(--line); }
    th,td { text-align:left; vertical-align:top; padding:10px; border-bottom:1px solid var(--line); }
    th { background:#eef3ef; }
    .note { background:#fff7df; border:1px solid #eed48a; border-radius:8px; padding:14px; margin:18px 0; }
  </style>
</head>
<body>
  <header>
    <h1>StroyRayon Visual Audit</h1>
    <p>Generated from local dev server: <code>${htmlEscape(baseUrl)}</code></p>
    <div class="summary">
      <div class="metric"><strong>${screenshotCount}</strong>screenshots</div>
      <div class="metric"><strong>${critical}</strong>critical issues</div>
      <div class="metric"><strong>${important}</strong>important issues</div>
      <div class="metric"><strong>${minor}</strong>minor issues</div>
      <div class="metric"><strong>${brokenImages}</strong>detected broken images</div>
    </div>
  </header>
  <main>
    <section class="note">
      <strong>Audit scope:</strong> screenshots plus safe visual observations. Product data, prices, catalog paths, cart logic, and variant logic were not changed. Safe fixes applied: footer separators, cart/checkout mobile bottom padding, product detail card typography, related products mobile card spacing, placeholder hero proportions, and legacy product slug aliases.
    </section>
    <section>
      <h2>Issues</h2>
      <table>
        <thead><tr><th>Severity</th><th>Page</th><th>Viewport</th><th>Problem</th><th>Suggested fix</th><th>Screenshot</th></tr></thead>
        <tbody>${issueRows || '<tr><td colspan="6">No issues recorded.</td></tr>'}</tbody>
      </table>
    </section>
    ${routeSections}
  </main>
</body>
</html>`

  await writeFile(path.join(reportDir, 'visual-audit.html'), html, 'utf8')
  await writeFile(path.join(reportDir, 'visual-audit-summary.json'), JSON.stringify({ screenshotCount, critical, important, minor, brokenImages, issues, results }, null, 2), 'utf8')
}

async function main() {
  await mkdir(screenshotDir, { recursive: true })
  await rm(screenshotDir, { recursive: true, force: true })
  await mkdir(screenshotDir, { recursive: true })

  const browser = startChrome()
  try {
    const cdp = await connectPage()
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')

    const allGroups = []
    for (const route of routes) {
      const group = { ...route, captures: [] }
      for (const viewport of viewports) {
        await setupViewport(cdp, viewport)
        await navigate(cdp, route.path)
        const file = `${route.id}-${viewport.key}.png`
        const captureInfo = await capture(cdp, file)
        group.captures.push({ ...captureInfo, viewport: viewport.key, viewportLabel: viewport.label })
      }
      allGroups.push(group)
      console.log(`Captured ${route.id}`)
    }

    for (const route of interactiveRoutes) {
      const group = { ...route, captures: [], comment: 'Interactive state captured after selecting 25 mm variant and/or placing it into cart.' }
      for (const viewport of viewports) {
        await setupViewport(cdp, viewport)
        await navigate(cdp, '/product/ppr-truba-pn20')
        await applyMode(cdp, route.mode)
        const file = `${route.id}-${viewport.key}.png`
        const captureInfo = await capture(cdp, file)
        group.captures.push({ ...captureInfo, viewport: viewport.key, viewportLabel: viewport.label })
      }
      allGroups.push(group)
      console.log(`Captured ${route.id}`)
    }

    await createReport(allGroups)
    cdp.ws.close()
    console.log(JSON.stringify({ screenshots: allGroups.reduce((sum, item) => sum + item.captures.length, 0), report: path.join(reportDir, 'visual-audit.html') }, null, 2))
  } finally {
    browser.kill()
    await rm(userDataDir, { recursive: true, force: true }).catch(() => {})
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
