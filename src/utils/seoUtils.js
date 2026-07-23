import { siteConfig } from '../config/site.js'
import {
  getProductFullDescription,
  getProductSpecs,
  getProductTitle,
  normalizeKgText,
  normalizeProductKgText,
} from '../services/productService.js'
import { getProductGallery } from './imageUtils.js'
import {
  absoluteUrl,
  buildOrganizationStructuredData,
  buildWebPageStructuredData,
  buildWebSiteStructuredData,
  getPageCanonical,
} from './siteSeoUtils.js'

export {
  buildOrganizationStructuredData,
  buildWebPageStructuredData,
  buildWebSiteStructuredData,
  getPageCanonical,
}

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

export function getCatalogNodeSeo(node, locale = 'kg') {
  return {
    title: locale === 'ru'
      ? node?.titleRu || node?.titleKg || 'Каталог'
      : normalizeKgText(node?.titleKg || 'Каталог'),
    description: cleanText(
      locale === 'ru'
        ? node?.descriptionRu || node?.seoTextRu || siteConfig.defaultDescription
        : normalizeKgText(node?.descriptionKg || node?.seoTextKg || siteConfig.defaultDescription),
    ),
    canonical: getPageCanonical(node?.path?.length ? `/catalog/${node.path.join('/')}` : '/catalog'),
  }
}

export function getProductSeo(product, locale = 'kg') {
  return {
    title: locale === 'ru'
      ? product?.seoTitleRu || product?.titleRu || getProductTitle(product, locale) || 'Товар'
      : product?.slug?.startsWith('alinex-')
        ? getProductTitle(product, locale)
        : normalizeKgText(product?.seoTitleKg || product?.titleKg || getProductTitle(product, locale) || 'Товар'),
    description: cleanText(
      locale === 'ru'
        ? product?.seoDescriptionRu || product?.descriptionRu || product?.shortDescriptionRu || siteConfig.defaultDescription
        : normalizeProductKgText(product, product?.seoDescriptionKg || product?.descriptionKg || product?.shortDescriptionKg || siteConfig.defaultDescription),
    ),
    canonical: getPageCanonical(product?.slug ? `/product/${product.slug}` : '/catalog'),
  }
}

export function buildProductStructuredData(product, locale = 'kg') {
  if (!product?.titleKg || !product?.slug) return null

  const productName = getProductTitle(product, locale)
  const productImages = getProductGallery(product)
    .filter((image) => image?.src && image.type !== 'placeholder' && !image.src.includes('/placeholders/'))
    .map((image) => absoluteUrl(image.src))
    .filter((imageUrl, index, imageUrls) => imageUrls.indexOf(imageUrl) === index)
  const price = Number(product.price)
  const currency = product.currency || 'KGS'
  const pricedVariants = (product.variants || [])
    .map((variant) => Number(variant.price))
    .filter((variantPrice) => Number.isFinite(variantPrice) && variantPrice > 0)
  const offers = Number.isFinite(price) && price > 0
    ? {
        '@type': 'Offer',
        url: getPageCanonical(`/product/${product.slug}`),
        price,
        priceCurrency: currency,
        availability: availabilityMap[product.stockStatus] || availabilityMap.in_stock,
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@id': `${siteConfig.siteUrl}/#organization` },
      }
    : pricedVariants.length
      ? {
          '@type': 'AggregateOffer',
          url: getPageCanonical(`/product/${product.slug}`),
          lowPrice: Math.min(...pricedVariants),
          highPrice: Math.max(...pricedVariants),
          offerCount: pricedVariants.length,
          priceCurrency: currency,
          availability: availabilityMap[product.stockStatus] || availabilityMap.in_stock,
          seller: { '@id': `${siteConfig.siteUrl}/#organization` },
        }
      : undefined
  const additionalProperty = Object.entries(getProductSpecs(product, locale))
    .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value) && String(value).trim())
    .slice(0, 12)
    .map(([name, value]) => ({
      '@type': 'PropertyValue',
      name,
      value: String(value),
    }))

  return stripUndefined({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    url: getPageCanonical(`/product/${product.slug}`),
    description: locale === 'ru'
      ? product.seoDescriptionRu || getProductFullDescription(product, locale) || product.shortDescriptionRu
      : normalizeProductKgText(product, product.seoDescriptionKg || getProductFullDescription(product, locale) || product.shortDescriptionKg),
    image: productImages.length ? productImages : undefined,
    sku: product.sku,
    mpn: product.article || undefined,
    category: locale === 'ru'
      ? product.productTypeRu || product.productType || undefined
      : normalizeKgText(product.productTypeKg || product.productType || '') || undefined,
    color: product.color || undefined,
    material: locale === 'ru' ? product.materialRu || undefined : product.materialKg || undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    additionalProperty: additionalProperty.length ? additionalProperty : undefined,
    offers,
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

export function buildFaqStructuredData(items = []) {
  const mainEntity = items
    .filter((item) => item?.question && item?.answer)
    .map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    }))

  if (!mainEntity.length) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity,
  }
}

export function buildCatalogPageStructuredData({ path = '/catalog', title, description, items = [] } = {}) {
  const page = buildWebPageStructuredData({ path, title, description, type: 'CollectionPage' })
  const itemListElement = items
    .filter((item) => item?.name && item?.url)
    .slice(0, 50)
    .map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: getPageCanonical(item.url),
    }))

  return itemListElement.length
    ? {
        ...page,
        mainEntity: {
          '@type': 'ItemList',
          numberOfItems: itemListElement.length,
          itemListElement,
        },
      }
    : page
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
