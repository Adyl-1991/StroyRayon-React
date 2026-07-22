import { siteConfig } from '../config/site.js'

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function formatSeoTitle(title, brand = siteConfig.name) {
  const normalizedTitle = String(title || brand).replace(/\s+/g, ' ').trim()
  if (!normalizedTitle || normalizedTitle.toLocaleLowerCase() === brand.toLocaleLowerCase()) return brand

  const brandSuffix = new RegExp(`(?:[-|–—:]\\s*)${escapeRegExp(brand)}\\s*$`, 'iu')
  return brandSuffix.test(normalizedTitle) ? normalizedTitle : `${normalizedTitle} | ${brand}`
}

export function getCanonicalUrl(canonical, location) {
  if (canonical) {
    try {
      const url = new URL(canonical, siteConfig.siteUrl)
      return `${siteConfig.siteUrl}${url.pathname === '/' ? '/' : url.pathname.replace(/\/+$/, '')}`
    } catch {
      // Fall through to the current route on malformed input.
    }
  }

  const pathname = location?.pathname || '/'
  return `${siteConfig.siteUrl}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`
}

export function getRobotsContent(noIndex = false) {
  return noIndex
    ? 'noindex, nofollow, noarchive'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
}
