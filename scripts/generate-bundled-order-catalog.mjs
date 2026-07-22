import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { products } from '../src/data/products.js'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputFile = path.join(projectRoot, 'api', 'src', 'modules', 'orders', 'bundled-order-catalog.generated.json')

function compact(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function makeEntry(product, variant, source) {
  return {
    source,
    productId: product.id,
    variantId: variant?.id || null,
    slug: product.slug,
    productSku: compact(product.sku) || product.id,
    variantSku: compact(variant?.sku),
    titleKg: compact(product.titleKg || product.name) || product.slug,
    titleRu: compact(product.titleRu || product.titleKg || product.name) || product.slug,
    variantTitleKg: compact(variant?.titleKg || variant?.size),
    variantTitleRu: compact(variant?.titleRu || variant?.titleKg || variant?.size),
    price: Number(variant?.price ?? product.price ?? 0),
    currency: compact(variant?.currency || product.currency) || 'KGS',
    unit: compact(variant?.unit || product.unit) || 'шт',
  }
}

function getProductSource(product) {
  if (product.id?.startsWith('ever-plast-') || product.slug?.startsWith('ever-plast-')) return 'ever-plast'
  if (product.id?.startsWith('alinex-') || product.slug?.startsWith('alinex-') || product.brand === 'AlinEX') return 'alinex'
  return 'storefront'
}

function collectEntries(productList) {
  return productList
    .filter((product) => product?.isActive !== false && product?.id && product?.slug)
    .flatMap((product) => [
      makeEntry(product, null, getProductSource(product)),
      ...(product.variants || [])
        .filter((variant) => variant?.id && variant?.stockStatus !== 'out_of_stock')
        .map((variant) => makeEntry(product, variant, getProductSource(product))),
    ])
    .filter((entry) => Number.isFinite(entry.price) && entry.price > 0)
}

export function buildBundledOrderCatalog() {
  const items = collectEntries(products)

  const identityKeys = new Set()
  for (const item of items) {
    const key = `${item.productId}:${item.variantId || 'base'}`
    if (identityKeys.has(key)) throw new Error(`Duplicate bundled order item: ${key}`)
    identityKeys.add(key)
  }

  return {
    schemaVersion: 1,
    productCount: new Set(items.map((item) => item.productId)).size,
    itemCount: items.length,
    items,
  }
}

export async function writeBundledOrderCatalog() {
  const catalog = buildBundledOrderCatalog()
  await mkdir(path.dirname(outputFile), { recursive: true })
  await writeFile(outputFile, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
  return { outputFile, ...catalog }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
if (isMain) {
  writeBundledOrderCatalog()
    .then(({ outputFile: writtenFile, productCount, itemCount }) => {
      console.log(`Bundled order catalog: ${productCount} products, ${itemCount} purchasable records.`)
      console.log(`Generated data: ${writtenFile}`)
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}
