import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { products } from '../src/data/products.js'
import { formatPrice } from '../src/utils/formatPrice.js'

const expectedByProduct = {
  'carkit-pvs-2-zhilnyi': [
    ['2×0,75 мм²', 35.75, 45.75],
    ['2×1,5 мм²', 63.25, 73.25],
    ['2×2,5 мм²', 95.7, 105.7],
    ['2×4 мм²', 149.6, 159.6],
    ['2×6 мм²', 215.6, 225.6],
  ],
  'pvs-provod-3x1-5': [
    ['3×0,75 мм²', 50.6, 60.6],
    ['3×1,5 мм²', 84.7, 94.7],
    ['3×2,5 мм²', 135.3, 145.3],
    ['3×4 мм²', 212.85, 222.85],
    ['3×6 мм²', 310.2, 320.2],
  ],
}

const expectedImageByProduct = {
  'carkit-pvs-2-zhilnyi': '/images/products/carkit-pvs-2-zhilnyi/main-ai-v2.webp',
  'pvs-provod-3x1-5': '/images/products/pvs-provod-3x1-5/main-ai-v2.webp',
}

test('CARKIT PVS first batch keeps the approved assortment and retail prices', () => {
  for (const [productId, expectedVariants] of Object.entries(expectedByProduct)) {
    const product = products.find((item) => item.id === productId)

    assert.ok(product, productId)
    assert.equal(product.brand, 'CARKIT')
    assert.equal(product.unit, 'метр')
    assert.equal(product.minOrder, '1 метр')
    assert.equal(product.stockStatus, 'in_stock')
    assert.equal(product.variants.length, expectedVariants.length)

    assert.deepEqual(
      product.variants.map((variant) => [variant.size, variant.price]),
      expectedVariants.map(([size, , retail]) => [size, retail]),
    )

    product.variants.forEach((variant, index) => {
      const [, wholesale, retail] = expectedVariants[index]
      assert.equal(retail, wholesale + 10)
      assert.equal(variant.stockStatus, 'in_stock')
      assert.equal(variant.unit, 'метр')
    })

    assert.equal(product.image.src, expectedImageByProduct[productId])
    assert.equal(existsSync(path.resolve('public', product.image.src.replace(/^\/+/, ''))), true)
    assert.equal(product.imageStatus, 'ready-generated')
    assert.equal(product.isPlaceholderImage, false)
  }
})

test('exact 1 and 2 mm² sections are excluded without excluding 1.5 and 2.5 mm²', () => {
  const sizes = products
    .filter((product) => Object.hasOwn(expectedByProduct, product.id))
    .flatMap((product) => product.variants.map((variant) => variant.size))

  assert.equal(sizes.some((size) => /×1 мм²$/.test(size)), false)
  assert.equal(sizes.some((size) => /×2 мм²$/.test(size)), false)
  assert.equal(sizes.some((size) => /×1,5 мм²$/.test(size)), true)
  assert.equal(sizes.some((size) => /×2,5 мм²$/.test(size)), true)
})

test('fractional cable prices are displayed without rounding to whole som', () => {
  assert.match(formatPrice(45.75), /45[,.]75/)
  assert.match(formatPrice(105.7), /105[,.]7/)
})
