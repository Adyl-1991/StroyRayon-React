import { siteConfig } from '../config/site.js'

export function absoluteUrl(path) {
  if (!path) return siteConfig.siteUrl
  if (/^https?:\/\//i.test(path)) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${siteConfig.siteUrl}${normalizedPath}`
}

export function getPageCanonical(path = '/') {
  return absoluteUrl(path)
}

export function buildOrganizationStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteConfig.siteUrl}/#organization`,
    name: siteConfig.name,
    alternateName: siteConfig.alternateNames,
    url: siteConfig.siteUrl,
    logo: absoluteUrl('/images/brand/stroyrayon-logo.png'),
    areaServed: {
      '@type': 'Country',
      name: 'Kyrgyzstan',
    },
  }
}
