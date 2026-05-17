import { useEffect, useMemo, useState } from 'react'
import { fetchCatalogTree } from '../api/catalogApi'
import { USE_API } from '../config/api'
import { catalogTree } from '../data/catalogTree'
import { findCatalogNodeByPath, normalizeCatalogTree } from '../services/productService'

const staticCatalogTree = normalizeCatalogTree(catalogTree)

export function useCatalogTree() {
  const [state, setState] = useState({ nodes: staticCatalogTree, isLoading: USE_API, error: null })

  useEffect(() => {
    if (!USE_API) return

    let isActive = true

    fetchCatalogTree()
      .then((nodes) => {
        if (!isActive) return
        setState({ nodes: normalizeCatalogTree(nodes || []), isLoading: false, error: null })
      })
      .catch((error) => {
        if (!isActive) return
        console.warn('StroyRayon API catalog fallback:', error)
        setState({ nodes: staticCatalogTree, isLoading: false, error })
      })

    return () => {
      isActive = false
    }
  }, [])

  return USE_API ? state : { nodes: staticCatalogTree, isLoading: false, error: null }
}

export function useCatalogNode(pathSegments = []) {
  const { nodes, isLoading, error } = useCatalogTree()
  const pathKey = pathSegments.join('/')
  const node = useMemo(() => findCatalogNodeByPath(pathKey.split('/').filter(Boolean), nodes), [nodes, pathKey])

  return { node, nodes, isLoading, error }
}
