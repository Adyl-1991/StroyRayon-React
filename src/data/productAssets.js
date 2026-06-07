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
    placeholder: `${PRODUCT_IMAGE_BASE_PATH}/${slug}/main.svg`,
    futureMain: `${PRODUCT_IMAGE_BASE_PATH}/${slug}/main.webp`,
    gallery: Array.from({ length: galleryCount }, (_, index) => `${PRODUCT_IMAGE_BASE_PATH}/${slug}/gallery-${index + 1}.webp`),
    available: Boolean(options.available),
  }
}

const plannedProductAssetSlugs = [
  'ppr-truba-pn20',
  'ppr-ugolok-90',
  'gidroizolyaciya-smes-20kg',
  'zatirka-dlya-plitki-2kg',
  'stroitelnyi-gips-25kg',
  'profnastil-krovlya-08mm',
  'plastifikator-beton-1l',
  'ppr-perehodnik-25-20',
  'ppr-kombinirovannaya-mufta-20-12',
  'ppr-klipsa-20',
  'pnd-fiting-mufta-25',
  'kanalizaciya-truba-naruzhnaya-110',
  'schetchik-vody-15',
  'reduktor-davleniya-12',
  'obratnyi-klapan-12',
  'manometr-6bar',
  'filtr-gruboi-ochistki-12',
  'filtr-korpus-10',
  'kartridzh-polipropilen-10',
  'rasshiritelnyi-bak-24l',
  'rakovina-smesitel-basic',
  'gigienicheskii-dush-komplekt',
  'trap-dushevoi-10x10',
  'vanna-akril-170',
  'vodonagrevatel-50l',
  'aerator-smesitelya-m24',
  'pvs-provod-3x1-5',
  'shvvp-provod-2x0-75',
  'sip-kabel-2x16',
  'uzo-2p-40a',
  'difavtomat-16a',
  'led-svetilnik-18w',
  'ulichnyi-prozhektor-30w',
  'podrozetnik-plastik',
  'raspredkorobka-80',
  'mat-teplyi-pol-1m2',
]

const plannedProductAssets = Object.fromEntries(
  plannedProductAssetSlugs.map((slug) => [slug, createProductAssetEntry(slug)]),
)

export function getProductAssetEntry(slug) {
  if (!slug) return null
  if (packshotAssets[slug]) {
    return {
      slug,
      ...packshotAssets[slug],
      available: true,
    }
  }
  if (plannedProductAssets[slug]) return plannedProductAssets[slug]

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
