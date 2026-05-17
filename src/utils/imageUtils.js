import { getCategoryAssetEntry, getProductAssetEntry } from '../data/productAssets.js'

export const productFallback = {
  src: '/images/placeholders/product-placeholder.svg',
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
      type: fallback.type === 'placeholder' ? 'external' : fallback.type,
    }
  }

  return {
    ...fallback,
    ...image,
    src: image.src || fallback.src,
    alt: image.alt || fallback.alt,
    width: image.width || fallback.width,
    height: image.height || fallback.height,
    type: image.type || fallback.type,
  }
}

export const resolveImage = normalizeImage

function getProductFallback(product, expectedSrc) {
  return {
    ...productFallback,
    alt: getImageAlt(product, productFallback.alt),
    expectedSrc,
    futureSrc: expectedSrc,
  }
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
  const image = getProductImageByVariant(product, variant)

  if (image) return normalizeImage(image, fallback)

  if (assetEntry?.available && expectedSrc) {
    return normalizeImage(
      {
        src: expectedSrc,
        alt: getImageAlt(product, fallback.alt),
        width: fallback.width,
        height: fallback.height,
        type: variant === 'main' ? 'product' : 'gallery',
      },
      fallback,
    )
  }

  return fallback
}

export function getProductGallery(product) {
  const images = Array.isArray(product?.images) ? product.images : []
  const fallback = getProductImage(product)

  if (images.length) {
    return images.map((image, index) =>
      normalizeImage(image, {
        ...fallback,
        type: index === 0 ? 'product' : 'gallery',
      }),
    )
  }

  const assetEntry = getProductAssetEntry(product?.slug)
  if (assetEntry?.available) {
    return [
      normalizeImage(assetEntry.main, fallback),
      ...assetEntry.gallery.map((src) => normalizeImage({ src, type: 'gallery', alt: getImageAlt(product, fallback.alt) }, fallback)),
    ]
  }

  return [fallback]
}

export function getCategoryImage(category) {
  const assetEntry = getCategoryAssetEntry(category?.slug)

  return normalizeImage(category?.image, {
    ...categoryFallback,
    alt: getImageAlt(category, categoryFallback.alt),
    expectedSrc: assetEntry?.src,
    futureSrc: assetEntry?.src,
  })
}

export function getImageFallbackSrc(type = 'product') {
  return type === 'category' ? categoryFallback.src : productFallback.src
}

export function applyImageFallback(event, type = 'product') {
  const fallbackSrc = getImageFallbackSrc(type)
  if (!event?.currentTarget || event.currentTarget.src.endsWith(fallbackSrc)) return

  event.currentTarget.src = fallbackSrc
}
