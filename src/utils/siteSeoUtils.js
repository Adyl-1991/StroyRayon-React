import { siteConfig } from '../config/site.js'
import { contactConfig } from '../config/contact.js'

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
    logo: absoluteUrl(siteConfig.defaultOgImage),
    telephone: contactConfig.phone,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: contactConfig.phone,
      contactType: 'customer service',
      availableLanguage: ['ky', 'ru'],
      areaServed: 'KG',
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Бишкек',
      addressCountry: 'KG',
    },
    areaServed: {
      '@type': 'Country',
      name: 'Kyrgyzstan',
    },
  }
}

export function buildWebSiteStructuredData() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${siteConfig.siteUrl}/#website`,
    name: siteConfig.name,
    alternateName: siteConfig.alternateNames,
    url: siteConfig.siteUrl,
    publisher: { '@id': `${siteConfig.siteUrl}/#organization` },
    inLanguage: ['ky', 'ru'],
  }
}

export function buildWebPageStructuredData({ path = '/', title, description, type = 'WebPage' } = {}) {
  return {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${getPageCanonical(path)}#webpage`,
    url: getPageCanonical(path),
    name: title,
    description,
    isPartOf: { '@id': `${siteConfig.siteUrl}/#website` },
    about: { '@id': `${siteConfig.siteUrl}/#organization` },
    inLanguage: 'ky',
  }
}
