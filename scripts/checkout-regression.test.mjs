import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { buildBundledOrderCatalog } from './generate-bundled-order-catalog.mjs'
import { products } from '../src/data/products.js'
import { buildCheckoutOrderPayload } from '../src/services/checkoutService.js'

const customer = {
  name: ' Test Buyer ',
  phone: ' +996 700 000 000 ',
  address: ' Bishkek ',
  comment: ' QA order ',
}

const items = [{
  productId: 'product-1',
  variantId: 'variant-1',
  slug: 'ppr-pipe',
  name: 'ППР түтүк',
  titleKg: 'ППР түтүк',
  titleRu: 'ППР труба',
  sku: 'PPR-20',
  price: '45',
  quantity: 2,
  unit: 'метр',
}]

test('checkout payload carries the selected locale and canonical product identifiers', () => {
  const payload = buildCheckoutOrderPayload({ customer, items, locale: 'ru' })

  assert.equal(payload.locale, 'ru')
  assert.equal(payload.customer.name, 'Test Buyer')
  assert.equal(payload.customer.phone, '+996 700 000 000')
  assert.equal(payload.items[0].productId, 'product-1')
  assert.equal(payload.items[0].variantId, 'variant-1')
  assert.equal(payload.items[0].slug, 'ppr-pipe')
  assert.equal(payload.items[0].title, 'ППР труба')
  assert.equal(payload.items[0].price, 45)
  assert.equal(payload.items[0].quantity, 2)
})

test('checkout payload defaults to Kyrgyz and omits an empty comment', () => {
  const payload = buildCheckoutOrderPayload({
    customer: { ...customer, comment: '   ' },
    items,
  })

  assert.equal(payload.locale, 'kg')
  assert.equal(payload.items[0].title, 'ППР түтүк')
  assert.equal(payload.comment, undefined)
})

test('server bundled order catalog stays synchronized with imported products', async () => {
  const generated = JSON.parse(await readFile(new URL('../api/src/modules/orders/bundled-order-catalog.generated.json', import.meta.url), 'utf8'))
  assert.deepEqual(generated, buildBundledOrderCatalog())

  const generatedProductIds = new Set(generated.items.map((item) => item.productId))
  const purchasableProducts = products.filter((product) =>
    product.isActive !== false
    && (
      Number(product.price) > 0
      || (product.variants || []).some(
        (variant) => variant.stockStatus !== 'out_of_stock' && Number(variant.price) > 0,
      )
    ),
  )

  assert.equal(generated.productCount, purchasableProducts.length)
  purchasableProducts.forEach((product) => assert.ok(generatedProductIds.has(product.id), product.id))
})

test('catalog synchronization runs before storefront and API builds and after supplier imports', async () => {
  const [rootPackage, apiPackage, alinexImporter, everPlastImporter] = await Promise.all([
    readFile(new URL('../package.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('../api/package.json', import.meta.url), 'utf8').then(JSON.parse),
    readFile(new URL('./import-alinex-catalog.mjs', import.meta.url), 'utf8'),
    readFile(new URL('./import-ever-plast-catalog.mjs', import.meta.url), 'utf8'),
  ])

  assert.equal(rootPackage.scripts.prebuild, 'node scripts/sync-catalog.mjs')
  assert.equal(apiPackage.scripts.prebuild, 'node ../scripts/sync-catalog.mjs')
  assert.match(alinexImporter, /syncCatalog\(\{ log: false \}\)/)
  assert.match(everPlastImporter, /syncCatalog\(\{ log: false \}\)/)
})
