import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { retiredProductSlugs } from '../src/data/retiredProductSlugs.js'
import { normalizePublicProductImageUrl } from '../src/utils/productImageSeo.js'

const DEFAULT_BASE_URL = 'https://www.stroyrayon.kg'
const DEFAULT_API_BASE_URL = 'https://api.stroyrayon.kg/api'
const CONFIRMED_PRODUCT_PATH = '/product/start-shpaklevka-20kg'
const DEFAULT_CONCURRENCY = 8

function getAttribute(tag, name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return (
    tag.match(new RegExp(`\\b${escapedName}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1]
    || tag.match(new RegExp(`\\b${escapedName}\\s*=\\s*([^\\s>]+)`, 'i'))?.[1]
    || ''
  )
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim()
}

function getMeta(html, key) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if (getAttribute(tag, 'property') === key || getAttribute(tag, 'name') === key) {
      return getAttribute(tag, 'content')
    }
  }
  return ''
}

function getCanonical(html) {
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    if (getAttribute(tag, 'rel').split(/\s+/).includes('canonical')) {
      return getAttribute(tag, 'href')
    }
  }
  return ''
}

function flattenStructuredData(value) {
  if (Array.isArray(value)) return value.flatMap(flattenStructuredData)
  if (value && typeof value === 'object' && Array.isArray(value['@graph'])) {
    return value['@graph'].flatMap(flattenStructuredData)
  }
  return [value]
}

function parseStructuredData(html) {
  const values = []
  const errors = []

  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      values.push(JSON.parse(match[1]))
    } catch (error) {
      errors.push(error.message)
    }
  }

  return {
    values,
    errors,
    productSchemas: values.flatMap(flattenStructuredData).filter((item) => item?.['@type'] === 'Product'),
  }
}

function normalizeSchemaImages(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return [value]
  return value === undefined || value === null ? [] : [value]
}

function getProductPath(url) {
  return new URL(url).pathname.replace(/\/+$/, '')
}

function getProductSlug(url) {
  return getProductPath(url).split('/').filter(Boolean).at(-1) || ''
}

function getVisiblePrimaryImage(html, baseUrl) {
  const prerenderBody = html.match(/<main\b[^>]*data-seo-prerender=["']true["'][^>]*>([\s\S]*?)<\/main>/i)?.[1] || ''
  for (const tag of prerenderBody.match(/<img\b[^>]*>/gi) || []) {
    const src = getAttribute(tag, 'src')
    if (!src || /\/images\/placeholders\//i.test(src) || /\.svg(?:$|[?#])/i.test(src)) continue
    return new URL(src, baseUrl).href
  }
  return ''
}

async function mapLimit(items, concurrency, mapper) {
  const results = new Array(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

async function fetchText(url, timeoutMs = 20_000) {
  const response = await fetch(url, {
    redirect: 'manual',
    headers: {
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'user-agent': 'StroyRayon-Structured-Data-QA/1.0',
    },
    signal: AbortSignal.timeout(timeoutMs),
  })
  return { response, text: await response.text() }
}

async function loadR2ProductImages(apiBaseUrl, timeoutMs) {
  const result = new Map()
  let totalPages = 1

  for (let page = 1; page <= totalPages; page += 1) {
    const { response, text } = await fetchText(`${apiBaseUrl}/products?page=${page}&limit=100`, timeoutMs)
    if (response.status !== 200) throw new Error(`Product API returned HTTP ${response.status}`)

    const payload = JSON.parse(text)
    totalPages = Math.max(1, Number(payload.totalPages || 1))
    for (const product of payload.items || []) {
      const images = (product.images || [])
        .filter((image) => image?.storageDriver === 's3')
        .map((image) => normalizePublicProductImageUrl(image.src))
        .filter(Boolean)
      if (product?.slug && images.length) result.set(product.slug, [...new Set(images)])
    }
  }

  return result
}

async function checkImage(url, timeoutMs) {
  const normalizedUrl = normalizePublicProductImageUrl(url)
  if (!normalizedUrl) {
    return { url, valid: false, status: 0, contentType: '', redirect: '', issue: 'invalid, non-HTTPS, private or development image URL' }
  }

  try {
    const response = await fetch(normalizedUrl, {
      redirect: 'manual',
      headers: {
        accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
        'user-agent': 'StroyRayon-Structured-Data-QA/1.0',
      },
      signal: AbortSignal.timeout(timeoutMs),
    })
    const contentType = response.headers.get('content-type') || ''
    const redirect = response.headers.get('location') || ''
    await response.body?.cancel()
    const issue = redirect
      ? `image redirects to ${redirect}`
      : response.status !== 200
        ? `image returned HTTP ${response.status}`
        : !contentType.toLowerCase().startsWith('image/')
          ? `invalid image content type: ${contentType || 'missing'}`
          : ''

    return {
      url: normalizedUrl,
      valid: !issue,
      status: response.status,
      contentType,
      redirect,
      issue,
    }
  } catch (error) {
    return { url: normalizedUrl, valid: false, status: 0, contentType: '', redirect: '', issue: error.message }
  }
}

export async function runStructuredDataQa({
  baseUrl = process.env.SEO_BASE_URL || DEFAULT_BASE_URL,
  canonicalOrigin = process.env.SEO_CANONICAL_ORIGIN || DEFAULT_BASE_URL,
  fetchTrailingSlash = process.env.SEO_FETCH_TRAILING_SLASH === '1',
  verifyRetiredHttp = process.env.SEO_VERIFY_RETIRED_HTTP
    ? process.env.SEO_VERIFY_RETIRED_HTTP === '1'
    : new URL(baseUrl).origin === new URL(canonicalOrigin).origin,
  apiBaseUrl = process.env.STRUCTURED_DATA_API_BASE_URL || DEFAULT_API_BASE_URL,
  concurrency = Number(process.env.STRUCTURED_DATA_CONCURRENCY || DEFAULT_CONCURRENCY),
  timeoutMs = Number(process.env.STRUCTURED_DATA_TIMEOUT_MS || 20_000),
  reportPath = process.env.STRUCTURED_DATA_REPORT_PATH || '',
  log = true,
} = {}) {
  const startedAt = Date.now()
  const baseOrigin = new URL(baseUrl).origin
  const canonicalBaseOrigin = new URL(canonicalOrigin).origin
  const apiOrigin = new URL(apiBaseUrl).origin
  const sitemap = await fetchText(`${baseOrigin}/sitemap.xml`, timeoutMs)
  if (sitemap.response.status !== 200) throw new Error(`Sitemap returned HTTP ${sitemap.response.status}`)

  const productUrls = [...sitemap.text.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/gi)]
    .map((match) => match[1].trim())
    .map((url) => {
      const pathname = new URL(url).pathname.replace(/\/+$/, '')
      return new URL(fetchTrailingSlash ? `${pathname}/` : pathname, baseOrigin).href
    })
    .filter((url) => getProductPath(url).startsWith('/product/'))
  const sitemapProductPaths = new Set(productUrls.map(getProductPath))
  const r2ImagesBySlug = await loadR2ProductImages(`${apiOrigin}/api`, timeoutMs)

  const pages = await mapLimit(productUrls, concurrency, async (url) => {
    const issues = []
    const warnings = []
    let response
    let html = ''

    try {
      const result = await fetchText(url, timeoutMs)
      response = result.response
      html = result.text
    } catch (error) {
      return {
        url,
        slug: getProductSlug(url),
        status: 0,
        canonical: '',
        name: '',
        images: [],
        ogImage: '',
        twitterImage: '',
        visiblePrimaryImage: '',
        productSchemaCount: 0,
        issues: [error.message],
        warnings,
      }
    }

    const parsed = parseStructuredData(html)
    const schema = parsed.productSchemas[0]
    const images = normalizeSchemaImages(schema?.image)
    const slug = getProductSlug(url)
    const expectedR2Images = r2ImagesBySlug.get(slug) || []
    const canonical = getCanonical(html)
    const expectedCanonical = new URL(getProductPath(url), canonicalBaseOrigin).href
    const ogImage = getMeta(html, 'og:image')
    const twitterImage = getMeta(html, 'twitter:image')
    const visiblePrimaryImage = getVisiblePrimaryImage(html, baseOrigin)

    if (response.status !== 200) issues.push(`page returned HTTP ${response.status}`)
    if (response.headers.get('location')) issues.push(`page redirects to ${response.headers.get('location')}`)
    if (parsed.errors.length) issues.push(`invalid JSON-LD: ${parsed.errors.join('; ')}`)
    if (parsed.productSchemas.length !== 1) issues.push(`Product schema count ${parsed.productSchemas.length}`)
    if (!schema?.name || !String(schema.name).trim()) issues.push('missing Product name')
    if (canonical !== expectedCanonical) {
      issues.push(`canonical mismatch: expected ${expectedCanonical}, received ${canonical || 'missing'}`)
    }
    if (JSON.stringify(schema || {}).match(/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|r2\.cloudflarestorage\.com)/i)) {
      issues.push('Product schema contains a development or private URL')
    }

    for (const image of images) {
      if (typeof image !== 'string' || !image.trim()) issues.push('empty or non-string Product image value')
      else if (!normalizePublicProductImageUrl(image)) issues.push(`invalid Product image URL: ${image}`)
    }
    if (new Set(images).size !== images.length) issues.push('duplicate Product image URLs')

    if (!images.length) {
      if (getProductPath(url) === CONFIRMED_PRODUCT_PATH) {
        issues.push('confirmed Merchant listing URL is missing Product image')
      } else if (expectedR2Images.length) {
        issues.push(`Product image missing despite ${expectedR2Images.length} public R2 image(s)`)
      } else {
        warnings.push('product has no verified real image; Product image is intentionally omitted')
      }
    } else {
      if (ogImage !== images[0]) issues.push(`og:image does not match primary Product image: ${ogImage || 'missing'}`)
      if (twitterImage !== images[0]) {
        issues.push(`twitter:image does not match primary Product image: ${twitterImage || 'missing'}`)
      }
      if (!visiblePrimaryImage) {
        issues.push('visible primary product image is missing from prerendered HTML')
      } else if (visiblePrimaryImage !== images[0]) {
        issues.push(`visible primary image does not match Product image: ${visiblePrimaryImage}`)
      }
      if (expectedR2Images.length && images[0] !== expectedR2Images[0]) {
        issues.push(`Product image does not match API primary R2 image: ${expectedR2Images[0]}`)
      }
    }

    if (!ogImage) issues.push('missing og:image')
    else if (!normalizePublicProductImageUrl(ogImage)) issues.push(`invalid og:image URL: ${ogImage}`)
    if (!twitterImage) issues.push('missing twitter:image')
    else if (!normalizePublicProductImageUrl(twitterImage)) issues.push(`invalid twitter:image URL: ${twitterImage}`)

    return {
      url,
      slug,
      status: response.status,
      canonical,
      name: schema?.name || '',
      images,
      expectedR2Images,
      ogImage,
      twitterImage,
      visiblePrimaryImage,
      productSchemaCount: parsed.productSchemas.length,
      issues,
      warnings,
    }
  })

  const imageUrls = [
    ...new Set(pages.flatMap((page) => [...page.images, page.ogImage, page.twitterImage]).filter(Boolean)),
  ]
  const imageChecks = await mapLimit(imageUrls, concurrency, (url) => checkImage(url, timeoutMs))
  const imageCheckByUrl = new Map(imageChecks.map((check) => [check.url, check]))

  for (const page of pages) {
    for (const url of [...page.images, page.ogImage, page.twitterImage].filter(Boolean)) {
      const normalizedUrl = normalizePublicProductImageUrl(url)
      const check = imageCheckByUrl.get(normalizedUrl)
      if (check && !check.valid) page.issues.push(`${url}: ${check.issue}`)
    }
  }

  const retiredPages = await mapLimit(retiredProductSlugs, concurrency, async (slug) => {
    const productPath = `/product/${slug}`
    const url = new URL(productPath, baseOrigin).href
    const issues = []
    let status = null
    let productSchemaCount = null

    if (sitemapProductPaths.has(productPath)) {
      issues.push('retired product URL is still present in sitemap')
    }

    if (verifyRetiredHttp) {
      try {
        const result = await fetchText(url, timeoutMs)
        status = result.response.status
        productSchemaCount = parseStructuredData(result.text).productSchemas.length
        if (status !== 404) issues.push(`retired product URL returned HTTP ${status}; expected 404`)
        if (productSchemaCount) {
          issues.push(`retired product URL still contains ${productSchemaCount} Product schema object(s)`)
        }
      } catch (error) {
        issues.push(`retired product URL check failed: ${error.message}`)
      }
    }

    return {
      url,
      slug,
      status,
      productSchemaCount,
      issues,
      warnings: [],
      retired: true,
    }
  })

  const failedProductPages = pages.filter((page) => page.issues.length)
  const failedRetiredPages = retiredPages.filter((page) => page.issues.length)
  const failedPages = [...failedProductPages, ...failedRetiredPages]
  const warningPages = pages.filter((page) => page.warnings.length)
  const missingImagePages = pages.filter((page) => !page.images.length)
  const brokenImageUrls = imageChecks.filter((check) => !check.valid)
  const confirmedPage = retiredPages.find((page) => getProductPath(page.url) === CONFIRMED_PRODUCT_PATH)
  const passedProductPages = pages.length - failedProductPages.length
  const passedRetiredPages = retiredPages.length - failedRetiredPages.length
  const summary = {
    generatedAt: new Date().toISOString(),
    durationSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
    baseUrl: baseOrigin,
    apiBaseUrl: apiOrigin,
    productPagesAudited: pages.length,
    retiredUrlsChecked: retiredPages.length,
    retiredHttpVerificationEnabled: verifyRetiredHttp,
    totalUrlsChecked: pages.length + retiredPages.length,
    passedPages: passedProductPages + passedRetiredPages,
    failedPages: failedPages.length,
    warningPages: warningPages.length,
    validProductJsonLdPages: pages.filter((page) => page.productSchemaCount === 1 && page.name && !page.issues.length).length,
    missingProductJsonLdPages: pages.filter((page) => page.productSchemaCount === 0).length,
    pagesMissingValidImages: missingImagePages.length,
    brokenImageUrls: brokenImageUrls.length,
    redirectedImageUrls: imageChecks.filter((check) => check.redirect).length,
    productsUsingPlaceholdersOrNoRealImage: missingImagePages.length,
    duplicateProductSchemaPages: pages.filter((page) => page.productSchemaCount > 1).length,
    inconsistentStructuredDataPages: pages.filter((page) =>
      page.issues.some((issue) => /does not match|duplicate|development|private/i.test(issue)),
    ).length,
    publicR2ProductsFromApi: r2ImagesBySlug.size,
    confirmedUrlPassed: Boolean(
      confirmedPage
      && !confirmedPage.issues.length
      && (!verifyRetiredHttp || confirmedPage.status === 404),
    ),
  }
  const report = {
    summary,
    confirmedPage,
    retiredPages,
    failedPages,
    warningPages,
    brokenImageUrls,
    imageChecks,
    pages,
  }

  if (reportPath) {
    const absoluteReportPath = path.resolve(reportPath)
    await mkdir(path.dirname(absoluteReportPath), { recursive: true })
    await writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
  }

  if (log) {
    console.log('StroyRayon structured-data QA')
    console.log(JSON.stringify(summary, null, 2))
    failedPages.forEach((page) => {
      console.error(`\n${page.url}`)
      page.issues.forEach((issue) => console.error(`- ${issue}`))
    })
    if (warningPages.length) console.warn(`Products without verified real images: ${warningPages.length}`)
    if (reportPath) console.log(`Detailed report: ${path.resolve(reportPath)}`)
  }

  return report
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])
if (isMain) {
  runStructuredDataQa()
    .then((report) => {
      if (report.summary.failedPages) process.exitCode = 1
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}
