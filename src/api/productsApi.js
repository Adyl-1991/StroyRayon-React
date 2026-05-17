import { apiGet } from './client'

const sortMap = {
  'price-asc': 'price_asc',
  'price-desc': 'price_desc',
  rating: 'rating_desc',
  sale: 'sale',
  new: 'new',
  popular: 'popular',
}

export function fetchProducts(queryParams = {}) {
  return apiGet('/products', {
    params: {
      q: queryParams.q || queryParams.search,
      min: queryParams.min || queryParams.minPrice,
      max: queryParams.max || queryParams.maxPrice,
      stock: queryParams.stock || queryParams.stockStatuses,
      brand: queryParams.brand || queryParams.brands,
      badge: queryParams.badge || queryParams.tags,
      unit: queryParams.unit || queryParams.units,
      sort: sortMap[queryParams.sort] || queryParams.sort,
      catalogPath: queryParams.catalogPath,
      page: queryParams.page,
      limit: queryParams.limit,
    },
  }).then(normalizeProductsResponse)
}

export function fetchProductBySlug(slug) {
  return apiGet(`/products/${encodeURIComponent(slug)}`)
}

export function fetchBrands() {
  return apiGet('/brands')
}

export function normalizeProductsResponse(response, fallback = {}) {
  if (Array.isArray(response)) {
    const page = Number(fallback.page || 1)
    const limit = Number(fallback.limit || response.length || 24)
    const total = response.length

    return {
      items: response,
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      filters: fallback.filters || null,
    }
  }

  const items = response?.items || []
  const page = Number(response?.page || fallback.page || 1)
  const limit = Number(response?.limit || fallback.limit || 24)
  const total = Number(response?.total ?? items.length)

  return {
    items,
    total,
    page,
    limit,
    totalPages: Number(response?.totalPages || Math.max(Math.ceil(total / limit), 1)),
    filters: response?.filters || fallback.filters || null,
  }
}
