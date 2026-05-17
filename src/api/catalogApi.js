import { apiGet } from './client'

export function fetchCatalogTree() {
  return apiGet('/catalog/tree')
}

export function fetchCatalogNode(path) {
  return apiGet('/catalog/node', { params: { path } })
}
