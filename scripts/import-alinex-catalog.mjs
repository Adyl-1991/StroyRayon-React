import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

const ALINEX_API = 'https://www.alinex.kz/api/categories'
const ALINEX_STORAGE = 'https://alinex.alinagroupproject.kz/storage'
const STROYDOM_API = 'https://stroydom.kg/wp-json/wc/store/v1/products?search=alinex&per_page=100'
const KURULUSH_API = 'https://kurulushtsh.kg/wp-json/wc/store/v1/products'
const OUTPUT_FILE = path.resolve('src/data/alinexProducts.generated.js')
const IMAGE_ROOT = path.resolve('public/images/products')
const DEBUG_PORT = Number(process.env.ALINEX_IMPORT_DEBUG_PORT || 9392)

const requestHeaders = {
  'Accept-Language': 'ru',
  'X-Country-Code': 'kz',
  'Content-Type': 'application/json',
}

const categoryConfig = {
  stukaturki: {
    titleKg: 'Штукатуркалар',
    titleRu: 'Штукатурки',
    pathFor(title) {
      if (/декоратив|munfort|fortress/i.test(title)) return ['stroymaterial', 'kurgak-aralashmalar', 'shtukaturkalar', 'dekorativdik-shtukaturka']
      if (/цемент|forman|uniplaster|sanirplast|termo/i.test(title)) return ['stroymaterial', 'kurgak-aralashmalar', 'shtukaturkalar', 'cementtik-shtukaturka']
      return ['stroymaterial', 'kurgak-aralashmalar', 'shtukaturkalar', 'gipstuu-shtukaturka']
    },
  },
  spatlevki: {
    titleKg: 'Шпаклёвкалар',
    titleRu: 'Шпатлевки',
    path: ['stroymaterial', 'kurgak-aralashmalar', 'shpaklevkalar'],
  },
  'nalivnye-poly': {
    titleKg: 'Өзү тегизделүүчү полдор',
    titleRu: 'Наливные полы',
    path: ['stroymaterial', 'kurgak-aralashmalar', 'nalivnoi-pol'],
  },
  'plitocnye-klei': {
    titleKg: 'Плитка клейлери',
    titleRu: 'Плиточные клеи',
    path: ['stroymaterial', 'kurgak-aralashmalar', 'plitka-kleileri'],
  },
  gidroizoliaciia: {
    titleKg: 'Гидроизоляция',
    titleRu: 'Гидроизоляция',
    path: ['stroymaterial', 'kurgak-aralashmalar', 'gidroizolyaciya'],
  },
  'klei-stukaturka': {
    titleKg: 'Клей-штукатурка',
    titleRu: 'Клей-штукатурка',
    path: ['stroymaterial', 'kurgak-aralashmalar', 'klei-shtukaturka'],
  },
  klei: {
    titleKg: 'Курулуш клейи',
    titleRu: 'Строительный клей',
    path: ['stroymaterial', 'kurgak-aralashmalar', 'klei'],
  },
  'zatirka-dlia-svov': {
    titleKg: 'Тигиштер үчүн затирка',
    titleRu: 'Затирка для швов',
    path: ['stroymaterial', 'kurgak-aralashmalar', 'zatirka'],
  },
  gruntovki: {
    titleKg: 'Грунтовкалар',
    titleRu: 'Грунтовки',
    path: ['stroymaterial', 'kurgak-aralashmalar', 'gruntovkalar'],
  },
}

const exactStroydomMatches = {
  'gipsovaia-stukaturnaia-smes-alinex-grender': 186,
  'spatlevka-alinex-glatt': 193,
  'nalivnoi-pol-alinex-unilevel': 210,
  'plitocnyi-klei-alinex-set-300': 233,
  'plitocnyi-klei-alinex-set-302': 236,
  'plitocnyi-klei-alinex-set-set-301': 250,
  'zatirka-dlia-svov-gipsokartonnyx-listov-gkl-ampquotalinex-jointampquot': 3288,
  'zatirka-dlia-svov-gipsokartonnyx-listov-gkl-quotalinex-jointquot': 3288,
}

const exactKurulushMatches = {
  'zatirka-dlia-svov-alinex-fixline': [9689, 9692, 9694, 9693],
  'gruntovka-alinex-primer': [8646, 8643],
  'gidroizoliacionnaia-smes-alinex-aquaflex': [5924],
  'gidroizoliacionnaia-stukaturka-alinex-aquaplaster': [5926],
  'klei-dlia-gkl-alinex-unifix': [5931],
  'plitocnyi-klei-alinex-set-305': [5920],
  'plitocnyi-klei-alinex-set-308': [5922],
  'spatlevka-polimernaia-alinex-finish': [5910],
}

const consolidatedProductSlugs = new Set([
  'zatirka-dlia-svov-alinex-fixline-2-5kg',
])

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)

function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;quot;|&quot;|&#34;/gi, '"')
    .replace(/&#171;|&laquo;/gi, '«')
    .replace(/&#187;|&raquo;/gi, '»')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizedTitle(value) {
  return decodeHtml(value)
    .toLocaleLowerCase('ru')
    .replace(/[«»"'.,:;()–—-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function localSlug(sourceSlug) {
  if (sourceSlug.startsWith('dobavka-dlia-2-x-komponentnoi')) return 'alinex-dobavka-dlya-gidroizolyacii'

  return `alinex-${sourceSlug}`
    .replace(/ampquot|quot/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/-$/, '')
}

function specsFromProduct(product) {
  const entries = (product.technical_data || [])
    .filter((item) => item?.name && item?.text)
    .map((item) => [decodeHtml(item.name), decodeHtml(item.text)])

  if (Array.isArray(product.compound) && product.compound.length) {
    entries.push(['Состав', product.compound.map(decodeHtml).join(', ')])
  }

  return Object.fromEntries(entries)
}

function inferPackage(product, title, categorySlug) {
  const technicalText = (product.technical_data || []).map((item) => `${item.name} ${item.text}`).join(' ')
  const weightMatch = `${title} ${technicalText}`.match(/(?:на\s+)?(\d+(?:[.,]\d+)?)\s*кг\b/i)
  const liquid = categorySlug === 'gruntovki' || /добавка/i.test(title)

  if (weightMatch) {
    const weight = `${weightMatch[1].replace('.', ',')} кг`
    return { unit: liquid ? 'даана' : 'кап', packageInfo: weight, weight }
  }

  return { unit: liquid ? 'даана' : 'кап', packageInfo: liquid ? '1 упаковка' : '1 кап', weight: '' }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options)
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`)
  return response.json()
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length)
  let index = 0

  async function worker() {
    while (index < items.length) {
      const currentIndex = index
      index += 1
      results[currentIndex] = await mapper(items[currentIndex], currentIndex)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

async function getCatalogEntries() {
  const entries = []

  for (const categorySlug of Object.keys(categoryConfig)) {
    const url = `${ALINEX_API}/products?page=1&category=${encodeURIComponent(categorySlug)}`
    const page = await fetchJson(url, { headers: requestHeaders })
    for (const product of page.data || []) entries.push({ ...product, sourceCategorySlug: categorySlug })
  }

  const unique = new Map()
  for (const entry of entries) {
    if (consolidatedProductSlugs.has(entry.slug)) continue
    const key = normalizedTitle(entry.title)
    if (!unique.has(key)) unique.set(key, entry)
  }

  return [...unique.values()]
}

async function getProductDetails(entries) {
  return mapLimit(entries, 5, async (entry) => {
    const payload = await fetchJson(`${ALINEX_API}/products/${entry.slug}`, { headers: requestHeaders })
    return { ...entry, detail: payload.product || entry }
  })
}

async function findChrome() {
  for (const candidate of chromeCandidates) {
    try {
      const proc = spawn(candidate, ['--version'], { stdio: 'ignore', windowsHide: true })
      const code = await new Promise((resolve) => proc.on('exit', resolve))
      if (code === 0) return candidate
    } catch {
      // Try the next installed location.
    }
  }

  return ''
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function getDebugJson(url, attempts = 60) {
  let lastError
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url)
      if (response.ok) return response.json()
      lastError = new Error(`Chrome debug endpoint returned ${response.status}`)
    } catch (error) {
      lastError = error
    }
    await wait(250)
  }
  throw lastError
}

async function createChromeRuntime() {
  const chromePath = await findChrome()
  if (!chromePath) return null

  const profileDir = await mkdtemp(path.join(os.tmpdir(), 'alinex-image-import-'))
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--ignore-certificate-errors',
    '--allow-file-access-from-files',
    '--no-first-run',
    '--no-default-browser-check',
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${profileDir}`,
    'about:blank',
  ], { stdio: 'ignore', windowsHide: true })

  const tabs = await getDebugJson(`http://127.0.0.1:${DEBUG_PORT}/json`)
  const page = tabs.find((tab) => tab.webSocketDebuggerUrl) || tabs[0]
  if (!page?.webSocketDebuggerUrl) throw new Error('Chrome DevTools endpoint was not available.')

  const socket = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })

  let id = 0
  const pending = new Map()
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    if (!message.id || !pending.has(message.id)) return
    const handlers = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) handlers.reject(new Error(message.error.message))
    else handlers.resolve(message.result)
  })

  function send(method, params = {}) {
    id += 1
    const currentId = id
    socket.send(JSON.stringify({ id: currentId, method, params }))
    return new Promise((resolve, reject) => pending.set(currentId, { resolve, reject }))
  }

  return {
    send,
    close: async () => {
      try {
        await send('Browser.close')
      } catch {
        chrome.kill()
      }
      socket.close()
    },
  }
}

async function convertWithChrome(runtime, pageUrl) {
  await runtime.send('Page.enable')
  await runtime.send('Emulation.setDeviceMetricsOverride', {
    width: 900,
    height: 675,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await runtime.send('Page.navigate', { url: pageUrl })
  await wait(500)
  const loadResult = await runtime.send('Runtime.evaluate', {
    expression: `new Promise((resolve, reject) => {
      const timer = setTimeout(() => { clearInterval(poller); reject(new Error('Image load timeout')); }, 30000);
      const poller = setInterval(() => {
        const image = document.images[0];
        if (!image) return;
        clearInterval(poller);
        if (image.complete && image.naturalWidth) { clearTimeout(timer); resolve(true); return; }
        image.addEventListener('load', () => { clearTimeout(timer); resolve(true); }, { once: true });
        image.addEventListener('error', () => { clearTimeout(timer); reject(new Error('Image load failed')); }, { once: true });
      }, 50);
    })`,
    awaitPromise: true,
    returnByValue: true,
  })
  if (loadResult?.exceptionDetails) throw new Error(`Chrome could not load ${pageUrl}`)
  const screenshot = await runtime.send('Page.captureScreenshot', {
    format: 'webp',
    quality: 86,
    fromSurface: true,
    captureBeyondViewport: false,
  })
  if (!screenshot?.data) throw new Error('Chrome did not return a WebP screenshot.')
  return Buffer.from(screenshot.data, 'base64')
}

async function importImages(entries) {
  const runtime = process.env.ALINEX_USE_CHROME === '1' ? await createChromeRuntime() : null
  const temporaryImageRoot = runtime ? await mkdtemp(path.join(os.tmpdir(), 'alinex-source-images-')) : ''
  const imagePaths = new Map()

  try {
    for (const [index, entry] of entries.entries()) {
      const slug = localSlug(entry.slug)
      const directory = path.join(IMAGE_ROOT, slug)
      await mkdir(directory, { recursive: true })
      const sourceUrl = `${ALINEX_STORAGE}/${entry.detail.image || entry.image}`
      const response = await fetch(sourceUrl)
      if (!response.ok) throw new Error(`Image download failed (${response.status}): ${entry.slug}`)
      const sourceBuffer = Buffer.from(await response.arrayBuffer())

      if (runtime) {
        try {
          const sourceFile = path.join(temporaryImageRoot, `${index}.png`)
          const htmlFile = path.join(temporaryImageRoot, `${index}.html`)
          await writeFile(sourceFile, sourceBuffer)
          await writeFile(
            htmlFile,
            `<!doctype html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{width:900px;height:675px;margin:0;overflow:hidden;background:#fff}body{display:grid;place-items:center;padding:30px}img{display:block;max-width:840px;max-height:615px;object-fit:contain}</style></head><body><img src="${pathToFileURL(sourceFile).href}" alt=""></body></html>`,
            'utf8',
          )
          const webpBuffer = await convertWithChrome(runtime, pathToFileURL(htmlFile).href)
          await writeFile(path.join(directory, 'main.webp'), webpBuffer)
          imagePaths.set(entry.slug, `/images/products/${slug}/main.webp`)
          continue
        } catch (error) {
          console.warn(`WebP conversion failed for ${entry.slug}: ${error.message}`)
        }
      }

      await writeFile(path.join(directory, 'main.png'), sourceBuffer)
      imagePaths.set(entry.slug, `/images/products/${slug}/main.png`)
    }
  } finally {
    await runtime?.close()
  }

  return imagePaths
}

function makeProduct(entry, stroydomById, imagePath) {
  const detail = entry.detail
  const titleRu = decodeHtml(detail.title || entry.title)
  const category = categoryConfig[entry.sourceCategorySlug]
  const catalogPath = category.pathFor ? category.pathFor(titleRu) : category.path
  const stroydomMatch = stroydomById.get(exactStroydomMatches[entry.slug])
  const kurulushMatches = (exactKurulushMatches[entry.slug] || []).map((id) => stroydomById.get(`kurulush-${id}`)).filter(Boolean)
  const priceMatch = stroydomMatch || kurulushMatches[0]
  const packageData = inferPackage(detail, titleRu, entry.sourceCategorySlug)
  const unit = packageData.unit
  const minOrderKg = unit === 'кап' ? '1 кап' : '1 даана'
  const minOrderRu = unit === 'кап' ? '1 мешок' : '1 шт.'
  const sourceUrl = `https://www.alinex.kz/catalog/${entry.slug}`
  const shortKg = `${titleRu} — AlinEX брендинин «${category.titleKg}» категориясындагы профессионалдык курулуш материалы.`
  const shortRu = `${titleRu} — профессиональный строительный материал AlinEX из категории «${category.titleRu}».`
  const specs = specsFromProduct(detail)

  const variants = kurulushMatches.length > 1
    ? kurulushMatches.map((match) => {
        const sizeMatch = decodeHtml(match.name).match(/(\d+(?:[.,]\d+)?)\s*кг(?:\s+(.+))?$/i)
        const size = sizeMatch ? `${sizeMatch[1]} кг${sizeMatch[2] ? `, ${sizeMatch[2]}` : ''}` : decodeHtml(match.name)
        return {
          id: `${localSlug(entry.slug)}-${match.id}`,
          size,
          titleKg: size,
          titleRu: size,
          price: Number(match.prices.price),
          unit,
          unitRu: unit === 'кап' ? 'мешок' : 'шт.',
          packageInfo: size,
          packageInfoRu: size,
          stockStatus: 'pre_order',
          sku: match.sku || `ALX-${match.id}`,
          priceSource: 'kurulushtsh.kg',
          priceSourceUrl: match.permalink,
        }
      })
    : []

  return {
    id: `alinex-${detail.id || entry.slug}`,
    slug: localSlug(entry.slug),
    sku: `ALX-${String(detail.id || entry.slug).toUpperCase()}`,
    titleKg: titleRu,
    titleRu,
    name: titleRu,
    catalogPath,
    categoryId: 'cement',
    categorySlug: 'cement',
    subcategoryId: catalogPath.at(-1),
    subcategorySlug: 'dry-mixes',
    brand: 'AlinEX',
    productType: category.titleKg,
    productTypeRu: category.titleRu,
    price: priceMatch ? Number(priceMatch.prices.price) : 0,
    currency: 'KGS',
    unit,
    unitRu: unit === 'кап' ? 'мешок' : 'шт.',
    stockStatus: 'pre_order',
    minOrder: minOrderKg,
    minOrderRu,
    pack: packageData.packageInfo,
    packRu: packageData.packageInfo,
    packageInfoKg: packageData.packageInfo,
    packageInfoRu: packageData.packageInfo,
    weight: packageData.weight,
    shortDescriptionKg: shortKg,
    shortDescriptionRu: shortRu,
    fullDescriptionKg: `${shortKg} Колдонуу шарттарын, негизди даярдоону жана материалдын чыгымын техникалык мүнөздөмөлөрдөн тактаңыз.`,
    fullDescriptionRu: `${shortRu} Условия применения, подготовку основания и расход материала уточняйте по техническим характеристикам производителя.`,
    descriptionKg: shortKg,
    descriptionRu: shortRu,
    specs,
    specsRu: specs,
    specificationsKg: specs,
    specificationsRu: specs,
    images: [{
      src: imagePath,
      alt: `${titleRu} — фото упаковки AlinEX`,
      width: 900,
      height: 675,
      type: 'product',
      fallbackSrc: '/images/placeholders/product-building-placeholder.svg',
    }],
    tags: ['new', 'quality'],
    badges: ['new', 'quality'],
    aliases: [titleRu, entry.slug, category.titleRu, 'AlinEX'],
    rating: 0,
    reviewsCount: 0,
    isActive: true,
    faqKg: [
      { question: 'Баасы жана бар-жогу кантип такталат?', answer: 'WhatsApp аркылуу менеджерге жазыңыз. Так фасовка, партия жана жеткирүү мөөнөтү текшерилет.' },
    ],
    faqRu: [
      { question: 'Как уточнить цену и наличие?', answer: 'Напишите менеджеру в WhatsApp. Он проверит точную фасовку, партию и срок поставки.' },
    ],
    relatedProductIds: [],
    variants,
    sourceUrl,
    sourceImageUrl: `${ALINEX_STORAGE}/${detail.image || entry.image}`,
    priceSource: stroydomMatch ? 'stroydom.kg' : priceMatch ? 'kurulushtsh.kg' : 'on_request',
    priceSourceUrl: priceMatch?.permalink || '',
  }
}

async function main() {
  const [catalogEntries, stroydomProducts, kurulushAlinexProducts, kurulushFinishProducts] = await Promise.all([
    getCatalogEntries(),
    fetchJson(STROYDOM_API),
    fetchJson(`${KURULUSH_API}?search=alinex&per_page=100`),
    fetchJson(`${KURULUSH_API}?search=finish&per_page=100`),
  ])
  const detailedEntries = await getProductDetails(catalogEntries)
  const imagePaths = await importImages(detailedEntries)
  const stroydomById = new Map(stroydomProducts.map((product) => [product.id, product]))
  for (const product of [...kurulushAlinexProducts, ...kurulushFinishProducts]) {
    stroydomById.set(`kurulush-${product.id}`, product)
  }
  const products = detailedEntries
    .map((entry) => makeProduct(entry, stroydomById, imagePaths.get(entry.slug)))
    .sort((left, right) => left.productTypeRu.localeCompare(right.productTypeRu, 'ru') || left.titleRu.localeCompare(right.titleRu, 'ru'))

  const generatedAt = new Date().toISOString()
  const exactPriceCount = products.filter((product) => product.priceSource !== 'on_request').length
  const source = `// Generated by scripts/import-alinex-catalog.mjs\n// Product source: https://www.alinex.kz/catalog\n// Price priority: https://stroydom.kg/, https://kurulushtsh.kg/, https://www.stroymag-bishkek.com/, https://shop.molotok.kg/\n// Generated at: ${generatedAt}\n\nexport const alinexProducts = ${JSON.stringify(products, null, 2)}\n\nexport const alinexCatalogImportMeta = ${JSON.stringify({ generatedAt, productCount: products.length, exactPriceCount }, null, 2)}\n`

  await writeFile(OUTPUT_FILE, source, 'utf8')
  console.log(`Imported ${products.length} unique AlinEX products.`)
  console.log(`Exact retailer price matches: ${exactPriceCount}.`)
  console.log(`Generated data: ${OUTPUT_FILE}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
