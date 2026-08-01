import assert from 'node:assert/strict'
import test from 'node:test'
import {
  CATALOG_BRAND_PROVENANCE,
  UNVERIFIED_CATALOG_BRAND_ASSIGNMENTS,
  isVerifiedCatalogBrand,
} from '../src/data/catalogBrandProvenance.js'
import { products } from '../src/data/products.js'

const siteBrand = 'StroyRayon'
const removedTextBrands = UNVERIFIED_CATALOG_BRAND_ASSIGNMENTS.filter((brand) => brand !== siteBrand)

test('only brands with recorded provenance reach the storefront', () => {
  const publishedBrands = [...new Set(products.map((product) => product.brand).filter(Boolean))].sort()
  const approvedBrands = Object.keys(CATALOG_BRAND_PROVENANCE).sort()

  assert.deepEqual(publishedBrands, approvedBrands)
  assert.ok(products.every((product) => !product.brand || isVerifiedCatalogBrand(product.brand)))
})

test('unverified brand assignments are removed without changing product identity', () => {
  const unbrandedProducts = products.filter((product) => !product.brand)

  assert.equal(products.length, 337)
  assert.equal(unbrandedProducts.length, 156)
  assert.ok(products.every((product) => product.id && product.slug && product.sku))
  assert.ok(products.every((product) => !UNVERIFIED_CATALOG_BRAND_ASSIGNMENTS.some(
    (brand) => product.slug.toLocaleLowerCase('ru').includes(brand.toLocaleLowerCase('ru')),
  )))
})

test('removed labels do not remain in customer-facing product content', () => {
  const content = JSON.stringify(products)

  for (const brand of removedTextBrands) {
    assert.doesNotMatch(content, new RegExp(brand, 'iu'), `${brand} remains in storefront product data`)
  }
})

test('Safari remains approved while its supplier price is pending', () => {
  const safariProducts = products.filter((product) => product.brand === 'Safari')

  assert.equal(CATALOG_BRAND_PROVENANCE.Safari, 'owner_confirmed_price_pending')
  assert.equal(safariProducts.length, 3)
})
