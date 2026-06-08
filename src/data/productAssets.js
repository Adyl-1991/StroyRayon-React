export const PRODUCT_IMAGE_BASE_PATH = '/images/products'
export const CATEGORY_IMAGE_BASE_PATH = '/images/categories'
export const PRODUCT_PLACEHOLDER_BASE_PATH = '/images/placeholders'

export const productPlaceholderByType = {
  generic: `${PRODUCT_PLACEHOLDER_BASE_PATH}/product-placeholder.svg`,
  building: `${PRODUCT_PLACEHOLDER_BASE_PATH}/product-building-placeholder.svg`,
  plumbing: `${PRODUCT_PLACEHOLDER_BASE_PATH}/product-plumbing-placeholder.svg`,
  electrical: `${PRODUCT_PLACEHOLDER_BASE_PATH}/product-electrical-placeholder.svg`,
  tool: `${PRODUCT_PLACEHOLDER_BASE_PATH}/product-tool-placeholder.svg`,
  fastener: `${PRODUCT_PLACEHOLDER_BASE_PATH}/product-fastener-placeholder.svg`,
  paint: `${PRODUCT_PLACEHOLDER_BASE_PATH}/product-paint-placeholder.svg`,
  ventilation: `${PRODUCT_PLACEHOLDER_BASE_PATH}/product-ventilation-placeholder.svg`,
  heating: `${PRODUCT_PLACEHOLDER_BASE_PATH}/product-heating-placeholder.svg`,
  garden: `${PRODUCT_PLACEHOLDER_BASE_PATH}/product-garden-placeholder.svg`,
}

export const productImageNaming = {
  productMain: `${PRODUCT_IMAGE_BASE_PATH}/{product-slug}/main.webp`,
  productGallery: `${PRODUCT_IMAGE_BASE_PATH}/{product-slug}/gallery-{index}.webp`,
  categorySvg: `${CATEGORY_IMAGE_BASE_PATH}/{catalog-node-slug}.svg`,
  categoryWebp: `${CATEGORY_IMAGE_BASE_PATH}/{catalog-node-slug}.webp`,
}

export function getProductPlaceholderByType(type = 'generic') {
  return productPlaceholderByType[type] || productPlaceholderByType.generic
}

export function inferProductAssetType(slug = '') {
  const value = String(slug).toLowerCase()

  if (/(kabel|provod|avtomat|uzo|difavtomat|rozetka|vyklyuchatel|led|svet|lampa|shit|podrozetnik|raspred)/.test(value)) return 'electrical'
  if (/(drel|shurupovert|molotok|kurok|instrument|valik|kist|sverlo|disk)/.test(value)) return 'tool'
  if (/(samorez|dyubel|anker|bolt|gaika|shaiba|homut|klipsa)/.test(value)) return 'fastener'
  if (/(boyok|emal|lak|kraska|kolor|rastvoritel)/.test(value)) return 'paint'
  if (/(vent|vozduh|reshet|kanal)/.test(value)) return 'ventilation'
  if (/(teplyi|radiator|termostat|rasshiritel|zhylytkich|vodonagrevatel)/.test(value)) return 'heating'
  if (/(shlang|sugat|sugaruu|nasadka|sad|koroo|hoz|araba)/.test(value)) return 'garden'
  if (/(ppr|pnd|truba|mufta|ugol|troynik|kran|kanaliz|filtr|smesitel|rakovina|sifon|unitaz|vanna|trap|podvodka|aerator|manometr|reduktor|klapan)/.test(value)) return 'plumbing'
  if (/(cement|gips|shtukatur|shpak|grunt|gidro|plitka|kley|gipsokarton|profnastil|krovlya|podokonnik|pena|germetik|plastifikator)/.test(value)) return 'building'

  return 'generic'
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
    altKg: 'Вентиляция торчосу 150x150 мм - товар сүрөтү',
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
  const assetType = options.type || inferProductAssetType(slug)

  return {
    slug,
    main: `${PRODUCT_IMAGE_BASE_PATH}/${slug}/main.webp`,
    placeholder: getProductPlaceholderByType(assetType),
    fallback: getProductPlaceholderByType(assetType),
    futureMain: `${PRODUCT_IMAGE_BASE_PATH}/${slug}/main.webp`,
    gallery: Array.from({ length: galleryCount }, (_, index) => `${PRODUCT_IMAGE_BASE_PATH}/${slug}/gallery-${index + 1}.webp`),
    type: assetType,
    available: Boolean(options.available),
    altKg: options.altKg,
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
    const assetType = inferProductAssetType(slug)
    const futureMain = `${PRODUCT_IMAGE_BASE_PATH}/${slug}/main.webp`

    return {
      slug,
      main: futureMain,
      fallback: packshotAssets[slug].main || getProductPlaceholderByType(assetType),
      placeholder: packshotAssets[slug].main || getProductPlaceholderByType(assetType),
      gallery: packshotAssets[slug].gallery || [],
      altKg: packshotAssets[slug].altKg,
      futureMain,
      type: assetType,
      available: false,
      localFallbackAvailable: true,
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
