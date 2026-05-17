export const PRODUCT_IMAGE_BASE_PATH = '/images/products'
export const CATEGORY_IMAGE_BASE_PATH = '/images/categories'

export const productImageNaming = {
  productMain: `${PRODUCT_IMAGE_BASE_PATH}/{product-slug}/main.webp`,
  productGallery: `${PRODUCT_IMAGE_BASE_PATH}/{product-slug}/gallery-{index}.webp`,
  categorySvg: `${CATEGORY_IMAGE_BASE_PATH}/{catalog-node-slug}.svg`,
  categoryWebp: `${CATEGORY_IMAGE_BASE_PATH}/{catalog-node-slug}.webp`,
}

export function createProductAssetEntry(slug, options = {}) {
  const galleryCount = Number.isFinite(Number(options.galleryCount)) ? Number(options.galleryCount) : 2

  return {
    slug,
    main: `${PRODUCT_IMAGE_BASE_PATH}/${slug}/main.webp`,
    gallery: Array.from({ length: galleryCount }, (_, index) => `${PRODUCT_IMAGE_BASE_PATH}/${slug}/gallery-${index + 1}.webp`),
    available: Boolean(options.available),
  }
}

export function getProductAssetEntry(slug) {
  if (!slug) return null
  return createProductAssetEntry(slug)
}

export function getCategoryAssetEntry(slug, type = 'svg') {
  if (!slug) return null
  const extension = type === 'webp' ? 'webp' : 'svg'

  return {
    slug,
    src: `${CATEGORY_IMAGE_BASE_PATH}/${slug}.${extension}`,
    available: false,
  }
}
