import { siteConfig } from '../config/site.js'
import { getProductGallery } from './imageUtils.js'

const nonProductImageTypes = new Set([
  'fallback',
  'generic',
  'placeholder',
  'planned',
])

function isPrivateIpv4(hostname) {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!match) return false

  const octets = match.slice(1).map(Number)
  if (octets.some((value) => value > 255)) return true

  return (
    octets[0] === 10
    || octets[0] === 127
    || (octets[0] === 169 && octets[1] === 254)
    || (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31)
    || (octets[0] === 192 && octets[1] === 168)
  )
}

export function normalizePublicProductImageUrl(value, siteUrl = siteConfig.siteUrl) {
  const rawValue = String(value || '').trim()
  if (!rawValue || /^(?:blob|data|file|javascript):/i.test(rawValue)) return ''

  try {
    const url = new URL(rawValue, siteUrl)
    const hostname = url.hostname.toLowerCase()
    const isDevelopmentHost =
      hostname === 'localhost'
      || hostname === '0.0.0.0'
      || hostname === '::1'
      || hostname.endsWith('.localhost')
      || hostname.endsWith('.local')
      || hostname.endsWith('.internal')
      || isPrivateIpv4(hostname)
    const isPrivateR2Endpoint = hostname.endsWith('.r2.cloudflarestorage.com')

    if (
      url.protocol !== 'https:'
      || url.username
      || url.password
      || isDevelopmentHost
      || isPrivateR2Endpoint
    ) {
      return ''
    }

    url.hash = ''
    return url.href
  } catch {
    return ''
  }
}

export function isRealProductImage(image, product = {}) {
  if (!image || product.isPlaceholderImage === true || product.imageStatus === 'needs-real-photo') return false

  const src = String(image.src || '').trim()
  const type = String(image.type || '').trim().toLowerCase()
  if (
    !src
    || nonProductImageTypes.has(type)
    || /\/images\/placeholders\//i.test(src)
    || /\/images\/brand\//i.test(src)
    || /\.svg(?:$|[?#])/i.test(src)
  ) {
    return false
  }

  return Boolean(normalizePublicProductImageUrl(src))
}

export function getProductStructuredDataImages(product) {
  if (!product || product.isActive === false) return []

  return getProductGallery(product)
    .filter((image) => isRealProductImage(image, product))
    .map((image) => normalizePublicProductImageUrl(image.src))
    .filter(Boolean)
    .filter((imageUrl, index, imageUrls) => imageUrls.indexOf(imageUrl) === index)
}

export function getPrimaryProductStructuredDataImage(product) {
  return getProductStructuredDataImages(product)[0]
}
