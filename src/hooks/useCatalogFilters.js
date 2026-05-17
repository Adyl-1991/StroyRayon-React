import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { defaultCatalogFilters } from '../components/catalog/filterDefaults'

const arrayParams = {
  stock: 'stockStatuses',
  brand: 'brands',
  badge: 'tags',
  unit: 'units',
}

const fieldToParam = {
  minPrice: 'min',
  maxPrice: 'max',
  stockStatuses: 'stock',
  brands: 'brand',
  tags: 'badge',
  units: 'unit',
  sort: 'sort',
  page: 'page',
}

function parseArray(value) {
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []
}

function parseFilters(searchParams) {
  return {
    ...defaultCatalogFilters,
    minPrice: searchParams.get('min') || '',
    maxPrice: searchParams.get('max') || '',
    stockStatuses: parseArray(searchParams.get('stock')),
    brands: parseArray(searchParams.get('brand')),
    tags: parseArray(searchParams.get('badge')),
    units: parseArray(searchParams.get('unit')),
    sort: searchParams.get('sort') || defaultCatalogFilters.sort,
    page: Math.max(Number(searchParams.get('page') || defaultCatalogFilters.page), 1),
    limit: defaultCatalogFilters.limit,
  }
}

export function useCatalogFilters({ preserveParams = [] } = {}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFiltersState] = useState(() => parseFilters(searchParams))
  const preserveKey = preserveParams.join('|')
  const preservedValueRef = useRef(preserveParams.map((key) => searchParams.get(key) || '').join('|'))

  function setFilters(nextFilters) {
    setFiltersState((current) => {
      const resolved = typeof nextFilters === 'function' ? nextFilters(current) : nextFilters
      const shouldResetPage = Object.keys(resolved).some((key) => key !== 'page' && key !== 'limit' && resolved[key] !== current[key])
      return { ...resolved, page: shouldResetPage ? 1 : resolved.page || 1 }
    })
  }

  useEffect(() => {
    const nextPreservedValue = preserveParams.map((key) => searchParams.get(key) || '').join('|')
    if (nextPreservedValue !== preservedValueRef.current) {
      preservedValueRef.current = nextPreservedValue
      setFiltersState((current) => ({ ...current, page: 1 }))
    }
  }, [preserveParams, searchParams])

  useEffect(() => {
    const nextParams = new URLSearchParams()
    const preservedParams = preserveKey ? preserveKey.split('|') : []

    preservedParams.forEach((key) => {
      const value = searchParams.get(key)
      if (value) nextParams.set(key, value)
    })

    Object.entries(fieldToParam).forEach(([field, param]) => {
      const value = filters[field]
      const defaultValue = defaultCatalogFilters[field]
      if (Array.isArray(value) && value.length) nextParams.set(param, value.join(','))
      if (!Array.isArray(value) && value && value !== defaultValue) nextParams.set(param, value)
    })

    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true })
    }
  }, [filters, preserveKey, searchParams, setSearchParams])

  const activeQueryFields = useMemo(
    () => Object.keys(arrayParams).filter((param) => searchParams.has(param)),
    [searchParams],
  )

  return { filters, setFilters, activeQueryFields }
}
