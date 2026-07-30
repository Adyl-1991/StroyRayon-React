import { electricalSupplierProducts } from '../data/electricalSupplierProducts.generated.js'
import { getFilteredProducts } from '../services/productService.js'

const bundledElectricalBrands = new Set(['chint', 'panasonic', 'viko'])
const bundledElectricalOverrideSlugs = new Set([
  'kabeldik-teplyi-pol-10m',
  'kabeldik-teplyi-pol-20m',
  'mat-teplyi-pol-1m2',
  'mat-teplyi-pol-2m2',
  'mat-teplyi-pol-3m2',
])

function matchesBundledElectricalOverride(filters) {
  const search = String(filters.search || '').toLocaleLowerCase('ru')
  const catalogPath = filters.catalogNode?.path || []

  return (
    catalogPath.includes('elektr-teplyi-pol')
    || filters.categorySlug === 'heating'
    || filters.subcategorySlug === 'underfloor-heating'
    || filters.brands?.some((brand) => String(brand).toLocaleLowerCase('ru') === 'safari')
    || /safari|греющ|нагревательн|тепл.*пол|жылуу пол/u.test(search)
  )
}

export function shouldUseBundledElectricalSupplier(filters = {}) {
  const hasCatalogScope = Boolean(
    filters.catalogNode
      || filters.categorySlug
      || filters.subcategorySlug
      || filters.search
      || filters.brands?.length
      || filters.tags?.length
      || filters.units?.length
      || filters.stockStatuses?.length,
  )

  if (!hasCatalogScope) return false

  return (
    getFilteredProducts(filters, electricalSupplierProducts).length > 0
    || matchesBundledElectricalOverride(filters)
  )
}

export function isBundledElectricalSupplierProduct(product) {
  return (
    bundledElectricalBrands.has(String(product?.brand || '').toLocaleLowerCase('ru'))
    || bundledElectricalOverrideSlugs.has(String(product?.slug || ''))
  )
}
