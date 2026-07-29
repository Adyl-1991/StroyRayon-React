import { useEffect, useMemo, useState } from 'react'
import { fetchProductBySlug, fetchProducts } from '../api/productsApi'
import { USE_API } from '../config/api'
import { isRetiredProductSlug } from '../data/retiredProductSlugs'
import { getFilteredProducts, getFilterOptions, getProductBySlug, normalizeProduct } from '../services/productService'
import { isBundledAlinexProduct, shouldUseBundledAlinex } from '../utils/alinexCatalogMode'
import {
  isBundledElectricalSupplierProduct,
  shouldUseBundledElectricalSupplier,
} from '../utils/electricalSupplierCatalogMode'
import { isBundledEverPlastProduct, shouldUseBundledEverPlast } from '../utils/everPlastCatalogMode'

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
  const isVirtualCatalogGroup = Boolean(catalogNode?.isVirtualCatalogGroup)
  const apiCatalogPath = catalogNode?.apiCatalogPath || catalogPath
  const preferBundledCatalog = useMemo(
    () => {
      const catalogFilters = {
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
      return (
        shouldUseBundledAlinex(catalogFilters)
        || shouldUseBundledEverPlast(catalogFilters)
        || shouldUseBundledElectricalSupplier(catalogFilters)
      )
    },
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
          .filter((product) => !isRetiredProductSlug(product.slug))

        if (isVirtualCatalogGroup) {
          const scopedProducts = getFilteredProducts({
            catalogNode,
            minPrice,
            maxPrice,
            stockStatuses,
            brands,
            tags,
            units,
            search,
            sort,
          }, apiProducts)
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
            filterOptions: getFilterOptions({ catalogNode, products: apiProducts }),
            isLoading: false,
            error: null,
            isApiMode: true,
            isFallback: false,
          })
          return
        }

        const products = apiProducts
        const removedResultCount = Math.max(0, (result.items || []).length - products.length)
        const total = Math.max(0, Number(result.total || 0) - removedResultCount)
        const totalPages = Math.max(Math.ceil(total / Number(result.limit || limit)), 1)
        setState({
          products,
          items: products,
          total,
          page: result.page,
          limit: result.limit,
          totalPages,
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
    apiCatalogPath,
    brands,
    catalogPath,
    catalogNode,
    fallbackResult,
    isVirtualCatalogGroup,
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
  const isRetiredProduct = isRetiredProductSlug(slug)
  const fallbackProduct = useMemo(
    () => (isRetiredProduct ? undefined : getProductBySlug(slug)),
    [isRetiredProduct, slug],
  )
  const preferBundledProduct = (
    isBundledAlinexProduct(fallbackProduct)
    || isBundledEverPlastProduct(fallbackProduct)
    || isBundledElectricalSupplierProduct(fallbackProduct)
  )
  const [state, setState] = useState({
    requestedSlug: slug,
    product: fallbackProduct,
    isLoading: USE_API,
    error: null,
  })

  useEffect(() => {
    if (!USE_API || !slug || isRetiredProduct || preferBundledProduct) return

    let isActive = true

    fetchProductBySlug(slug)
      .then((product) => {
        if (!isActive) return
        setState({
          requestedSlug: slug,
          product: product ? normalizeProduct(product) : null,
          isLoading: false,
          error: null,
        })
      })
      .catch((error) => {
        if (!isActive) return
        console.warn('StroyRayon API product fallback:', error)
        setState({
          requestedSlug: slug,
          product: fallbackProduct,
          isLoading: false,
          error,
        })
      })

    return () => {
      isActive = false
    }
  }, [fallbackProduct, isRetiredProduct, preferBundledProduct, slug])

  if (isRetiredProduct) {
    return { product: null, isLoading: false, error: null }
  }

  if (!USE_API || preferBundledProduct) {
    return { product: fallbackProduct, isLoading: false, error: null }
  }

  return state.requestedSlug === slug
    ? state
    : { product: fallbackProduct, isLoading: true, error: null }
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
