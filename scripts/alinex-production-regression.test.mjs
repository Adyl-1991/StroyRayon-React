import assert from 'node:assert/strict'
import test from 'node:test'

import { alinexProducts } from '../src/data/alinexProducts.generated.js'
import { getFilteredProducts } from '../src/services/productService.js'
import { isBundledAlinexProduct, shouldUseBundledAlinex } from '../src/utils/alinexCatalogMode.js'

test('production search keeps all bundled AlinEX products when API data is stale', () => {
  const results = getFilteredProducts({ search: 'AlinEX' }, alinexProducts)
  assert.equal(results.length, 34)
  assert.equal(shouldUseBundledAlinex({ search: 'AlinEX' }), true)
})

test('unrelated API searches remain in API mode', () => {
  assert.equal(shouldUseBundledAlinex({ search: 'труба' }), false)
  assert.equal(shouldUseBundledAlinex({}), false)
})

test('direct AlinEX product pages prefer the bundled release data', () => {
  assert.equal(isBundledAlinexProduct(alinexProducts[0]), true)
  assert.equal(isBundledAlinexProduct({ brand: 'AquaLine' }), false)
})
