import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { products } from '../src/data/products.js'
import { resolveProductSlug } from '../src/services/productService.js'

const baseUrl = process.env.ROUTE_SMOKE_BASE_URL || 'http://127.0.0.1:4173'
const reportDir = path.join(process.cwd(), 'reports', 'visual-audit-smoke')
const screenshotDir = path.join(reportDir, 'screenshots')

const routes = [
  { id: 'home-desktop', path: '/', viewport: '1440x1200' },
  { id: 'home-mobile', path: '/', viewport: '390x844' },
  { id: 'catalog-mobile', path: '/catalog', viewport: '390x844' },
  { id: 'catalog-stroymaterial', path: '/catalog/stroymaterial', viewport: '390x844' },
  { id: 'catalog-engineering', path: '/catalog/inzhenerdik-santehnika', viewport: '390x844' },
  { id: 'catalog-elektrika', path: '/catalog/elektrika', viewport: '390x844' },
  { id: 'product-ppr', path: '/product/ppr-truba-pn20', viewport: '390x844' },
  { id: 'legacy-kabel', path: '/product/kabel-vvgng', viewport: '390x844' },
  { id: 'legacy-gips', path: '/product/gips-shtukaturka', viewport: '390x844' },
  { id: 'legacy-smesitel', path: '/product/smesitel-kuhnya', viewport: '390x844' },
  { id: 'cart-mobile', path: '/cart', viewport: '390x844' },
  { id: 'checkout-mobile', path: '/checkout', viewport: '390x844' },
  { id: 'search-ppr', path: '/search?q=%D0%BF%D0%BF%D1%80', viewport: '390x844' },
]

function productRouteStatus(routePath) {
  if (!routePath.startsWith('/product/')) return { resolvedProductSlug: null, dataOk: true }

  const requestedSlug = decodeURIComponent(routePath.replace('/product/', ''))
  const resolvedProductSlug = resolveProductSlug(requestedSlug)
  const dataOk = products.some((product) => product.slug === resolvedProductSlug)

  return { resolvedProductSlug, dataOk }
}

async function checkRoute(route) {
  let status = 0
  let httpOk = false

  try {
    const response = await fetch(`${baseUrl}${route.path}`)
    status = response.status
    httpOk = response.ok
  } catch {
    // The final result will show the route as failed.
  }

  const screenshotPath = path.join(screenshotDir, `${route.id}.png`)
  const screenshot = existsSync(screenshotPath)
  const productStatus = productRouteStatus(route.path)

  return {
    ...route,
    status,
    httpOk,
    screenshot,
    ...productStatus,
    pass: httpOk && screenshot && productStatus.dataOk,
  }
}

await mkdir(reportDir, { recursive: true })
const results = []

for (const route of routes) {
  results.push(await checkRoute(route))
}

const markdown = [
  '# Visual Smoke Audit',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  ...results.map((result) => {
    const productText = result.resolvedProductSlug ? `, product ${result.resolvedProductSlug}` : ''
    return `- ${result.id} ${result.viewport} ${result.path}: ${result.pass ? 'pass' : 'fail'} (HTTP ${result.status}, screenshot ${result.screenshot ? 'ok' : 'missing'}${productText})`
  }),
  '',
].join('\n')

await writeFile(path.join(reportDir, 'visual-smoke-summary.json'), JSON.stringify(results, null, 2), 'utf8')
await writeFile(path.join(reportDir, 'visual-smoke.md'), markdown, 'utf8')

console.log(JSON.stringify({
  routes: results.length,
  passed: results.filter((result) => result.pass).length,
  failed: results.filter((result) => !result.pass).map((result) => result.id),
  report: 'reports/visual-audit-smoke/visual-smoke.md',
}, null, 2))
