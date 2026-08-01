import { useEffect, useState } from 'react'
import { fetchProductBySlug, fetchProducts } from '../api/productsApi'
import { USE_API } from '../config/api'
import { isRetiredProductSlug } from '../data/retiredProductSlugs'
import { isPublishableCatalogProduct, isVerifiedCatalogBrand } from '../data/catalogBrandProvenance'
import { loadBundledProducts } from '../services/bundledCatalogLoader'
import {
  getFilteredProducts,
  getFilterOptions,
  getProductBySlug,
  normalizeProduct,
} from '../services/productService'

export function useProducts(filters = {}) {
  const categorySlug = filters.categorySlug
  const subcategorySlug = filters.subcategorySlug
  const minPrice = filters.minPrice
  const maxPrice = filters.maxPrice
  const stockStatuses = filters.stockStatuses
  const brands = filters.brands
  const tags = filters.tags
  const units = filters.units
  const search = filters.search
  const sort = filters.sort
  const catalogNode = filters.catalogNode
  const page = Number(filters.page || 1)
  const limit = Number(filters.limit || 24)
  const catalogPath = catalogNode?.path?.join('/')
  const isVirtualCatalogGroup = Boolean(catalogNode?.isVirtualCatalogGroup)
  const apiCatalogPath = catalogNode?.apiCatalogPath || catalogPath
  const [state, setState] = useState(() => emptyProductsState({ page, limit }))
  const requestKey = JSON.stringify([
    apiCatalogPath,
    brands,
    categorySlug,
    isVirtualCatalogGroup,
    limit,
    maxPrice,
    minPrice,
    page,
    search,
    sort,
    stockStatuses,
    subcategorySlug,
    tags,
    units,
  ])

  useEffect(() => {
    let isActive = true
    const localFilters = {
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
    }

    const loadBundledFallback = async (error = null) => {
      const bundledProducts = await loadBundledProducts()
      if (!isActive) return
      setState(buildBundledResult({
        sourceProducts: bundledProducts,
        filters: localFilters,
        page,
        limit,
        error,
        requestKey,
      }))
    }

    if (!USE_API) {
      loadBundledFallback().catch((error) => {
        if (!isActive) return
        setState({
          ...emptyProductsState({ page, limit }),
          requestKey,
          isLoading: false,
          error,
          isFallback: true,
        })
      })
      return () => {
        isActive = false
      }
    }

    fetchProducts(isVirtualCatalogGroup
      ? {
          catalogPath: apiCatalogPath,
          page: 1,
          limit: 200,
        }
      : {
          search,
          minPrice,
          maxPrice,
          stockStatuses,
          brands,
          tags,
          units,
          sort,
          catalogPath: apiCatalogPath,
          page,
          limit,
        })
      .then((result) => {
        if (!isActive) return
        const apiProducts = (result.items || [])
          .map(normalizeProduct)
          .filter((product) => !isRetiredProductSlug(product.slug) && isPublishableCatalogProduct(product))

        if (isVirtualCatalogGroup) {
          const scopedProducts = getFilteredProducts(localFilters, apiProducts)
          const total = scopedProducts.length
          const totalPages = Math.max(Math.ceil(total / limit), 1)
          const safePage = Math.min(Math.max(page, 1), totalPages)
          const start = (safePage - 1) * limit
          const pagedProducts = scopedProducts.slice(start, start + limit)

          setState({
            products: pagedProducts,
            items: pagedProducts,
            total,
            page: safePage,
            limit,
            totalPages,
            filterOptions: normalizeFilterOptions(result.filters)
              || getFilterOptions({ catalogNode, products: apiProducts }),
            isLoading: false,
            error: null,
            isApiMode: true,
            isFallback: false,
            requestKey,
          })
          return
        }

        const removedResultCount = Math.max(0, (result.items || []).length - apiProducts.length)
        const total = Math.max(0, Number(result.total || 0) - removedResultCount)
        const resultLimit = Number(result.limit || limit)
        setState({
          products: apiProducts,
          items: apiProducts,
          total,
          page: Number(result.page || page),
          limit: resultLimit,
          totalPages: Number(result.totalPages || Math.max(Math.ceil(total / resultLimit), 1)),
          filterOptions: normalizeFilterOptions(result.filters)
            || getFilterOptions({ catalogNode, products: apiProducts }),
          isLoading: false,
          error: null,
          isApiMode: true,
          isFallback: false,
          requestKey,
        })
      })
      .catch((error) => {
        console.warn('StroyRayon API products fallback:', error)
        return loadBundledFallback(error)
      })
      .catch((error) => {
        if (!isActive) return
        setState({
          ...emptyProductsState({ page, limit }),
          requestKey,
          isLoading: false,
          error,
          isApiMode: true,
          isFallback: true,
        })
      })

    return () => {
      isActive = false
    }
  }, [
    apiCatalogPath,
    brands,
    catalogNode,
    categorySlug,
    isVirtualCatalogGroup,
    limit,
    maxPrice,
    minPrice,
    page,
    search,
    sort,
    stockStatuses,
    subcategorySlug,
    tags,
    units,
    requestKey,
  ])

  return state.requestKey === requestKey
    ? state
    : {
        ...state,
        page,
        limit,
        isLoading: true,
        error: null,
        isApiMode: USE_API,
      }
}

export function useProductBySlug(slug) {
  const isRetiredProduct = isRetiredProductSlug(slug)
  const [state, setState] = useState({
    requestedSlug: slug,
    product: null,
    isLoading: !isRetiredProduct,
    error: null,
  })

  useEffect(() => {
    let isActive = true

    if (!slug || isRetiredProduct) {
      return () => {
        isActive = false
      }
    }

    const loadBundledFallback = async (error = null) => {
      const bundledProducts = await loadBundledProducts()
      if (!isActive) return
      setState({
        requestedSlug: slug,
        product: getProductBySlug(slug, bundledProducts) || null,
        isLoading: false,
        error,
      })
    }

    if (!USE_API) {
      loadBundledFallback().catch((error) => {
        if (!isActive) return
        setState({ requestedSlug: slug, product: null, isLoading: false, error })
      })
      return () => {
        isActive = false
      }
    }

    fetchProductBySlug(slug)
      .then((product) => {
        if (!product) return loadBundledFallback()
        if (!isActive) return
        const normalizedProduct = normalizeProduct(product)
        setState({
          requestedSlug: slug,
          product: isPublishableCatalogProduct(normalizedProduct) ? normalizedProduct : null,
          isLoading: false,
          error: null,
        })
      })
      .catch((error) => {
        console.warn('StroyRayon API product fallback:', error)
        return loadBundledFallback(error)
      })
      .catch((error) => {
        if (!isActive) return
        setState({ requestedSlug: slug, product: null, isLoading: false, error })
      })

    return () => {
      isActive = false
    }
  }, [isRetiredProduct, slug])

  if (isRetiredProduct) {
    return { product: null, isLoading: false, error: null }
  }

  return state.requestedSlug === slug
    ? state
    : { product: null, isLoading: true, error: null }
}

function emptyProductsState({ page, limit }) {
  return {
    products: [],
    items: [],
    total: 0,
    page,
    limit,
    totalPages: 1,
    filterOptions: getFilterOptions(),
    isLoading: true,
    error: null,
    isApiMode: USE_API,
    isFallback: false,
    requestKey: null,
  }
}

function buildBundledResult({ sourceProducts, filters, page, limit, error, requestKey }) {
  const filteredProducts = getFilteredProducts(filters, sourceProducts)
  const total = filteredProducts.length
  const totalPages = Math.max(Math.ceil(total / limit), 1)
  const safePage = Math.min(Math.max(page, 1), totalPages)
  const start = (safePage - 1) * limit
  const products = filteredProducts.slice(start, start + limit)

  return {
    products,
    items: products,
    total,
    page: safePage,
    limit,
    totalPages,
    filterOptions: getFilterOptions({
      catalogNode: filters.catalogNode,
      categorySlug: filters.categorySlug,
      subcategorySlug: filters.subcategorySlug,
      products: sourceProducts,
    }),
    isLoading: false,
    error,
    isApiMode: USE_API,
    isFallback: true,
    requestKey,
  }
}

function normalizeFilterOptions(filters) {
  if (!filters) return null
  return {
    brands: (filters.brands || []).filter((brand) => isVerifiedCatalogBrand(
      typeof brand === 'object' ? brand.label : brand,
    )),
    units: filters.units || [],
    tags: filters.badges || filters.tags || [],
    stockStatuses: filters.stockStatuses || [],
    priceRange: filters.priceRange || null,
  }
}
