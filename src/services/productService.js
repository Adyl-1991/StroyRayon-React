import { categories } from '../data/categories.js'
import { catalogTree } from '../data/catalogTree.js'
import { products } from '../data/products.js'

export const STOCK_LABELS_BY_LOCALE = {
  kg: {
    in_stock: 'Бар',
    low_stock: 'Аз калды',
    pre_order: 'Буйрутма менен',
    out_of_stock: 'Жок',
  },
  ru: {
    in_stock: 'В наличии',
    low_stock: 'Мало',
    pre_order: 'Под заказ',
    out_of_stock: 'Нет в наличии',
  },
}

export const STOCK_LABELS = STOCK_LABELS_BY_LOCALE.kg

export const BADGE_LABELS_BY_LOCALE = {
  kg: {
    hit: 'Хит',
    sale: 'Акция',
    quality: 'Сапаттуу',
    new: 'Жаңы',
  },
  ru: {
    hit: 'Хит',
    sale: 'Акция',
    quality: 'Качество',
    new: 'Новинка',
  },
}

export const BADGE_LABELS = BADGE_LABELS_BY_LOCALE.kg

const CUSTOMER_BADGES = ['hit', 'sale', 'quality', 'new']
const KG_TERM_REPLACEMENTS = [
  [/наличиеси/gi, 'бар-жогу'],
  [/наличиеде/gi, 'кампада'],
  [/наличие/gi, 'бар-жогу'],
  [/заказдардын/gi, 'буйрутмалардын'],
  [/заказдар/gi, 'буйрутмалар'],
  [/заказдын/gi, 'буйрутманын'],
  [/заказды/gi, 'буйрутманы'],
  [/заказда/gi, 'буйрутмада'],
  [/заказга/gi, 'буйрутмага'],
  [/заказдан/gi, 'буйрутмадан'],
  [/заказ/gi, 'буйрутма'],
]

export function normalizeKgText(value) {
  if (typeof value !== 'string') return value
  return KG_TERM_REPLACEMENTS.reduce(
    (text, [pattern, replacement]) =>
      text.replace(pattern, (match) =>
        match[0] === match[0].toLocaleUpperCase('ky')
          ? `${replacement[0].toLocaleUpperCase('ky')}${replacement.slice(1)}`
          : replacement,
      ),
    value,
  )
}

export function getCategories() {
  return categories
}

export function getTopCatalogNodes() {
  return catalogTree
}

export function getCatalogNodeUrl(pathOrNode) {
  const path = Array.isArray(pathOrNode) ? pathOrNode : getNodePathSegments(pathOrNode)
  return `/catalog/${(path || []).join('/')}`
}

export function findCatalogNodeByPath(pathSegments = [], tree = catalogTree) {
  let nodes = tree
  let currentNode = null
  const canonicalPath = []
  const breadcrumbs = []

  for (const segment of pathSegments) {
    currentNode = nodes.find((node) => node.slug === segment || node.aliases?.includes(segment))
    if (!currentNode) return null
    canonicalPath.push(currentNode.slug)
    breadcrumbs.push({ ...currentNode, path: [...canonicalPath], children: currentNode.children || [] })
    nodes = currentNode.children || []
  }

  return currentNode ? { ...currentNode, path: canonicalPath, children: currentNode.children || [], breadcrumbs } : null
}

export function getCatalogBreadcrumbs(pathSegments = [], tree = catalogTree) {
  return findCatalogNodeByPath(pathSegments, tree)?.breadcrumbs || []
}

export function getDescendantSlugs(node) {
  if (!node) return []
  return [node.slug, ...(node.children || []).flatMap((child) => getDescendantSlugs(child))]
}

export function getProductsByCatalogNode(node, sourceProducts = products) {
  if (!node) return []
  const descendantSlugs = getDescendantSlugs(node)
  const nodeTags = node.productTags || []

  return sourceProducts.map(normalizeProduct).filter((product) => {
    if (product.isActive === false) return false
    const pathMatch = product.catalogPath?.some((slug) => descendantSlugs.includes(slug))
    const tagMatch = nodeTags.some((tag) => product.tags?.includes(tag))
    return pathMatch || tagMatch
  })
}

export function getCategoryBySlug(categorySlug) {
  return categories.find((category) => category.slug === categorySlug)
}

export function getSubcategory(categorySlug, subcategorySlug) {
  const category = getCategoryBySlug(categorySlug)
  return category?.subcategories.find((subcategory) => subcategory.slug === subcategorySlug)
}

export function getProducts(filters = {}) {
  return products.filter((product) => {
    if (product.isActive === false) return false
    if (filters.categorySlug && product.categorySlug !== filters.categorySlug) return false
    if (filters.subcategorySlug && product.subcategorySlug !== filters.subcategorySlug) return false
    if (filters.sale && !product.isSale) return false
    if (filters.popular && !product.isPopular) return false
    return true
  })
}

const HOME_POPULAR_GROUPS = [
  { key: 'stroymaterial', labelKg: 'Курулуш материалдары', slugs: ['stroymaterial'], preferredIds: ['cement-m500-50kg'] },
  { key: 'instrument', labelKg: 'Шаймандар', slugs: ['instrument'], preferredIds: ['drill-650w', 'cordless-screwdriver-12v'] },
  { key: 'elektrika', labelKg: 'Электрика', slugs: ['elektrika'], preferredIds: ['cable-vvg-3x2-5', 'socket-white-single'] },
  { key: 'santehnika', labelKg: 'Сантехника', slugs: ['santehnika'], preferredIds: ['kitchen-mixer-basic', 'bath-mixer-shower-set'] },
  { key: 'ventilyaciya', labelKg: 'Вентиляция', slugs: ['ventilyaciya'], preferredIds: ['ventilation-grille-150'] },
  { key: 'krepezh', labelKg: 'Бекиткич', slugs: ['krepezh'], preferredIds: ['screw-black-35', 'wood-screw-4x50'] },
  { key: 'boiok-tush-kagaz', labelKg: 'Боёк, туш жана кагаз', slugs: ['boiok-tush-kagaz'], preferredIds: ['interior-paint-white-10l'] },
  { key: 'bak-koroo', labelKg: 'Бак жана короо', slugs: ['bak-koroo'], preferredIds: ['garden-hose-3-4-25m', 'garden-shovel-metal'] },
]

export const legacyProductSlugAliases = {
  'kabel-vvgng': 'kabel-vvgng-3x2-5',
  'kabel-kanal-16x16': 'kabel-kanal-25x16-2',
  'gips-shtukaturka': 'gips-shtukaturkasy-30kg',
  'smesitel-kuhnya': 'ashkana-smesiteli-basic',
}

export function resolveProductSlug(productSlug) {
  return legacyProductSlugAliases[productSlug] || productSlug
}

export function getHomePopularProducts(sourceProducts = products) {
  const normalizedSource = sourceProducts.map(normalizeProduct).filter((product) => product.isActive !== false)
  const normalizedFallback = products.map(normalizeProduct).filter((product) => product.isActive !== false)
  const selected = []

  for (const group of HOME_POPULAR_GROUPS) {
    const product =
      findProductForGroup(normalizedSource, group, selected) ||
      findProductForGroup(normalizedFallback, group, selected)

    if (product) selected.push(product)
  }

  return selected
}

function findProductForGroup(productList, group, selectedProducts) {
  const selectedIds = new Set(selectedProducts.map((product) => product.id))
  const byPreferredId = group.preferredIds
    .map((id) => productList.find((product) => product.id === id && !selectedIds.has(product.id)))
    .find(Boolean)

  if (byPreferredId) return byPreferredId

  return productList.find(
    (product) =>
      !selectedIds.has(product.id) &&
      product.catalogPath?.some((slug) => group.slugs.includes(slug)),
  )
}

export function sortProducts(productsToSort, sort = 'popular') {
  return [...productsToSort].map(normalizeProduct).sort((a, b) => {
    if (sort === 'price-asc') return a.price - b.price
    if (sort === 'price-desc') return b.price - a.price
    if (sort === 'rating') return b.rating - a.rating
    if (sort === 'sale') return Number(b.isSale) - Number(a.isSale)
    if (sort === 'new') return Number(hasTag(b, 'new')) - Number(hasTag(a, 'new'))
    return Number(b.isPopular) - Number(a.isPopular)
  })
}

export function filterProducts(productsToFilter, filters = {}) {
  return productsToFilter.map(normalizeProduct).filter((product) => {
    if (product.isActive === false) return false
    if (filters.categorySlug && product.categorySlug !== filters.categorySlug) return false
    if (filters.subcategorySlug && product.subcategorySlug !== filters.subcategorySlug) return false
    if (filters.minPrice && product.price < Number(filters.minPrice)) return false
    if (filters.maxPrice && product.price > Number(filters.maxPrice)) return false
    if (filters.stockStatuses?.length && !filters.stockStatuses.includes(getStockStatus(product))) return false
    if (filters.brands?.length && !filters.brands.includes(product.brand)) return false
    if (filters.tags?.length && !filters.tags.some((tag) => hasTag(product, tag))) return false
    if (filters.units?.length && !filters.units.includes(product.unit)) return false
    if (filters.saleOnly && !product.isSale) return false
    return true
  })
}

export function getFilteredProducts(filters = {}, sourceProducts = products) {
  const baseProducts = filters.catalogNode
    ? getProductsByCatalogNode(filters.catalogNode, sourceProducts)
    : filters.search
      ? searchProducts(filters.search, sourceProducts)
      : sourceProducts.map(normalizeProduct)
  const filteredProducts = filterProducts(baseProducts, filters)

  return sortProducts(filteredProducts, filters.sort)
}

export function getProductBySlug(productSlug) {
  const resolvedSlug = resolveProductSlug(productSlug)
  const product = products.find((product) => product.slug === resolvedSlug && product.isActive !== false)
  return product ? normalizeProduct(product) : undefined
}

export function getRelatedProducts(product, limit = 4, sourceProducts = products) {
  if (!product) return []
  const preferredIds = product.relatedProductIds || []
  const normalizedProducts = sourceProducts.map(normalizeProduct)
  const apiRelatedProducts = (product.relatedProducts || []).map(normalizeProduct)
  const preferredProducts = preferredIds.map((id) => normalizedProducts.find((item) => item.id === id)).filter(Boolean)
  const categoryProducts = normalizedProducts.filter((item) => item.id !== product.id && item.categorySlug === product.categorySlug)

  return [...apiRelatedProducts, ...preferredProducts, ...categoryProducts]
    .filter((item, index, list) => item.isActive !== false && item.id !== product.id && list.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit)
}

export function searchProducts(query, sourceProducts = products) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return []
  return sourceProducts
    .map(normalizeProduct)
    .filter((product) => product.isActive !== false && getSearchIndex(product).includes(normalizedQuery))
}

export function getStockLabel(stockStatus, locale = 'kg') {
  return STOCK_LABELS_BY_LOCALE[locale]?.[stockStatus] || STOCK_LABELS_BY_LOCALE.kg[stockStatus] || (locale === 'ru' ? 'Уточняется' : 'Такталат')
}

export function getBadgeLabel(tag, locale = 'kg') {
  return BADGE_LABELS_BY_LOCALE[locale]?.[tag] || BADGE_LABELS_BY_LOCALE.kg[tag] || tag
}

export function getProductTitle(product, locale = 'kg') {
  if (!product) return ''
  return locale === 'ru'
    ? product.titleRu || product.name || product.titleKg || product.title || ''
    : product.titleKg || product.name || product.title || ''
}

export function getUnitLabel(unit, locale = 'kg') {
  if (locale !== 'ru') return unit
  const labels = {
    'даана': 'шт.',
    'кап': 'мешок',
    'метр': 'метр',
    'комплект': 'комплект',
    'рулон': 'рулон',
  }
  return labels[unit] || unit
}

export function getLocalizedUnitText(value, locale = 'kg') {
  if (!value || locale !== 'ru') return value

  return String(value)
    .replace(/Метраж менен кесилип берилет\.?/giu, 'Отрезается по метражу.')
    .replace(/(?<![\p{L}\p{N}_])даана(?![\p{L}\p{N}_])/giu, 'шт.')
    .replace(/(?<![\p{L}\p{N}_])кап(?![\p{L}\p{N}_])/giu, 'мешок')
}

export function getLocalizedProductValue(product, fieldBase, locale = 'kg') {
  if (!product) return ''
  if (locale === 'ru' && fieldBase === 'productType') return product.productTypeRu || product.typeRu || ''
  if (locale === 'ru') return getLocalizedUnitText(product[`${fieldBase}Ru`] || product[fieldBase] || product[`${fieldBase}Kg`] || '', locale)
  return normalizeKgText(product[`${fieldBase}Kg`] || product[fieldBase] || '')
}

export function getProductShortDescription(product, locale = 'kg') {
  if (!product) return ''
  return locale === 'ru'
    ? product.shortDescriptionRu || product.shortDescription || product.descriptionRu || product.shortDescriptionKg || ''
    : normalizeKgText(product.shortDescriptionKg || product.shortDescription || product.descriptionKg || '')
}

function normalizeComparableProductText(value) {
  return String(value || '')
    .toLocaleLowerCase('ru')
    .replace(/ё/g, 'е')
    .replace(/\bkg\b/g, 'кг')
    .replace(/\bшт\.?\b/g, 'шт')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

function getMeasurementTokens(value) {
  const normalized = normalizeComparableProductText(value)
  return [...normalized.matchAll(/(?:^|\s)(\d+(?:[.,]\d+)?\s*(?:кг|г|л|мл|мм|см|м|шт))(?=\s|$)/gu)]
    .map((match) => match[1])
}

/**
 * Returns true when a card/detail value is already communicated by visible copy.
 * Besides exact text fragments, measurements such as "30 кг мешок" are treated
 * as duplicates when "30 кг" is already present in the product title.
 */
export function isRedundantProductText(value, ...visibleValues) {
  const candidate = normalizeComparableProductText(value)
  if (!candidate) return true

  const candidateMeasurements = getMeasurementTokens(candidate)

  return visibleValues.filter(Boolean).some((visibleValue) => {
    const visible = normalizeComparableProductText(visibleValue)
    if (!visible) return false
    if (visible === candidate || visible.includes(candidate)) return true

    return candidateMeasurements.length > 0
      && candidateMeasurements.every((measurement) => visible.includes(measurement))
  })
}

export function getProductFullDescription(product, locale = 'kg') {
  if (!product) return ''
  return locale === 'ru'
    ? product.fullDescriptionRu || product.descriptionRu || product.description || product.fullDescriptionKg || ''
    : normalizeKgText(product.fullDescriptionKg || product.descriptionKg || product.description || '')
}

export function getProductSpecs(product, locale = 'kg') {
  if (!product) return {}
  if (locale === 'ru') {
    return {
      ...(product.specsRu || {}),
      ...(product.specificationsRu || {}),
    }
  }

  return Object.fromEntries(
    Object.entries({ ...(product.specs || {}), ...(product.specificationsKg || {}) }).map(([key, value]) => [
      normalizeKgText(key),
      normalizeKgText(value),
    ]),
  )
}

export function getProductListField(product, fieldBase, locale = 'kg') {
  if (!product) return []
  const localizedField = `${fieldBase}${locale === 'ru' ? 'Ru' : 'Kg'}`
  const fallbackField = `${fieldBase}${locale === 'ru' ? 'Kg' : 'Ru'}`
  const value = product[localizedField] || (locale === 'ru' ? [] : product[fallbackField] || [])
  if (Array.isArray(value)) {
    return value
      .filter(Boolean)
      .map((item) => {
        if (locale === 'ru') return item
        if (typeof item === 'string') return normalizeKgText(item)
        if (item && typeof item === 'object') {
          return Object.fromEntries(Object.entries(item).map(([key, field]) => [key, normalizeKgText(field)]))
        }
        return item
      })
  }
  return value ? [locale === 'ru' ? value : normalizeKgText(value)] : []
}

export function getStockStatus(product) {
  if (!product) return 'out_of_stock'
  if (product.stockStatus) return product.stockStatus
  const stockText = typeof product.stock === 'string' ? product.stock.toLowerCase() : ''
  if (stockText.includes('заказ') || stockText.includes('буйрутма')) return 'pre_order'
  if (stockText.includes('жок')) return 'out_of_stock'
  return 'in_stock'
}

export function getProductVariants(product) {
  if (!Array.isArray(product?.variants)) return []

  return product.variants
    .map((variant) => ({
      ...variant,
      id: String(variant.id || variant.sku || variant.size || '').trim(),
      titleKg: variant.titleKg || variant.size || '',
      titleRu: variant.titleRu || variant.size || variant.titleKg || '',
      size: String(variant.size || variant.titleKg || variant.titleRu || '').trim(),
      price: Number(variant.price ?? product.price ?? 0),
      unit: variant.unit || product.unit,
      unitRu: variant.unitRu || product.unitRu,
      packageInfo: variant.packageInfo || variant.packageInfoKg || product.packageInfoKg || product.minOrder,
      packageInfoRu: getLocalizedUnitText(
        variant.packageInfoRu || product.packageInfoRu || product.minOrderRu || product.minOrder,
        'ru',
      ),
      stockStatus: variant.stockStatus || product.stockStatus || 'in_stock',
      sku: variant.sku || `${product.sku || product.id}-${variant.id || variant.size || 'variant'}`,
    }))
    .filter((variant) => variant.id && variant.size && Number.isFinite(variant.price))
}

export function hasProductVariants(product) {
  return getProductVariants(product).length > 0
}

export function getProductPrice(product) {
  const variants = getProductVariants(product)
  if (!variants.length) return Number(product?.price || 0)

  const knownPrices = variants
    .map((variant) => Number(variant.price || 0))
    .filter((price) => Number.isFinite(price) && price > 0)

  return knownPrices.length ? Math.min(...knownPrices) : Number(product?.price || 0)
}

export function getDefaultVariant(product) {
  const variants = getProductVariants(product)
  return variants.find((variant) => getStockStatus(variant) !== 'out_of_stock') || variants[0] || null
}

export function getSelectedVariant(product, variantId) {
  const variants = getProductVariants(product)
  if (!variants.length) return null

  return variants.find((variant) => variant.id === variantId || variant.sku === variantId) || getDefaultVariant(product)
}

export function getVariantSizeSummary(product, limit = 4) {
  const sizes = getProductVariants(product).map((variant) => variant.size).filter(Boolean)
  if (!sizes.length) return ''

  const visibleSizes = sizes.slice(0, limit).join(', ')
  const hiddenCount = sizes.length - limit

  return hiddenCount > 0 ? `${visibleSizes} +${hiddenCount}` : visibleSizes
}

export function isPurchasable(product, selectedVariant) {
  if (selectedVariant) return Number(selectedVariant.price) > 0 && getStockStatus(selectedVariant) !== 'out_of_stock'
  const variants = getProductVariants(product)
  if (variants.length) return variants.some((variant) => Number(variant.price) > 0 && getStockStatus(variant) !== 'out_of_stock')

  return Number(product?.price) > 0 && getStockStatus(product) !== 'out_of_stock'
}

export function hasTag(product, tag) {
  return product.tags?.includes(tag) || (tag === 'sale' && product.isSale) || (tag === 'hit' && product.isPopular)
}

export function getFilterOptions(scopeFilters = {}) {
  const scopedProducts = scopeFilters.catalogNode
    ? getProductsByCatalogNode(scopeFilters.catalogNode, scopeFilters.products || products)
    : filterProducts(scopeFilters.products || products, {
        categorySlug: scopeFilters.categorySlug,
        subcategorySlug: scopeFilters.subcategorySlug,
      })

  return {
    brands: unique(scopedProducts.map((product) => product.brand).filter(Boolean)),
    units: unique(scopedProducts.map((product) => product.unit).filter(Boolean)),
    tags: CUSTOMER_BADGES.filter((tag) => scopedProducts.some((product) => hasTag(product, tag))),
  }
}

function unique(values) {
  return [...new Set(values)]
}

function getSearchIndex(product) {
  const normalizedProduct = normalizeProduct(product)
  const category = getCategoryBySlug(normalizedProduct.categorySlug)
  const subcategory = getSubcategory(normalizedProduct.categorySlug, normalizedProduct.subcategorySlug)
  const specs = Object.values(normalizedProduct.specs || {}).join(' ')

  return [
    normalizedProduct.name,
    normalizedProduct.titleRu,
    normalizedProduct.shortDescription,
    normalizedProduct.shortDescriptionRu,
    normalizedProduct.description,
    normalizedProduct.descriptionRu,
    normalizedProduct.fullDescriptionKg,
    normalizedProduct.fullDescriptionRu,
    normalizedProduct.brand,
    normalizedProduct.sku,
    normalizedProduct.article,
    normalizedProduct.categorySlug,
    normalizedProduct.subcategorySlug,
    normalizedProduct.catalogPath?.join(' '),
    normalizedProduct.variants?.map((variant) => `${variant.size} ${variant.sku}`).join(' '),
    category?.name,
    subcategory?.name,
    specs,
    normalizedProduct.tags?.join(' '),
    normalizedProduct.aliases?.join(' '),
    normalizedProduct.aliasesKg?.join(' '),
    normalizedProduct.aliasesRu?.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function normalizeProduct(product) {
  if (!product) return product
  const brandName = typeof product.brand === 'string' ? product.brand : product.brand?.name
  const variants = getProductVariants({ ...product, brand: brandName })
  const stockStatus = getAggregateVariantStockStatus(variants) || getStockStatus({ ...product, brand: brandName })
  const tags = product.tags || product.badges || []
  const aliasesKg = Array.isArray(product.aliasesKg) ? product.aliasesKg : []
  const aliasesRu = Array.isArray(product.aliasesRu) ? product.aliasesRu : []
  const aliases = Array.isArray(product.aliases) ? product.aliases : [...aliasesKg, ...aliasesRu]
  const rating = product.rating || 0
  const reviewsCount = product.reviewsCount || 0
  const catalogPath = Array.isArray(product.catalogPath) ? product.catalogPath : getNodePathSegments(product.catalogNode)
  const titleKg = product.titleKg || product.name || product.title || ''
  const titleRu = product.titleRu || titleKg
  const shortDescriptionKg = product.shortDescriptionKg || product.shortDescription || product.descriptionKg || product.description || ''
  const shortDescriptionRu = product.shortDescriptionRu || product.descriptionRu || shortDescriptionKg
  const fullDescriptionKg = product.fullDescriptionKg || product.descriptionKg || product.description || shortDescriptionKg
  const fullDescriptionRu = product.fullDescriptionRu || product.descriptionRu || shortDescriptionRu || fullDescriptionKg
  const specificationsKg = product.specificationsKg || product.specs || {}
  const specificationsRu = product.specificationsRu || product.specsRu || {}

  return {
    ...product,
    brand: brandName,
    titleKg,
    titleRu,
    name: product.name || titleKg,
    description: product.description || product.descriptionKg || fullDescriptionKg,
    descriptionKg: product.descriptionKg || fullDescriptionKg,
    descriptionRu: product.descriptionRu || fullDescriptionRu,
    shortDescription: product.shortDescription || shortDescriptionKg,
    shortDescriptionKg,
    shortDescriptionRu,
    fullDescriptionKg,
    fullDescriptionRu,
    specs: specificationsKg,
    specificationsKg,
    specificationsRu,
    article: product.article || product.sku,
    categoryId: product.categoryId || product.categorySlug || catalogPath[0],
    subcategoryId: product.subcategoryId || product.subcategorySlug || catalogPath.at(-1),
    productType: product.productType || product.type || catalogPath.at(-1) || product.subcategorySlug,
    productTypeRu: product.productTypeRu || product.typeRu || '',
    pack: product.pack || product.packageInfoKg || product.minOrder,
    packRu: getLocalizedUnitText(product.packRu || product.pack || product.packageInfoKg || product.minOrder, 'ru'),
    minOrderRu: getLocalizedUnitText(product.minOrderRu || product.minOrder, 'ru'),
    unitRu: product.unitRu || getUnitLabel(product.unit, 'ru'),
    weight: product.weight || specificationsKg.Салмак || specificationsKg.Салмагы,
    size: product.size || product.weight || product.pack,
    variants,
    price: variants.length ? getProductPrice({ ...product, variants }) : Number(product.price || 0),
    oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
    stockStatus,
    stock: product.stock,
    tags,
    aliases,
    aliasesKg,
    aliasesRu,
    badges: product.badges || tags,
    isSale: product.isSale ?? tags.includes('sale'),
    isPopular: product.isPopular ?? tags.includes('hit'),
    rating,
    reviewsCount,
    catalogPath,
  }
}

function getAggregateVariantStockStatus(variants) {
  if (!variants.length) return ''
  if (variants.some((variant) => getStockStatus(variant) === 'in_stock')) return 'in_stock'
  if (variants.some((variant) => getStockStatus(variant) === 'low_stock')) return 'low_stock'
  if (variants.some((variant) => getStockStatus(variant) === 'pre_order')) return 'pre_order'
  return 'out_of_stock'
}

export function normalizeCatalogTree(nodes = []) {
  return nodes.map((node) => normalizeCatalogNode(node))
}

function normalizeCatalogNode(node) {
  return {
    ...node,
    path: getNodePathSegments(node),
    children: normalizeCatalogTree(node.children || []),
  }
}

function getNodePathSegments(nodeOrPath) {
  if (Array.isArray(nodeOrPath)) return nodeOrPath
  if (!nodeOrPath?.path) return []
  return Array.isArray(nodeOrPath.path) ? nodeOrPath.path : String(nodeOrPath.path).split('/').filter(Boolean)
}
