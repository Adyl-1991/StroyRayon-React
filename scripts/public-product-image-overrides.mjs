import { isRetiredProductSlug } from '../src/data/retiredProductSlugs.js'
import { normalizePublicProductImageUrl } from '../src/utils/productImageSeo.js'

const DEFAULT_PRODUCT_API_BASE_URL = 'https://api.stroyrayon.kg/api'
const PAGE_SIZE = 100
const MAX_PAGES = 20

function normalizeApiBaseUrl(value) {
  const url = new URL(String(value || DEFAULT_PRODUCT_API_BASE_URL))
  if (url.protocol !== 'https:') throw new Error('Public product API must use HTTPS')
  url.pathname = url.pathname.replace(/\/+$/, '')
  return url.href.replace(/\/+$/, '')
}

function getPublicR2Images(product) {
  return (product?.images || [])
    .filter((image) => image?.storageDriver === 's3')
    .map((image) => ({
      ...image,
      src: normalizePublicProductImageUrl(image.src),
    }))
    .filter((image) => image.src)
    .filter((image, index, images) => images.findIndex((item) => item.src === image.src) === index)
}

export async function fetchPublicProductImageOverrides({
  enabled = process.env.SEO_SYNC_PUBLIC_IMAGES === '1' || process.env.VERCEL === '1',
  apiBaseUrl = process.env.SEO_PRODUCT_API_BASE_URL || DEFAULT_PRODUCT_API_BASE_URL,
  log = true,
} = {}) {
  if (!enabled) return new Map()

  const normalizedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl)
  const overrides = new Map()
  let totalPages = 1

  try {
    for (let page = 1; page <= Math.min(totalPages, MAX_PAGES); page += 1) {
      const response = await fetch(`${normalizedApiBaseUrl}/products?page=${page}&limit=${PAGE_SIZE}`, {
        headers: {
          accept: 'application/json',
          'user-agent': 'StroyRayon-SEO-Prerender/1.0',
        },
        signal: AbortSignal.timeout(20_000),
      })
      if (!response.ok) throw new Error(`public product API returned HTTP ${response.status}`)

      const payload = await response.json()
      totalPages = Math.max(1, Number(payload.totalPages || 1))

      for (const product of payload.items || []) {
        const images = getPublicR2Images(product)
        if (
          product?.isActive !== false
          && product?.slug
          && !isRetiredProductSlug(product.slug)
          && images.length
        ) {
          overrides.set(product.slug, images)
        }
      }
    }
  } catch (error) {
    if (log) {
      console.warn(`Public R2 image sync skipped: ${error.message}`)
    }
    return new Map()
  }

  if (log) {
    console.log(`Loaded public R2 image overrides for ${overrides.size} products.`)
  }
  return overrides
}

export function mergePublicProductImageOverride(product, overrides = new Map()) {
  const images = overrides.get(product?.slug)
  if (!images?.length) return product

  return {
    ...product,
    imageStatus: 'ready',
    isPlaceholderImage: false,
    images,
  }
}
