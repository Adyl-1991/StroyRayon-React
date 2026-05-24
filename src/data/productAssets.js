export const PRODUCT_IMAGE_BASE_PATH = '/images/products'
export const CATEGORY_IMAGE_BASE_PATH = '/images/categories'

export const productImageNaming = {
  productMain: `${PRODUCT_IMAGE_BASE_PATH}/{product-slug}/main.webp`,
  productGallery: `${PRODUCT_IMAGE_BASE_PATH}/{product-slug}/gallery-{index}.webp`,
  categorySvg: `${CATEGORY_IMAGE_BASE_PATH}/{catalog-node-slug}.svg`,
  categoryWebp: `${CATEGORY_IMAGE_BASE_PATH}/{catalog-node-slug}.webp`,
}

const packshotAssets = {
  'portlandcement-m500-50kg': {
    main: `${PRODUCT_IMAGE_BASE_PATH}/portlandcement-m500-50kg/main.svg`,
    gallery: [],
    altKg: 'Портландцемент М500, 50 кг - товар сүрөтү',
  },
  'drel-650w-udarnyi': {
    main: `${PRODUCT_IMAGE_BASE_PATH}/drel-650w-udarnyi/main.svg`,
    gallery: [],
    altKg: 'Дрель 650W - товар сүрөтү',
  },
  'kabel-vvgng-3x2-5': {
    main: `${PRODUCT_IMAGE_BASE_PATH}/kabel-vvgng-3x2-5/main.svg`,
    gallery: [],
    altKg: 'Кабель ВВГнг 3x2.5 - товар сүрөтү',
  },
  'ashkana-smesiteli-basic': {
    main: `${PRODUCT_IMAGE_BASE_PATH}/ashkana-smesiteli-basic/main.svg`,
    gallery: [],
    altKg: 'Ашкана смесители Basic - товар сүрөтү',
  },
  'ventilyaciya-reshetkasy-150x150mm': {
    main: `${PRODUCT_IMAGE_BASE_PATH}/ventilyaciya-reshetkasy-150x150mm/main.svg`,
    gallery: [],
    altKg: 'Вентиляция решеткасы 150x150 мм - товар сүрөтү',
  },
  'samorez-gipsokarton-35x35': {
    main: `${PRODUCT_IMAGE_BASE_PATH}/samorez-gipsokarton-35x35/main.svg`,
    gallery: [],
    altKg: 'Саморез гипсокартон 35 мм - товар сүрөтү',
  },
  'ichki-dubal-boyogu-ak-10l': {
    main: `${PRODUCT_IMAGE_BASE_PATH}/ichki-dubal-boyogu-ak-10l/main.svg`,
    gallery: [],
    altKg: 'Ички дубал боёгу ак, 10 л - товар сүрөтү',
  },
  'sugat-shlangy-34-25m': {
    main: `${PRODUCT_IMAGE_BASE_PATH}/sugat-shlangy-34-25m/main.svg`,
    gallery: [],
    altKg: 'Сугат шлангы 25 м - товар сүрөтү',
  },
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
  if (packshotAssets[slug]) {
    return {
      slug,
      ...packshotAssets[slug],
      available: true,
    }
  }

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
