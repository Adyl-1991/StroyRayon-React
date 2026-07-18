import { useEffect, useMemo, useState } from 'react'
import { fetchProductBySlug, fetchProducts } from '../api/productsApi'
import { USE_API } from '../config/api'
import { getFilteredProducts, getFilterOptions, getProductBySlug, normalizeProduct } from '../services/productService'
import { isBundledAlinexProduct, shouldUseBundledAlinex } from '../utils/alinexCatalogMode'

export function useProducts(filters) {
  const categorySlug = filters?.categorySlug
  const subcategorySlug = filters?.subcategorySlug
  const minPrice = filters?.minPrice
  const maxPrice = filters?.maxPrice
  const stockStatuses = filters?.stockStatuses
  const brands = filters?.brands
  const tags = filters?.tags
  const units = filters?.units
  const search = filters?.search
  const sort = filters?.sort
  const catalogNode = filters?.catalogNode
  const page = Number(filters?.page || 1)
  const limit = Number(filters?.limit || 24)

  const catalogPath = filters?.catalogNode?.path?.join('/')
  const preferBundledCatalog = useMemo(
    () => shouldUseBundledAlinex({
      catalogNode,
      categorySlug,
      subcategorySlug,
      minPrice,
      maxPrice,
      stockStatuses,
      brands,
      tags,
      units,
      search,
      sort,
    }),
    [
      brands,
      catalogNode,
      categorySlug,
      maxPrice,
      minPrice,
      search,
      sort,
      stockStatuses,
      subcategorySlug,
      tags,
      units,
    ],
  )
  const fallbackAllProducts = useMemo(
    () =>
      getFilteredProducts({
        catalogNode,
        categorySlug,
        subcategorySlug,
        minPrice,
        maxPrice,
        stockStatuses,
        brands,
        tags,
        units,
        search,
        sort,
      }),
    [
      brands,
      catalogNode,
      categorySlug,
      maxPrice,
      minPrice,
      search,
      sort,
      stockStatuses,
      subcategorySlug,
      tags,
      units,
    ],
  )
  const fallbackResult = useMemo(() => {
    const total = fallbackAllProducts.length
    const totalPages = Math.max(Math.ceil(total / limit), 1)
    const safePage = Math.min(Math.max(page, 1), totalPages)
    const start = (safePage - 1) * limit

    return {
      products: fallbackAllProducts.slice(start, start + limit),
      items: fallbackAllProducts.slice(start, start + limit),
      total,
      page: safePage,
      limit,
      totalPages,
      filterOptions: getFilterOptions({ catalogNode }),
      isLoading: false,
      error: null,
      isApiMode: false,
      isFallback: true,
    }
  }, [catalogNode, fallbackAllProducts, limit, page])
  const [state, setState] = useState({ ...fallbackResult, isLoading: USE_API, isApiMode: USE_API, isFallback: false })

  useEffect(() => {
    if (!USE_API || preferBundledCatalog) return

    let isActive = true

    fetchProducts({
      search,
      minPrice,
      maxPrice,
      stockStatuses,
      brands,
      tags,
      units,
      sort,
      catalogPath,
      page,
      limit,
    })
      .then((result) => {
        if (!isActive) return
        const products = (result.items || []).map(normalizeProduct)
        setState({
          products,
          items: products,
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
          filterOptions: normalizeFilterOptions(result.filters) || fallbackResult.filterOptions,
          isLoading: false,
          error: null,
          isApiMode: true,
          isFallback: false,
        })
      })
      .catch((error) => {
        if (!isActive) return
        console.warn('StroyRayon API products fallback:', error)
        setState({ ...fallbackResult, isLoading: false, error, isApiMode: true, isFallback: true })
      })

    return () => {
      isActive = false
    }
  }, [
    brands,
    catalogPath,
    fallbackResult,
    limit,
    maxPrice,
    minPrice,
    page,
    preferBundledCatalog,
    search,
    sort,
    stockStatuses,
    tags,
    units,
  ])

  return USE_API && !preferBundledCatalog ? state : fallbackResult
}

export function useProductBySlug(slug) {
  const fallbackProduct = useMemo(() => getProductBySlug(slug), [slug])
  const preferBundledProduct = isBundledAlinexProduct(fallbackProduct)
  const [state, setState] = useState({ product: fallbackProduct, isLoading: USE_API, error: null })

  useEffect(() => {
    if (!USE_API || !slug || preferBundledProduct) return

    let isActive = true

    fetchProductBySlug(slug)
      .then((product) => {
        if (!isActive) return
        setState({ product: product ? normalizeProduct(product) : null, isLoading: false, error: null })
      })
      .catch((error) => {
        if (!isActive) return
        console.warn('StroyRayon API product fallback:', error)
        setState({ product: fallbackProduct, isLoading: false, error })
      })

    return () => {
      isActive = false
    }
  }, [fallbackProduct, preferBundledProduct, slug])

  return USE_API && !preferBundledProduct ? state : { product: fallbackProduct, isLoading: false, error: null }
}

function normalizeFilterOptions(filters) {
  if (!filters) return null
  return {
    brands: filters.brands || [],
    units: filters.units || [],
    tags: filters.badges || filters.tags || [],
    stockStatuses: filters.stockStatuses || [],
    priceRange: filters.priceRange || null,
  }
}
