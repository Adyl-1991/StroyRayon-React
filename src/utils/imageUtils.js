import { getRootCategoryImage } from '../data/categoryAssets.js'
import { getCategoryAssetEntry, getProductAssetEntry, getProductPlaceholderByType, inferProductAssetType } from '../data/productAssets.js'

export const productFallback = {
  src: '/images/placeholders/product-placeholder.svg',
  fallbackSrc: '/images/placeholders/product-placeholder.svg',
  alt: 'StroyRayon товар сүрөтү',
  width: 900,
  height: 675,
  type: 'placeholder',
}

export const categoryFallback = {
  src: '/images/placeholders/category-placeholder.svg',
  alt: 'StroyRayon категория сүрөтү',
  width: 900,
  height: 520,
  type: 'placeholder',
}

export function getImageAlt(target, fallbackAlt = 'StroyRayon сүрөтү') {
  if (!target) return fallbackAlt

  const title = target.titleKg || target.name || target.alt
  if (!title) return fallbackAlt

  return `${title} - StroyRayon`
}

export function normalizeImage(image, fallback = productFallback) {
  if (!image) return fallback
  if (typeof image === 'string') {
    return {
      ...fallback,
      src: image,
      fallbackSrc: fallback.fallbackSrc || fallback.src,
      type: fallback.type === 'placeholder' ? 'external' : fallback.type,
    }
  }

  return {
    ...fallback,
    ...image,
    src: image.src || fallback.src,
    fallbackSrc: image.fallbackSrc || image.fallback || fallback.fallbackSrc || fallback.src,
    alt: image.alt || fallback.alt,
    width: image.width || fallback.width,
    height: image.height || fallback.height,
    type: image.type || fallback.type,
  }
}

export const resolveImage = normalizeImage

const alinexMainImagePattern = /^(\/images\/products\/alinex-[^/]+)\/main\.png(?:\?.*)?$/i

const productImageSizes = {
  thumb: '82px',
  card: '(max-width: 560px) calc(100vw - 32px), (max-width: 1024px) 45vw, 280px',
  detail: '(max-width: 760px) calc(100vw - 52px), (max-width: 1200px) 48vw, 560px',
}

export function getOptimizedProductImage(image, usage = 'card') {
  const normalized = normalizeImage(image)
  const match = normalized.src.match(alinexMainImagePattern)
  if (!match) return normalized

  const directory = match[1]
  const sources = {
    thumb: `${directory}/thumb-320.webp`,
    card: `${directory}/card-640.webp`,
    detail: `${directory}/detail-900.webp`,
  }

  return {
    ...normalized,
    src: sources[usage] || sources.card,
    srcSet: `${sources.thumb} 320w, ${sources.card} 640w, ${sources.detail} 900w`,
    sizes: productImageSizes[usage] || productImageSizes.card,
    fallbackSrc: normalized.src,
    placeholderSrc: normalized.fallbackSrc || productFallback.src,
    type: 'optimized-product',
  }
}

const productPlaceholderTypeByCatalogRoot = {
  stroymaterial: 'building',
  'inzhenerdik-santehnika': 'plumbing',
  santehnika: 'plumbing',
  elektrika: 'electrical',
  instrument: 'tool',
  krepezh: 'fastener',
  'boiok-tush-kagaz': 'paint',
  ventilyaciya: 'ventilation',
  'teplyi-pol': 'heating',
  'bak-koroo': 'garden',
}

export function getProductPlaceholderSrc(product) {
  const catalogPath = Array.isArray(product?.catalogPath) ? product.catalogPath : []
  const catalogType = productPlaceholderTypeByCatalogRoot[catalogPath[0]]
  const inferredType = catalogType || inferProductAssetType(product?.slug || product?.id || product?.name)

  return getProductPlaceholderByType(inferredType)
}

function getProductFallback(product, expectedSrc) {
  const fallbackSrc = getProductPlaceholderSrc(product)

  return {
    ...productFallback,
    src: fallbackSrc,
    fallbackSrc,
    alt: getImageAlt(product, productFallback.alt),
    expectedSrc,
    futureSrc: expectedSrc,
  }
}

function getVariantSpecificImage(product, variant, fallback) {
  if (!variant || typeof variant !== 'object') return null

  const image = variant.image || variant.imageKg || variant.images?.[0]
  if (!image) return null

  return normalizeImage(image, {
    ...fallback,
    alt: `${product?.name || product?.titleKg || fallback.alt} ${variant.size || ''}`.trim(),
    type: 'variant',
  })
}

function getProductImageByVariant(product, variant) {
  const images = Array.isArray(product?.images) ? product.images : []

  if (typeof variant === 'number') return images[variant]
  if (variant === 'main') return images[0]

  const galleryMatch = String(variant || '').match(/^gallery-(\d+)$/)
  if (galleryMatch) return images[Number(galleryMatch[1])]

  return images[0]
}

export function getProductImage(product, variant = 'main') {
  const assetEntry = getProductAssetEntry(product?.slug)
  const expectedSrc = typeof variant === 'number'
    ? assetEntry?.gallery?.[variant - 1] || assetEntry?.main
    : variant === 'main'
      ? assetEntry?.main
      : assetEntry?.gallery?.[Number(String(variant).replace('gallery-', '')) - 1]
  const fallback = getProductFallback(product, expectedSrc)
  const variantImage = getVariantSpecificImage(product, variant, fallback)
  if (variantImage) return variantImage

  const image = getProductImageByVariant(product, variant)

  if (image) return normalizeImage(image, fallback)

  if (assetEntry?.available && expectedSrc) {
    return normalizeImage(
      {
        src: expectedSrc,
        alt: assetEntry.altKg || getImageAlt(product, fallback.alt),
        width: fallback.width,
        height: fallback.height,
        type: variant === 'main' ? 'product' : 'gallery',
      },
      fallback,
    )
  }

  return fallback
}

export function getProductGallery(product, selectedVariant = null) {
  const images = Array.isArray(product?.images) ? product.images : []
  const fallback = getProductImage(product)
  const variantImage = getVariantSpecificImage(product, selectedVariant, fallback)

  if (images.length) {
    const normalizedImages = images.map((image, index) =>
      normalizeImage(image, {
        ...fallback,
        type: index === 0 ? 'product' : 'gallery',
      }),
    )

    if (variantImage && !normalizedImages.some((image) => image.src === variantImage.src)) {
      return [variantImage, ...normalizedImages]
    }

    return normalizedImages
  }

  const assetEntry = getProductAssetEntry(product?.slug)
  if (assetEntry?.available) {
    const assetImages = [
      normalizeImage({ src: assetEntry.main, type: 'product', alt: assetEntry.altKg || getImageAlt(product, fallback.alt) }, fallback),
      ...assetEntry.gallery.map((src) =>
        normalizeImage({ src, type: 'gallery', alt: assetEntry.altKg || getImageAlt(product, fallback.alt) }, fallback),
      ),
    ]

    if (variantImage && !assetImages.some((image) => image.src === variantImage.src)) {
      return [variantImage, ...assetImages]
    }

    return assetImages
  }

  return variantImage ? [variantImage, fallback] : [fallback]
}

export function getCategoryImage(category) {
  const assetEntry = getCategoryAssetEntry(category?.slug)
  const rootImage = getRootCategoryImage(category?.slug, category?.icon)
  const currentImage = category?.image
  const shouldUseRootImage = rootImage && (!currentImage || currentImage.type === 'placeholder' || currentImage.src === categoryFallback.src)

  return normalizeImage(shouldUseRootImage ? rootImage : currentImage, {
    ...categoryFallback,
    alt: getImageAlt(category, categoryFallback.alt),
    expectedSrc: rootImage?.src || assetEntry?.src,
    futureSrc: rootImage?.src || assetEntry?.src,
  })
}

export function getImageFallbackSrc(type = 'product') {
  return type === 'category' ? categoryFallback.src : productFallback.src
}

export function applyImageFallback(event, type = 'product', fallbackOverride = '') {
  const fallbackSrc = fallbackOverride || event?.currentTarget?.dataset?.fallbackSrc || getImageFallbackSrc(type)
  if (!event?.currentTarget) return

  if (event.currentTarget.src.endsWith(fallbackSrc)) {
    const placeholderSrc = event.currentTarget.dataset?.placeholderSrc || getImageFallbackSrc(type)
    if (!event.currentTarget.src.endsWith(placeholderSrc)) event.currentTarget.src = placeholderSrc
    return
  }

  event.currentTarget.removeAttribute('srcset')
  event.currentTarget.alt = event.currentTarget.dataset.fallbackAlt || event.currentTarget.alt || getImageAlt(null)
  event.currentTarget.classList.add('is-fallback-image')
  event.currentTarget.src = fallbackSrc
}
