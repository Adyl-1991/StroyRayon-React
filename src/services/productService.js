import { categories } from '../data/categories.js'
import { catalogTree } from '../data/catalogTree.js'
import { products } from '../data/products.js'

export const STOCK_LABELS = {
  in_stock: 'Бар',
  low_stock: 'Аз калды',
  pre_order: 'Заказ менен',
  out_of_stock: 'Жок',
}

export const BADGE_LABELS = {
  hit: 'Хит',
  sale: 'Акция',
  quality: 'Сапаттуу',
  new: 'Жаңы',
}

const UNIT_OPTIONS = ['даана', 'метр', 'комплект', 'кап', 'рулон']

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
    if (filters.categorySlug && product.categorySlug !== filters.categorySlug) return false
    if (filters.subcategorySlug && product.subcategorySlug !== filters.subcategorySlug) return false
    if (filters.sale && !product.isSale) return false
    if (filters.popular && !product.isPopular) return false
    return true
  })
}

const HOME_POPULAR_GROUPS = [
  { key: 'stroymaterial', labelKg: 'Стройматериал', slugs: ['stroymaterial'], preferredIds: ['cement-m500-50kg'] },
  { key: 'instrument', labelKg: 'Инструмент', slugs: ['instrument'], preferredIds: ['drill-650w', 'cordless-screwdriver-12v'] },
  { key: 'elektrika', labelKg: 'Электрика', slugs: ['elektrika'], preferredIds: ['cable-vvg-3x2-5', 'socket-white-single'] },
  { key: 'santehnika', labelKg: 'Сантехника', slugs: ['santehnika'], preferredIds: ['kitchen-mixer-basic', 'bath-mixer-shower-set'] },
  { key: 'ventilyaciya', labelKg: 'Вентиляция', slugs: ['ventilyaciya'], preferredIds: ['ventilation-grille-150'] },
  { key: 'krepezh', labelKg: 'Катыргычтар/крепежи', slugs: ['krepezh'], preferredIds: ['screw-black-35', 'wood-screw-4x50'] },
  { key: 'boiok-tush-kagaz', labelKg: 'Боёктор/туш кагаздар', slugs: ['boiok-tush-kagaz'], preferredIds: ['interior-paint-white-10l'] },
  { key: 'bak-koroo', labelKg: 'Бак жана короо', slugs: ['bak-koroo'], preferredIds: ['garden-hose-3-4-25m', 'garden-shovel-metal'] },
]

export function getHomePopularProducts(sourceProducts = products) {
  const normalizedSource = sourceProducts.map(normalizeProduct)
  const normalizedFallback = products.map(normalizeProduct)
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
    if (filters.categorySlug && product.categorySlug !== filters.categorySlug) return false
    if (filters.subcategorySlug && product.subcategorySlug !== filters.subcategorySlug) return false
    if (filters.minPrice && product.price < Number(filters.minPrice)) return false
    if (filters.maxPrice && product.price > Number(filters.maxPrice)) return false
    if (filters.stockStatuses?.length && !filters.stockStatuses.includes(getStockStatus(product))) return false
    if (filters.brands?.length && !filters.brands.includes(product.brand)) return false
    if (filters.tags?.length && !filters.tags.some((tag) => hasTag(product, tag))) return false
    if (filters.units?.length && !filters.units.includes(product.unit)) return false
    if (filters.catalogNode) {
      const descendantSlugs = getDescendantSlugs(filters.catalogNode)
      if (!product.catalogPath?.some((slug) => descendantSlugs.includes(slug))) return false
    }
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
  const product = products.find((product) => product.slug === productSlug)
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
    .filter((item, index, list) => item.id !== product.id && list.findIndex((candidate) => candidate.id === item.id) === index)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit)
}

export function searchProducts(query, sourceProducts = products) {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return []
  return sourceProducts.map(normalizeProduct).filter((product) => getSearchIndex(product).includes(normalizedQuery))
}

export function getStockLabel(stockStatus) {
  return STOCK_LABELS[stockStatus] || 'Такталат'
}

export function getStockStatus(product) {
  if (product.stockStatus) return product.stockStatus
  const stockText = typeof product.stock === 'string' ? product.stock.toLowerCase() : ''
  if (stockText.includes('заказ')) return 'pre_order'
  if (stockText.includes('жок')) return 'out_of_stock'
  return 'in_stock'
}

export function isPurchasable(product) {
  return getStockStatus(product) !== 'out_of_stock'
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
    units: UNIT_OPTIONS,
    tags: unique(['hit', 'sale', 'quality', 'new', ...scopedProducts.flatMap((product) => product.tags || [])]),
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
    normalizedProduct.shortDescription,
    normalizedProduct.description,
    normalizedProduct.brand,
    normalizedProduct.sku,
    normalizedProduct.categorySlug,
    normalizedProduct.subcategorySlug,
    normalizedProduct.catalogPath?.join(' '),
    category?.name,
    subcategory?.name,
    specs,
    normalizedProduct.tags?.join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function normalizeProduct(product) {
  if (!product) return product
  const brandName = typeof product.brand === 'string' ? product.brand : product.brand?.name
  const stockStatus = getStockStatus({ ...product, brand: brandName })
  const tags = product.tags || product.badges || []
  const rating = product.rating || 0
  const reviewsCount = product.reviewsCount || 0

  return {
    ...product,
    brand: brandName,
    name: product.name || product.titleKg,
    description: product.description || product.descriptionKg,
    shortDescription: product.shortDescription || product.shortDescriptionKg,
    price: Number(product.price || 0),
    oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
    stockStatus,
    stock: product.stock,
    tags,
    badges: product.badges || tags,
    isSale: product.isSale ?? tags.includes('sale'),
    isPopular: product.isPopular ?? tags.includes('hit'),
    rating,
    reviewsCount,
    catalogPath: Array.isArray(product.catalogPath) ? product.catalogPath : getNodePathSegments(product.catalogNode),
  }
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
