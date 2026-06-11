import { siteConfig } from '../config/site.js'
import { getProductImage } from './imageUtils.js'

const availabilityMap = {
  in_stock: 'https://schema.org/InStock',
  low_stock: 'https://schema.org/LimitedAvailability',
  pre_order: 'https://schema.org/PreOrder',
  out_of_stock: 'https://schema.org/OutOfStock',
}

function cleanText(value, maxLength = 155) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength - 1).trim()}…`
}

function absoluteUrl(path) {
  if (!path) return siteConfig.siteUrl
  if (/^https?:\/\//i.test(path)) return path
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${siteConfig.siteUrl}${normalizedPath}`
}

export function getPageCanonical(path = '/') {
  return absoluteUrl(path)
}

export function getCatalogNodeSeo(node) {
  return {
    title: node?.titleKg || 'Каталог',
    description: cleanText(node?.descriptionKg || node?.seoTextKg || siteConfig.defaultDescription),
    canonical: getPageCanonical(node?.path?.length ? `/catalog/${node.path.join('/')}` : '/catalog'),
  }
}

export function getProductSeo(product) {
  return {
    title: product?.seoTitleKg || product?.titleKg || product?.name || 'Товар',
    description: cleanText(product?.seoDescriptionKg || product?.descriptionKg || product?.shortDescriptionKg || siteConfig.defaultDescription),
    canonical: getPageCanonical(product?.slug ? `/product/${product.slug}` : '/catalog'),
  }
}

export function buildProductStructuredData(product) {
  if (!product?.titleKg || !product?.price || !product?.currency) return null

  const image = getProductImage(product)

  return stripUndefined({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.titleKg,
    description: product.seoDescriptionKg || product.descriptionKg || product.shortDescriptionKg,
    image: image?.src ? absoluteUrl(image.src) : undefined,
    sku: product.sku,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    offers: {
      '@type': 'Offer',
      url: getPageCanonical(`/product/${product.slug}`),
      price: product.price,
      priceCurrency: product.currency || 'KGS',
      availability: availabilityMap[product.stockStatus] || availabilityMap.in_stock,
    },
    aggregateRating:
      product.rating && product.reviewsCount
        ? {
            '@type': 'AggregateRating',
            ratingValue: product.rating,
            reviewCount: product.reviewsCount,
          }
        : undefined,
  })
}

export function buildBreadcrumbStructuredData(items) {
  const itemListElement = items
    .filter((item) => item?.label)
    .map((item, index) =>
      stripUndefined({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: item.to ? getPageCanonical(item.to) : undefined,
      }),
    )

  if (!itemListElement.length) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement,
  }
}

export function combineStructuredData(...items) {
  const graph = items.filter(Boolean)
  if (!graph.length) return null
  if (graph.length === 1) return graph[0]
  return {
    '@context': 'https://schema.org',
    '@graph': graph.map(removeContext),
  }
}

function removeContext(item) {
  const nextItem = { ...item }
  delete nextItem['@context']
  return nextItem
}

function stripUndefined(value) {
  if (Array.isArray(value)) return value.map(stripUndefined)
  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value)
      .filter(([, item]) => item !== undefined && item !== null && item !== '')
      .map(([key, item]) => [key, stripUndefined(item)]),
  )
}
