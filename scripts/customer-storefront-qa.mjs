import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const isLive = process.argv.includes('--live')
const baseUrl = process.env.CUSTOMER_QA_BASE_URL || (isLive
  ? 'https://stroy-rayon-react.vercel.app'
  : 'http://127.0.0.1:4184')
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const debugPort = Number(process.env.CUSTOMER_QA_DEBUG_PORT || 9392)
const tempRoot = path.join(process.env.TEMP || process.cwd(), 'stroyrayon-customer-qa')
const profileDir = path.join(tempRoot, `chrome-${Date.now()}`)
const resultFile = path.join(tempRoot, `result-${isLive ? 'live' : 'preview'}.json`)

const viewports = [
  { width: 360, height: 800, mobile: true },
  { width: 390, height: 844, mobile: true },
  { width: 768, height: 1024, mobile: false },
  { width: 1024, height: 900, mobile: false },
  { width: 1366, height: 900, mobile: false },
]

const categoryRoutes = [
  '/',
  '/catalog',
  '/catalog/kurulush',
  '/catalog/inzhenerdik-santehnika',
  '/catalog/inzhenerdik-santehnika/otoplenie/suu-teplyi-pol',
  '/catalog/santehnika',
  '/catalog/elektrika',
  '/catalog/elektrika/elektr-teplyi-pol',
  '/catalog/shaimandar',
  '/catalog/bekitkich',
  '/catalog/boiok-tush-kagaz',
  '/catalog/ventilyaciya',
  '/catalog/bak-koroo',
]

const searchTerms = ['цемент', 'труба', 'насос', 'смеситель', 'кабель', 'автомат', 'боёк', 'вентиляция']

const expected = {
  kg: {
    lang: 'ky',
    chips: ['Курулуш', 'Инженердик сантехника', 'Сантехника', 'Электрика', 'Шаймандар', 'Бекиткич', 'Боёк', 'Вентиляция', 'Бак/чарба'],
    cart: 'Себет',
    checkout: 'Буйрутма берүү',
    whatsapp: 'WhatsApp аркылуу буйрутма жөнөтүү',
  },
  ru: {
    lang: 'ru',
    chips: ['Стройматериалы', 'Инженерная сантехника', 'Сантехника', 'Электрика', 'Инструменты', 'Крепёж', 'Краски и обои', 'Вентиляция', 'Сад и хозяйство'],
    cart: 'Корзина',
    checkout: 'Оформление заказа',
    whatsapp: 'Отправить заказ через WhatsApp',
  },
}

const customer = {
  name: 'Тест Кардар',
  phone: '+996 700 000 000',
  address: 'Бишкек',
  comment: 'Автоматтык QA тест, жөнөтпөңүз',
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(url, timeoutMs = 25000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // The local preview or Chrome is still starting.
    }
    await delay(250)
  }
  throw new Error(`Timed out waiting for ${url}`)
}

function launch(command, args, options = {}) {
  return spawn(command, args, { stdio: 'ignore', ...options })
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

  return {
    ws,
    send(method, params = {}) {
      nextId += 1
      ws.send(JSON.stringify({ id: nextId, method, params }))
      return new Promise((resolve, reject) => pending.set(nextId, { resolve, reject }))
    },
    on(method, listener) {
      const current = listeners.get(method) || []
      current.push(listener)
      listeners.set(method, current)
    },
  }
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
  const url = pathname.startsWith('http') ? pathname : `${baseUrl}${pathname}`
  await cdp.send('Page.navigate', { url })
  await delay(400)
  await evaluate(cdp, `new Promise((resolve) => {
    const started = Date.now();
    const tick = () => document.readyState === 'complete' || Date.now() - started > 2200
      ? setTimeout(resolve, 180)
      : setTimeout(tick, 100);
    tick();
  })`)
}

async function setLocale(cdp, locale) {
  await evaluate(cdp, `localStorage.setItem('stroyrayon.locale', ${JSON.stringify(locale)})`)
}

async function inspectPage(cdp) {
  return evaluate(cdp, `(() => {
    const root = document.documentElement;
    const body = document.body;
    const text = body?.innerText?.trim() || '';
    return {
      path: location.pathname + location.search,
      lang: root.lang,
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim() || '',
      textLength: text.length,
      header: Boolean(document.querySelector('.site-header')),
      footer: Boolean(document.querySelector('.site-footer')),
      breadcrumbs: Boolean(document.querySelector('.breadcrumbs')),
      categoryCards: document.querySelectorAll('.category-card').length,
      catalogSections: document.querySelectorAll('.catalog-directory-section, .catalog-node-tile').length,
      productCards: document.querySelectorAll('.product-card').length,
      productGrid: Boolean(document.querySelector('.product-grid')),
      emptyState: Boolean(document.querySelector('.empty-state')),
      chips: Array.from(document.querySelectorAll('.header-category-chip')).map((item) => item.textContent.trim()),
      overflow: Math.max(root.scrollWidth, body?.scrollWidth || 0) - root.clientWidth,
      brokenImages: Array.from(document.images)
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src || image.alt || 'unknown'),
      fatalText: /unexpected error|application error|cannot read properties|react error|white screen/i.test(text),
    };
  })()`)
}

function addCheck(checks, issues, name, passed, details = '') {
  checks.push({ name, passed, details })
  if (!passed) issues.push({ check: name, details })
}

function pageHealth(checks, issues, label, result, { breadcrumb = true, content = false } = {}) {
  addCheck(checks, issues, `${label}: page is not blank`, result.textLength > 20, `text length ${result.textLength}`)
  addCheck(checks, issues, `${label}: public layout`, result.header && result.footer)
  addCheck(checks, issues, `${label}: no horizontal overflow`, result.overflow <= 1, `${result.overflow}px`)
  addCheck(checks, issues, `${label}: no broken images`, result.brokenImages.length === 0, result.brokenImages.join(', '))
  addCheck(checks, issues, `${label}: no fatal error`, !result.fatalText)
  if (breadcrumb) addCheck(checks, issues, `${label}: breadcrumbs visible`, result.breadcrumbs)
  if (content) {
    addCheck(
      checks,
      issues,
      `${label}: category/product content visible`,
      result.categoryCards > 0 || result.catalogSections > 0 || result.productCards > 0 || result.productGrid || result.emptyState,
      `categories ${result.categoryCards}, directory ${result.catalogSections}, products ${result.productCards}`,
    )
  }
}

async function runRouteAudit(cdp, checks, issues) {
  for (const viewport of viewports) {
    await setViewport(cdp, viewport)
    for (const locale of ['kg', 'ru']) {
      await navigate(cdp, '/')
      await setLocale(cdp, locale)
      for (const route of categoryRoutes) {
        await navigate(cdp, route)
        const result = await inspectPage(cdp)
        const label = `${locale.toUpperCase()} ${viewport.width}px ${route}`
        pageHealth(checks, issues, label, result, { breadcrumb: route !== '/', content: true })
        addCheck(checks, issues, `${label}: page title`, Boolean(result.h1 || result.title), result.h1 || result.title)
        addCheck(checks, issues, `${label}: document language`, result.lang === expected[locale].lang, result.lang)
        addCheck(
          checks,
          issues,
          `${label}: header category language`,
          expected[locale].chips.every((chip, index) => result.chips[index] === chip),
          result.chips.join(' | '),
        )
      }
    }
  }
}

async function runSearchAudit(cdp, checks, issues) {
  await setViewport(cdp, viewports[1])
  for (const locale of ['kg', 'ru']) {
    await navigate(cdp, '/')
    await setLocale(cdp, locale)
    for (const term of searchTerms) {
      await navigate(cdp, '/')
      const result = await evaluate(cdp, `(() => {
        const input = document.querySelector('.search input');
        const form = document.querySelector('.search');
        if (!input || !form) return { submitted: false };
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(input, ${JSON.stringify(term)});
        input.dispatchEvent(new Event('input', { bubbles: true }));
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        return { submitted: true };
      })()`)
      await delay(500)
      const page = await inspectPage(cdp)
      const label = `${locale.toUpperCase()} search "${term}"`
      addCheck(checks, issues, `${label}: submitted`, result.submitted)
      addCheck(checks, issues, `${label}: query preserved`, new URL(`${baseUrl}${page.path}`).searchParams.get('q') === term, page.path)
      addCheck(checks, issues, `${label}: clean result or empty state`, page.productCards > 0 || page.emptyState, `products ${page.productCards}`)
      pageHealth(checks, issues, label, page, { content: true })
    }
  }
}

async function runCustomerFlow(cdp, locale, viewport, checks, issues) {
  const prefix = `${locale.toUpperCase()} ${viewport.width}px flow`
  await setViewport(cdp, viewport)
  await navigate(cdp, '/')
  await evaluate(cdp, `(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('stroyrayon.locale', ${JSON.stringify(locale)});
    return true;
  })()`)
  await navigate(cdp, '/catalog/inzhenerdik-santehnika')

  const productHref = await evaluate(cdp, `document.querySelector('.product-card__image, .product-card h3 a')?.getAttribute('href') || ''`)
  addCheck(checks, issues, `${prefix}: product card clickable`, productHref.startsWith('/product/'), productHref)
  if (!productHref) return

  await navigate(cdp, productHref)
  const product = await evaluate(cdp, `(() => ({
    title: document.querySelector('.product-info h1')?.textContent?.trim() || '',
    price: document.querySelector('.product-price strong')?.textContent?.trim() || '',
    unit: document.querySelector('.product-price span')?.textContent?.trim() || '',
    breadcrumbs: Boolean(document.querySelector('.breadcrumbs')),
    addButton: Boolean(document.querySelector('.product-info__actions button:not([disabled])')),
  }))()`)
  addCheck(checks, issues, `${prefix}: product title`, Boolean(product.title), product.title)
  addCheck(checks, issues, `${prefix}: product price`, Boolean(product.price) && !/NaN/.test(product.price), product.price)
  addCheck(checks, issues, `${prefix}: product unit`, Boolean(product.unit), product.unit)
  addCheck(checks, issues, `${prefix}: product breadcrumbs`, product.breadcrumbs)

  const added = await evaluate(cdp, `(() => {
    const variant = document.querySelector('.variant-option:not([disabled])');
    if (variant) variant.click();
    const button = document.querySelector('.product-info__actions button:not([disabled])');
    if (!button) return false;
    button.click();
    return true;
  })()`)
  await delay(250)
  const badge = await evaluate(cdp, `document.querySelector('.cart-link span')?.textContent?.trim() || '0'`)
  addCheck(checks, issues, `${prefix}: add to cart`, added)
  addCheck(checks, issues, `${prefix}: cart badge increased`, Number(badge) > 0, badge)

  await navigate(cdp, '/cart')
  const cartInitial = await evaluate(cdp, `(() => ({
    heading: document.querySelector('h1')?.textContent?.trim() || '',
    items: document.querySelectorAll('.cart-item').length,
    quantity: document.querySelector('.quantity-control span')?.textContent?.trim() || '',
    total: document.querySelector('.cart-summary strong:last-of-type')?.textContent?.trim() || '',
    itemName: document.querySelector('.cart-item h3')?.textContent?.trim() || '',
  }))()`)
  addCheck(checks, issues, `${prefix}: cart localized`, cartInitial.heading === expected[locale].cart, cartInitial.heading)
  addCheck(checks, issues, `${prefix}: cart item visible`, cartInitial.items === 1, String(cartInitial.items))
  addCheck(checks, issues, `${prefix}: cart total valid`, Boolean(cartInitial.total) && !/NaN/.test(cartInitial.total), cartInitial.total)

  const changed = await evaluate(cdp, `(() => {
    const buttons = document.querySelectorAll('.quantity-control button');
    if (buttons.length < 2) return false;
    buttons[1].click();
    return true;
  })()`)
  await delay(180)
  const afterPlus = await evaluate(cdp, `(() => ({
    quantity: document.querySelector('.quantity-control span')?.textContent?.trim() || '',
    total: document.querySelector('.cart-summary strong:last-of-type')?.textContent?.trim() || '',
  }))()`)
  addCheck(checks, issues, `${prefix}: quantity plus`, changed && Number(afterPlus.quantity) > Number(cartInitial.quantity), afterPlus.quantity)
  addCheck(checks, issues, `${prefix}: total changes`, afterPlus.total !== cartInitial.total && !/NaN/.test(afterPlus.total), afterPlus.total)

  await evaluate(cdp, `document.querySelector('.quantity-control button')?.click()`)
  await delay(180)
  const afterMinus = await evaluate(cdp, `document.querySelector('.quantity-control span')?.textContent?.trim() || ''`)
  addCheck(checks, issues, `${prefix}: quantity minus`, afterMinus === cartInitial.quantity, afterMinus)

  await evaluate(cdp, `document.querySelector('.cart-item__remove')?.click()`)
  await delay(180)
  const empty = await evaluate(cdp, `Boolean(document.querySelector('.empty-state')) && document.querySelectorAll('.cart-item').length === 0`)
  addCheck(checks, issues, `${prefix}: remove and empty state`, empty)

  await navigate(cdp, productHref)
  await evaluate(cdp, `(() => {
    const variant = document.querySelector('.variant-option:not([disabled])');
    if (variant) variant.click();
    document.querySelector('.product-info__actions button:not([disabled])')?.click();
  })()`)
  await delay(200)
  await navigate(cdp, '/checkout')
  const checkoutInitial = await evaluate(cdp, `(() => ({
    heading: document.querySelector('h1')?.textContent?.trim() || '',
    form: Boolean(document.querySelector('.checkout-form')),
    summary: Boolean(document.querySelector('.cart-summary')),
    preview: Boolean(document.querySelector('.order-preview')),
    submitText: document.querySelector('.checkout-form button[type="submit"]')?.textContent?.trim() || '',
    submitDisabled: document.querySelector('.checkout-form button[type="submit"]')?.disabled ?? true,
  }))()`)
  addCheck(checks, issues, `${prefix}: checkout localized`, checkoutInitial.heading === expected[locale].checkout, checkoutInitial.heading)
  addCheck(checks, issues, `${prefix}: checkout form and summary`, checkoutInitial.form && checkoutInitial.summary && checkoutInitial.preview)
  addCheck(checks, issues, `${prefix}: required form blocks empty submit`, checkoutInitial.submitDisabled)
  addCheck(checks, issues, `${prefix}: WhatsApp CTA localized`, checkoutInitial.submitText === expected[locale].whatsapp, checkoutInitial.submitText)

  const filled = await evaluate(cdp, `(() => {
    const fields = document.querySelectorAll('.checkout-form input, .checkout-form textarea');
    const values = ${JSON.stringify([customer.name, customer.phone, customer.address, customer.comment])};
    if (fields.length < 4) return false;
    fields.forEach((field, index) => {
      const prototype = field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(field, values[index]);
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
    return true;
  })()`)
  await delay(250)
  const preview = await evaluate(cdp, `(() => ({
    text: document.querySelector('.order-preview pre')?.textContent || '',
    disabled: document.querySelector('.checkout-form button[type="submit"]')?.disabled ?? true,
  }))()`)
  addCheck(checks, issues, `${prefix}: checkout fields filled`, filled)
  addCheck(checks, issues, `${prefix}: checkout submit enabled`, !preview.disabled)
  addCheck(
    checks,
    issues,
    `${prefix}: order preview includes customer and product`,
    preview.text.includes(customer.name)
      && preview.text.includes(customer.phone)
      && preview.text.includes(customer.address)
      && preview.text.includes(customer.comment)
      && preview.text.includes(cartInitial.itemName)
      && !preview.text.includes('NaN'),
  )

  await evaluate(cdp, `document.querySelector('.checkout-form')?.requestSubmit()`)
  await delay(300)
  const openedUrl = await evaluate(cdp, `window.__customerQaOpenedUrls?.at(-1) || ''`)
  let message = ''
  try {
    const parsed = new URL(openedUrl)
    message = parsed.searchParams.get('text') || ''
  } catch {
    // A missing or malformed URL is reported by the assertions below.
  }
  addCheck(checks, issues, `${prefix}: WhatsApp navigation intercepted`, Boolean(openedUrl), openedUrl)
  addCheck(checks, issues, `${prefix}: WhatsApp host`, /^https:\/\/(wa\.me|api\.whatsapp\.com)\//.test(openedUrl), openedUrl)
  addCheck(checks, issues, `${prefix}: WhatsApp message URL encoded`, /[?&]text=.+%/.test(openedUrl), openedUrl)
  addCheck(
    checks,
    issues,
    `${prefix}: WhatsApp message complete`,
    message.includes(customer.name)
      && message.includes(customer.phone)
      && message.includes(customer.address)
      && message.includes(customer.comment)
      && message.includes(cartInitial.itemName)
      && /сумма|сумма|жалпы/i.test(message)
      && !message.includes('NaN'),
  )

  const checkoutPage = await inspectPage(cdp)
  pageHealth(checks, issues, `${prefix}: checkout page`, checkoutPage)
}

async function main() {
  if (!existsSync(chromePath)) throw new Error(`Chrome not found: ${chromePath}`)
  await mkdir(tempRoot, { recursive: true })

  const localServer = isLive
    ? null
    : launch('npm.cmd', ['run', 'preview', '--', '--host', '127.0.0.1', '--port', new URL(baseUrl).port], { shell: true })
  if (localServer) await waitFor(baseUrl)

  const chrome = launch(chromePath, [
    '--headless',
    '--disable-gpu',
    '--no-first-run',
    '--disable-background-networking',
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ])

  const checks = []
  const issues = []
  const consoleErrors = []
  const failedAssets = []
  const backendBlockers = []

  try {
    const cdp = await connect()
    await Promise.all([
      cdp.send('Page.enable'),
      cdp.send('Runtime.enable'),
      cdp.send('Network.enable'),
      cdp.send('Log.enable'),
    ])
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: `window.__customerQaOpenedUrls = [];
        window.open = (url) => {
          window.__customerQaOpenedUrls.push(String(url));
          return { closed: false, close() {} };
        };`,
    })

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
      if (response.status < 400) return
      const item = `${response.status} ${type}: ${response.url}`
      if (/localhost:4000|127\.0\.0\.1:4000/.test(response.url)) backendBlockers.push(item)
      else if (['Document', 'Script', 'Stylesheet', 'Image', 'Font', 'XHR', 'Fetch'].includes(type)) failedAssets.push(item)
    })
    cdp.on('Network.loadingFailed', ({ errorText, type, canceled }) => {
      if (!canceled && !/ERR_ABORTED/.test(errorText || '') && type !== 'Other') failedAssets.push(`${type}: ${errorText}`)
    })

    await runRouteAudit(cdp, checks, issues)
    await runSearchAudit(cdp, checks, issues)
    for (const viewport of viewports) {
      for (const locale of ['kg', 'ru']) {
        await runCustomerFlow(cdp, locale, viewport, checks, issues)
      }
    }

    addCheck(checks, issues, 'No browser console errors', consoleErrors.length === 0, [...new Set(consoleErrors)].join(' | '))
    addCheck(checks, issues, 'No failed storefront assets or requests', failedAssets.length === 0, [...new Set(failedAssets)].join(' | '))

    const summary = {
      mode: isLive ? 'live' : 'production-preview',
      baseUrl,
      passed: issues.length === 0,
      checks: checks.length,
      failedChecks: issues.length,
      viewports: viewports.map((viewport) => viewport.width),
      locales: ['kg', 'ru'],
      routes: categoryRoutes,
      searchTerms,
      consoleErrors: [...new Set(consoleErrors)],
      failedAssets: [...new Set(failedAssets)],
      knownBackendProductionBlockers: [...new Set(backendBlockers)],
      issues,
    }
    await writeFile(resultFile, JSON.stringify(summary, null, 2), 'utf8')
    console.log(JSON.stringify(summary, null, 2))
    cdp.ws.close()
    if (issues.length) process.exitCode = 2
  } finally {
    chrome.kill()
    localServer?.kill()
    await rm(profileDir, { recursive: true, force: true }).catch(() => {})
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
