export const CATALOG_BRAND_PROVENANCE = Object.freeze({
  AlinEX: 'official_catalog_import',
  'EVER PLAST': 'official_catalog_import',
  CHINT: 'supplier_price_import',
  VIKO: 'supplier_price_import',
  PANASONIC: 'supplier_price_import',
  CARKIT: 'supplier_price_import',
  Knauf: 'recognized_manufacturer',
  'Kant Cement': 'recognized_manufacturer',
  Safari: 'owner_confirmed_price_pending',
})

// These labels were assigned while the draft catalog was being filled without
// a supplier price list or an official manufacturer source. Some names may
// exist elsewhere, but their assignment to StroyRayon products is unverified.
export const UNVERIFIED_CATALOG_BRAND_ASSIGNMENTS = Object.freeze([
  'AquaBath',
  'AquaLine',
  'BlockPro',
  'BuildPro',
  'ColorLine',
  'ColorPro',
  'CutPro',
  'DecorPro',
  'DoorFix',
  'DrainLine',
  'DrainPro',
  'DrillPro',
  'ElectroLine',
  'ElectroSafe',
  'FilterPro',
  'FinishPro',
  'FixPro',
  'FloorPro',
  'FramePro',
  'GardenPro',
  'GipsLine',
  'HeatLine',
  'HeatPro',
  'LightPro',
  'MasterHand',
  'MasterMix',
  'MeasurePro',
  'MeterPro',
  'MixPro',
  'NetLine',
  'PaintPro',
  'PipePro',
  'RoofPro',
  'Sanita',
  'SanLine',
  'SanLux',
  'SheetPro',
  'StroyChem',
  'StroyMix',
  'StroyRayon',
  'TermoLine',
  'ThermoLine',
  'ThermoPro',
  'TileFix',
  'ToolMax',
  'ToolPro',
  'ValvePro',
  'VentPro',
])

const verifiedBrands = new Set(Object.keys(CATALOG_BRAND_PROVENANCE))
const unverifiedBrands = new Set(UNVERIFIED_CATALOG_BRAND_ASSIGNMENTS)
const textRemovalBrands = UNVERIFIED_CATALOG_BRAND_ASSIGNMENTS
  .filter((brand) => brand !== 'StroyRayon')
  .sort((left, right) => right.length - left.length)

const brandSpecificationKeys = new Set([
  'brand',
  'бренд',
  'марка',
  'manufacturer',
  'производитель',
  'өндүрүүчү',
])

export function isVerifiedCatalogBrand(brand) {
  return verifiedBrands.has(String(brand || '').trim())
}

export function isUnverifiedCatalogBrand(brand) {
  return unverifiedBrands.has(String(brand || '').trim())
}

export function isPublishableCatalogProduct(product) {
  const brand = typeof product?.brand === 'string' ? product.brand : product?.brand?.name
  return isVerifiedCatalogBrand(brand)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function cleanBrandText(value) {
  let cleaned = value

  for (const brand of textRemovalBrands) {
    cleaned = cleaned.replace(new RegExp(escapeRegExp(brand), 'giu'), '')
  }

  return cleaned
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/([([])\s+/g, '$1')
    .replace(/\s+([)\]])/g, '$1')
    .replace(/^[-–—,:;|]+\s*/u, '')
    .trim()
}

function isTechnicalField(key) {
  const normalizedKey = String(key || '').toLocaleLowerCase('ru').trim()
  return normalizedKey === 'id'
    || normalizedKey === 'ids'
    || normalizedKey === 'slug'
    || normalizedKey === 'sku'
    || normalizedKey === 'article'
    || normalizedKey.endsWith('id')
    || normalizedKey.endsWith('ids')
    || normalizedKey.endsWith('slug')
    || normalizedKey.endsWith('sku')
    || normalizedKey.endsWith('src')
    || normalizedKey.endsWith('url')
    || normalizedKey.endsWith('path')
}

function cleanContent(value, key = '') {
  if (isTechnicalField(key)) return value
  if (typeof value === 'string') return cleanBrandText(value)

  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => cleanContent(item, key)).filter((item) => item !== ''))]
  }

  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, nestedValue]) => {
      const normalizedKey = key.toLocaleLowerCase('ru').trim()
      if (
        brandSpecificationKeys.has(normalizedKey)
        && typeof nestedValue === 'string'
        && !isVerifiedCatalogBrand(nestedValue)
      ) {
        return []
      }

      return [[key, cleanContent(nestedValue, key)]]
    }),
  )
}

export function sanitizeCatalogProductBrand(product) {
  const assignedBrand = String(product?.brand || '').trim()

  if (assignedBrand && !isVerifiedCatalogBrand(assignedBrand) && !isUnverifiedCatalogBrand(assignedBrand)) {
    throw new Error(
      `Catalog brand "${assignedBrand}" has no provenance. Add an approved source before publishing it.`,
    )
  }

  const sanitized = cleanContent(product)

  sanitized.brand = isVerifiedCatalogBrand(assignedBrand) ? assignedBrand : null

  return sanitized
}
