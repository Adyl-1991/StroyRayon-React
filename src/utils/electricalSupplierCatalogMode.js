import { electricalSupplierProducts } from '../data/electricalSupplierProducts.generated.js'
import { getFilteredProducts } from '../services/productService.js'

const bundledElectricalBrands = new Set(['chint', 'panasonic', 'viko'])

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

  return hasCatalogScope && getFilteredProducts(filters, electricalSupplierProducts).length > 0
}

export function isBundledElectricalSupplierProduct(product) {
  return bundledElectricalBrands.has(String(product?.brand || '').toLocaleLowerCase('ru'))
}
