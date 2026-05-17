import { catalogTree } from '../data/catalogTree.js'
import { categories } from '../data/categories.js'
import { PRODUCT_REQUIRED_FIELDS, PRODUCT_UNIT_VALUES, STOCK_STATUS_VALUES } from '../data/productSchema.js'
import { products } from '../data/products.js'

function findDuplicates(values) {
  return values.filter((value, index) => values.indexOf(value) !== index)
}

function flattenNodes(nodes, parentPath = []) {
  return nodes.flatMap((node) => {
    const path = [...parentPath, node.slug]
    return [{ node, path }, ...flattenNodes(node.children || [], path)]
  })
}

function findNodeByPath(pathSegments) {
  let nodes = catalogTree
  let currentNode = null

  for (const segment of pathSegments || []) {
    currentNode = nodes.find((node) => node.slug === segment)
    if (!currentNode) return null
    nodes = currentNode.children || []
  }

  return currentNode
}

function normalize(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

export function validateCatalogData() {
  const warnings = []
  const categoryMap = new Map(categories.map((category) => [category.slug, category]))
  const productIds = new Set(products.map((product) => product.id))
  const productSkus = products.map((product) => product.sku).filter(Boolean)
  const flatNodes = flattenNodes(catalogTree)
  const nodePaths = flatNodes.map(({ path }) => path.join('/'))
  const productBrands = new Set(products.map((product) => normalize(product.brand)).filter(Boolean))
  const requiredProductFields = PRODUCT_REQUIRED_FIELDS

  findDuplicates(products.map((product) => product.slug)).forEach((slug) => {
    warnings.push(`Duplicate product slug: ${slug}`)
  })

  findDuplicates(products.map((product) => product.id)).forEach((id) => {
    warnings.push(`Duplicate product id: ${id}`)
  })

  findDuplicates(productSkus).forEach((sku) => {
    warnings.push(`Duplicate product sku: ${sku}`)
  })

  findDuplicates(categories.map((category) => category.slug)).forEach((slug) => {
    warnings.push(`Duplicate legacy category slug: ${slug}`)
  })

  findDuplicates(nodePaths).forEach((path) => {
    warnings.push(`Duplicate catalog tree path: ${path}`)
  })

  flatNodes.forEach(({ node, path }) => {
    if (!node.titleKg || !node.slug || !node.descriptionKg) {
      warnings.push(`Catalog node "${path.join('/')}" has empty critical fields`)
    }

    if (productBrands.has(normalize(node.titleKg)) || productBrands.has(normalize(node.slug))) {
      warnings.push(`Catalog node looks like a brand category: ${path.join('/')}`)
    }
  })

  products.forEach((product) => {
    requiredProductFields.forEach((field) => {
      if (product[field] === undefined || product[field] === null || product[field] === '') {
        warnings.push(`${product.id}: critical field "${field}" is empty`)
      }
    })

    if (!Array.isArray(product.images) || !product.images.length) {
      warnings.push(`${product.id}: images are empty`)
    } else {
      product.images.forEach((image, index) => {
        const normalizedImage = typeof image === 'string' ? { src: image } : image

        if (!normalizedImage || typeof normalizedImage !== 'object') {
          warnings.push(`${product.id}: image ${index} has invalid shape`)
          return
        }

        if (!normalizedImage.src) {
          warnings.push(`${product.id}: image ${index} src is empty`)
        }

        if (!normalizedImage.alt) {
          warnings.push(`${product.id}: image ${index} alt is empty`)
        }

        if (normalizedImage.width !== undefined && !Number.isFinite(Number(normalizedImage.width))) {
          warnings.push(`${product.id}: image ${index} width is invalid`)
        }

        if (normalizedImage.height !== undefined && !Number.isFinite(Number(normalizedImage.height))) {
          warnings.push(`${product.id}: image ${index} height is invalid`)
        }
      })
    }

    if (!Number.isFinite(Number(product.price)) || Number(product.price) < 0) {
      warnings.push(`${product.id}: price must be a positive number`)
    }

    if (!STOCK_STATUS_VALUES.includes(product.stockStatus)) {
      warnings.push(`${product.id}: stockStatus "${product.stockStatus}" is not allowed`)
    }

    if (!PRODUCT_UNIT_VALUES.includes(product.unit)) {
      warnings.push(`${product.id}: unit "${product.unit}" is not in allowed values`)
    }

    if (!Array.isArray(product.faqKg)) {
      warnings.push(`${product.id}: faqKg must be an array`)
    }

    if (!product.specs || typeof product.specs !== 'object' || Array.isArray(product.specs)) {
      warnings.push(`${product.id}: specs must be an object`)
    }

    if (!Array.isArray(product.catalogPath) || !product.catalogPath.length) {
      warnings.push(`${product.id}: catalogPath is empty`)
    } else if (!findNodeByPath(product.catalogPath)) {
      warnings.push(`${product.id}: catalogPath "${product.catalogPath.join('/')}" not found`)
    }

    const category = categoryMap.get(product.categorySlug)
    if (!category) {
      warnings.push(`${product.id}: categorySlug "${product.categorySlug}" not found`)
    } else {
      const hasSubcategory = category.subcategories.some((subcategory) => subcategory.slug === product.subcategorySlug)
      if (!hasSubcategory) {
        warnings.push(`${product.id}: subcategorySlug "${product.subcategorySlug}" not found in "${product.categorySlug}"`)
      }
    }

    ;(product.relatedProductIds || []).forEach((relatedId) => {
      if (!productIds.has(relatedId)) {
        warnings.push(`${product.id}: related product "${relatedId}" not found`)
      }
    })
  })

  if (warnings.length) {
    console.warn('[StroyRayon catalog validation]', warnings)
  }

  return warnings
}
