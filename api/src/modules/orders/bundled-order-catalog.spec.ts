import assert from 'node:assert/strict'
import test from 'node:test'
import { bundledOrderCatalogStats, findBundledOrderCatalogItem } from './bundled-order-catalog'

test('bundled order catalog resolves an EVER PLAST variant with an authoritative price', () => {
  const item = findBundledOrderCatalogItem({
    productId: 'ever-plast-ppr-pipe-pn20',
    variantId: 'ever-plast-ppr-pipe-pn20-1-20-mm',
    slug: 'ever-plast-ppr-pipe-pn20',
    sku: 'UPP.20.034.20.60.W',
  })

  assert.ok(item)
  assert.equal(item.source, 'ever-plast')
  assert.equal(item.price, 60)
  assert.equal(item.currency, 'KGS')
})

test('bundled order catalog rejects identifier or SKU tampering', () => {
  assert.equal(findBundledOrderCatalogItem({
    productId: 'ever-plast-ppr-pipe-pn20',
    variantId: 'ever-plast-ppr-pipe-pn20-1-20-mm',
    slug: 'ever-plast-ppr-pipe-pn20',
    sku: 'FAKE-SKU',
  }), null)

  assert.equal(findBundledOrderCatalogItem({
    productId: 'different-product',
    slug: 'ever-plast-ppr-pipe-pn20',
  }), null)
})

test('bundled order catalog contains both imported supplier catalogs', () => {
  assert.equal(bundledOrderCatalogStats.schemaVersion, 1)
  assert.ok(bundledOrderCatalogStats.productCount >= 80)
  assert.ok(bundledOrderCatalogStats.itemCount >= 300)
})
