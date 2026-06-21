import { existsSync } from 'node:fs'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const baseUrl = process.env.STAGE31_BASE_URL || 'http://127.0.0.1:4183'
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const debugPort = Number(process.env.STAGE31_DEBUG_PORT || 9381)
const serverMode = process.env.STAGE31_SERVER === 'preview' ? 'preview' : 'dev'
const tempRoot = path.join(process.env.TEMP || process.cwd(), 'stroyrayon-stage31-qa')
const profileDir = path.join(tempRoot, `chrome-${Date.now()}`)

const viewports = [
  { width: 360, height: 800, mobile: true },
  { width: 390, height: 844, mobile: true },
  { width: 430, height: 932, mobile: true },
  { width: 768, height: 1024, mobile: false },
  { width: 1024, height: 900, mobile: false },
  { width: 1366, height: 900, mobile: false },
  { width: 1440, height: 1000, mobile: false },
  { width: 1707, height: 960, mobile: false },
]

const routes = [
  { path: '/', kg: null, ru: null },
  { path: '/catalog', kg: 'Каталог', ru: 'Каталог' },
  { path: '/catalog/kurulush', kg: 'Курулуш материалдары', ru: 'Стройматериалы' },
  { path: '/catalog/inzhenerdik-santehnika', kg: 'Инженердик сантехника', ru: 'Инженерная сантехника' },
  { path: '/catalog/santehnika', kg: 'Сантехника', ru: 'Сантехника' },
  { path: '/catalog/elektrika', kg: 'Электрика', ru: 'Электрика' },
  { path: '/catalog/shaimandar', kg: 'Шаймандар', ru: 'Инструменты' },
  { path: '/catalog/bekitkich', kg: 'Бекиткич', ru: 'Крепёж' },
  { path: '/catalog/boiok-tush-kagaz', kg: 'Боёк, туш жана кагаз', ru: 'Краски и обои' },
  { path: '/catalog/ventilyaciya', kg: 'Вентиляция', ru: 'Вентиляция' },
  { path: '/product/ppr-truba-pn20', kg: null, ru: null },
  { path: '/cart', kg: 'Себет', ru: 'Корзина', cart: true },
  { path: '/checkout', kg: 'Буйрутма берүү', ru: 'Оформление заказа', cart: true },
  { path: '/search', kg: 'Товар издөө', ru: 'Поиск товаров' },
  { path: '/contacts', kg: 'Байланыш', ru: 'Контакты' },
  { path: '/delivery', kg: 'Жеткирүү жана төлөм', ru: 'Доставка и оплата' },
  { path: '/about', kg: 'StroyRayon жөнүндө', ru: 'О StroyRayon' },
  { path: '/payment', kg: 'Төлөм шарттары', ru: 'Условия оплаты' },
  { path: '/return', kg: 'Кайтаруу жана алмаштыруу', ru: 'Возврат и обмен' },
  { path: '/privacy', kg: 'Купуялык саясаты', ru: 'Политика конфиденциальности' },
]
const routeFilter = process.env.STAGE31_ROUTE
const viewportFilter = Number(process.env.STAGE31_VIEWPORT || 0)
const selectedRoutes = routeFilter ? routes.filter((route) => route.path === routeFilter) : routes
const selectedViewports = viewportFilter ? viewports.filter((viewport) => viewport.width === viewportFilter) : viewports

const adminRoutes = ['/admin/login', '/admin/orders', '/admin/products']
const expectedChips = {
  kg: ['Курулуш', 'Инженердик сантехника', 'Сантехника', 'Электрика', 'Шаймандар', 'Бекиткич', 'Боёк', 'Вентиляция'],
  ru: ['Стройматериалы', 'Инженерная сантехника', 'Сантехника', 'Электрика', 'Инструменты', 'Крепёж', 'Краски и обои', 'Вентиляция'],
}
const expectedCta = {
  kg: { title: 'Материалдар тизмеси?', action: 'WhatsAppка жөнөтүү' },
  ru: { title: 'Список материалов?', action: 'Отправить в WhatsApp' },
}
const forbiddenUi = {
  kg: ['Главная', 'Стройматериалы', 'Инженерная сантехника', 'Инструменты', 'Крепёж', 'Краски и обои', 'Корзина', 'Оформление заказа', 'Доставка и оплата', 'Контакты', 'Разделы', 'Товары в этом разделе', 'Удалить'],
  ru: ['Башкы бет', 'Курулуш', 'Инженердик сантехника', 'Шаймандар', 'Бекиткич', 'Боёк', 'Себет', 'Буйрутма берүү', 'Жеткирүү жана төлөм', 'Байланыш', 'Бөлүмдөр', 'Бул бөлүмдөгү товарлар', 'Өчүрүү'],
}
const cartSeed = [{
  cartItemId: 'ppr-pipe-20-pn20',
  productId: 'ppr-pipe-20-pn20',
  slug: 'ppr-truba-pn20',
  name: 'ППР түтүк 20 мм PN20',
  titleKg: 'ППР түтүк 20 мм PN20',
  titleRu: 'ППР труба 20 мм PN20',
  price: 120,
  image: { src: '/images/products/ppr-pipe-20-pn20.webp', alt: '', width: 82, height: 82 },
  unit: 'даана',
  unitKg: 'даана',
  quantity: 1,
  sku: 'SR-PPR-20-PN20',
  packageInfo: '1 даана',
  packageInfoRu: '1 штука',
}]

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitFor(url, timeoutMs = 20000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url)
      if (response.ok) return
    } catch {
      // Service is starting.
    }
    await delay(200)
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
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (!message.id || !pending.has(message.id)) return
    const promise = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) promise.reject(new Error(message.error.message))
    else promise.resolve(message.result || {})
  })
  return {
    ws,
    send(method, params = {}) {
      nextId += 1
      ws.send(JSON.stringify({ id: nextId, method, params }))
      return new Promise((resolve, reject) => pending.set(nextId, { resolve, reject }))
    },
  }
}

async function evaluate(cdp, expression) {
  const response = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Browser evaluation failed')
  return response.result?.value
}

async function navigate(cdp, pathname) {
  await cdp.send('Page.navigate', { url: `${baseUrl}${pathname}` })
  await delay(500)
  await evaluate(cdp, `new Promise((resolve) => {
    const started = Date.now();
    const tick = () => document.readyState === 'complete' || Date.now() - started > 1800
      ? setTimeout(resolve, 150)
      : setTimeout(tick, 100);
    tick();
  })`)
}

async function setLocaleAndCart(cdp, locale, withCart) {
  await evaluate(cdp, `(() => {
    localStorage.setItem('stroyrayon.locale', ${JSON.stringify(locale)});
    localStorage.setItem('stroyrayon_cart', ${JSON.stringify(JSON.stringify(cartSeed))});
    ${withCart ? '' : "localStorage.removeItem('stroyrayon_cart');"}
    return true;
  })()`)
}

async function inspect(cdp) {
  return evaluate(cdp, `(() => {
    const root = document.documentElement;
    const body = document.body;
    const categoryScroll = document.querySelector('.header-category-scroll');
    const categoryChips = Array.from(document.querySelectorAll('.header-category-chip'));
    const materialsCta = document.querySelector('.header-materials-cta');
    const scrollRect = categoryScroll?.getBoundingClientRect();
    const ctaRect = materialsCta?.getBoundingClientRect();
    const ctaVisible = Boolean(materialsCta && getComputedStyle(materialsCta).display !== 'none');
    return {
      url: location.pathname,
      lang: root.lang,
      h1: document.querySelector('h1')?.innerText?.trim() || '',
      text: body?.innerText || '',
      overflow: Math.max(root.scrollWidth, body?.scrollWidth || 0) - root.clientWidth,
      brokenImages: Array.from(document.images).filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
      header: Boolean(document.querySelector('.site-header')),
      footer: Boolean(document.querySelector('.site-footer')),
      admin: Boolean(document.querySelector('.admin-shell, .admin-login')),
      chips: categoryChips.map((item) => item.textContent.trim()),
      headerText: document.querySelector('.header-category-strip')?.innerText || '',
      ctaTitle: document.querySelector('.header-materials-cta strong')?.textContent?.trim() || '',
      ctaAction: document.querySelector('.header-materials-cta small')?.textContent?.trim() || '',
      categoryLayout: {
        ctaVisible,
        overlap: Boolean(ctaVisible && scrollRect && ctaRect && scrollRect.right > ctaRect.left - 8),
        allChipsVisible: Boolean(
          scrollRect
          && categoryChips.length === 8
          && categoryChips.every((chip) => {
            const rect = chip.getBoundingClientRect();
            return rect.left >= scrollRect.left - 1 && rect.right <= scrollRect.right + 1;
          })
        ),
      },
    };
  })()`)
}

async function main() {
  if (!existsSync(chromePath)) throw new Error(`Chrome not found: ${chromePath}`)
  await mkdir(tempRoot, { recursive: true })
  const url = new URL(baseUrl)
  const localServer = url.hostname === '127.0.0.1'
    ? launch('npm.cmd', ['run', serverMode, '--', '--host', '127.0.0.1', '--port', url.port], { shell: true })
    : null
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

  const issues = []
  const checks = []
  try {
    const cdp = await connect()
    await Promise.all([cdp.send('Page.enable'), cdp.send('Runtime.enable')])
    await navigate(cdp, '/')

    for (const viewport of selectedViewports) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: viewport.mobile })
      for (const locale of ['kg', 'ru']) {
        for (const route of selectedRoutes) {
          await setLocaleAndCart(cdp, locale, route.cart)
          await navigate(cdp, route.path)
          const result = await inspect(cdp)
          const expectedLang = locale === 'ru' ? 'ru' : 'ky'
          const expectedHeading = route[locale]
          const forbidden = forbiddenUi[locale].filter((text) => result.text.includes(text))
          const chipMismatch = result.chips.length !== expectedChips[locale].length
            || expectedChips[locale].some((text, index) => result.chips[index] !== text)
          const ctaMismatch = result.ctaTitle !== expectedCta[locale].title || result.ctaAction !== expectedCta[locale].action
          if (result.lang !== expectedLang) issues.push({ route: route.path, viewport: viewport.width, locale, issue: `html lang ${result.lang}` })
          if (expectedHeading && result.h1 !== expectedHeading) issues.push({ route: route.path, viewport: viewport.width, locale, issue: `h1 "${result.h1}" expected "${expectedHeading}"` })
          if (result.overflow > 1) issues.push({ route: route.path, viewport: viewport.width, locale, issue: `horizontal overflow ${result.overflow}px` })
          if (result.brokenImages.length) issues.push({ route: route.path, viewport: viewport.width, locale, issue: `broken images ${result.brokenImages.length}` })
          if (!result.header || !result.footer) issues.push({ route: route.path, viewport: viewport.width, locale, issue: 'public layout missing' })
          if (chipMismatch) issues.push({ route: route.path, viewport: viewport.width, locale, issue: `category chips mismatch: ${result.chips.join(' | ')}` })
          if (ctaMismatch) issues.push({ route: route.path, viewport: viewport.width, locale, issue: `header CTA mismatch: ${result.ctaTitle} | ${result.ctaAction}` })
          if (result.categoryLayout.ctaVisible && result.categoryLayout.overlap) {
            issues.push({ route: route.path, viewport: viewport.width, locale, issue: 'header category chips overlap WhatsApp CTA' })
          }
          if (result.categoryLayout.ctaVisible && !result.categoryLayout.allChipsVisible) {
            issues.push({ route: route.path, viewport: viewport.width, locale, issue: 'header category chips are clipped beside WhatsApp CTA' })
          }
          for (const forbiddenText of forbiddenUi[locale].filter((text) => result.headerText.includes(text))) {
            issues.push({ route: route.path, viewport: viewport.width, locale, issue: `header language leakage: ${forbiddenText}` })
          }
          if (forbidden.length) issues.push({ route: route.path, viewport: viewport.width, locale, issue: `language leakage: ${forbidden.join(' | ')}` })
          checks.push({ route: route.path, viewport: viewport.width, locale })
        }
      }
    }

    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
    for (const pathName of adminRoutes) {
      await navigate(cdp, pathName)
      const result = await inspect(cdp)
      if (result.header || result.footer || !result.admin) issues.push({ route: pathName, viewport: 390, locale: 'admin', issue: 'admin/public layout separation failed' })
    }

    await setLocaleAndCart(cdp, 'kg', false)
    await navigate(cdp, '/catalog')
    const switchResult = await evaluate(cdp, `(() => {
      document.querySelector('.language-switcher button:nth-child(2)')?.click();
      return new Promise((resolve) => setTimeout(() => resolve({
        lang: document.documentElement.lang,
        chips: Array.from(document.querySelectorAll('.header-category-chip')).slice(0, 8).map((item) => item.textContent.trim()),
        ctaTitle: document.querySelector('.header-materials-cta strong')?.textContent?.trim() || '',
        ctaAction: document.querySelector('.header-materials-cta small')?.textContent?.trim() || ''
      }), 100));
    })()`)
    if (
      switchResult.lang !== 'ru'
      || expectedChips.ru.some((text, index) => switchResult.chips[index] !== text)
      || switchResult.ctaTitle !== expectedCta.ru.title
      || switchResult.ctaAction !== expectedCta.ru.action
    ) {
      issues.push({ route: '/catalog', viewport: 390, locale: 'switch', issue: 'live KG → RU switch did not update chips and CTA' })
    }

    const summary = { baseUrl, checks: checks.length, viewports: selectedViewports.map((item) => item.width), routes: selectedRoutes.length, locales: ['kg', 'ru'], adminRoutes, issues }
    const output = path.join(tempRoot, 'result.json')
    await writeFile(output, JSON.stringify(summary, null, 2), 'utf8')
    console.log(JSON.stringify({ ...summary, resultFile: output }, null, 2))
    cdp.ws.close()
    if (issues.length) process.exitCode = 2
  } finally {
    chrome.kill()
    localServer?.kill()
    await rm(profileDir, { recursive: true, force: true }).catch(() => {})
  }
}

await main()
