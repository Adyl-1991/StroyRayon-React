import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'

import { roundRetail } from './import-ever-plast-catalog.mjs'
import { everPlastCatalogImportMeta, everPlastProducts } from '../src/data/everPlastProducts.generated.js'
import { isBundledEverPlastProduct, shouldUseBundledEverPlast } from '../src/utils/everPlastCatalogMode.js'

test('retail price applies 20 percent markup and rounds upward to whole KGS', () => {
  assert.equal(roundRetail(50), 60)
  assert.equal(roundRetail(83), 100)
  assert.equal(roundRetail(85), 102)
})

test('generated EVER PLAST catalog contains every eligible PDF row', () => {
  const variants = everPlastProducts.flatMap((product) => product.variants || [])

  assert.equal(everPlastProducts.length, 49)
  assert.equal(variants.length, 235)
  assert.equal(everPlastCatalogImportMeta.markupPercent, 20)
  assert.equal(everPlastCatalogImportMeta.categoryFallbackFamilyCount, 0)
  assert.equal(new Set(variants.map((variant) => variant.id)).size, variants.length)
  assert.equal(new Set(variants.map((variant) => variant.sku)).size, variants.length)
})

test('known PDF prices are exposed only as retail values', () => {
  const pprPipe = everPlastProducts.find((product) => product.slug === 'ever-plast-ppr-pipe-pn20')
  const sewerPipe = everPlastProducts.find((product) => product.slug === 'ever-plast-sewer-pipe-50-internal')

  assert.equal(pprPipe.variants.find((variant) => variant.size === '20 мм').price, 60)
  assert.equal(sewerPipe.variants.find((variant) => variant.size === '50 мм × 0,25 м').price, 66)
})

test('all public images are local and present', () => {
  for (const product of everPlastProducts) {
    assert.match(product.image.src, /^\/images\//)
    assert.equal(existsSync(path.resolve('public', product.image.src.replace(/^\/+/, ''))), true, product.slug)
    assert.notEqual(product.imageStatus, 'category-fallback')
  }
})

test('generated public module never contains purchase prices', async () => {
  const generatedSource = await readFile(path.resolve('src/data/everPlastProducts.generated.js'), 'utf8')
  assert.equal(generatedSource.includes('purchasePrice'), false)
  assert.equal(generatedSource.includes('purchase-price'), false)
})

test('production prefers the bundled EVER PLAST release over stale API data', () => {
  assert.equal(shouldUseBundledEverPlast({ search: 'EVER PLAST' }), true)
  assert.equal(shouldUseBundledEverPlast({ search: 'ППР труба' }), true)
  assert.equal(shouldUseBundledEverPlast({ search: 'цемент' }), false)
  assert.equal(isBundledEverPlastProduct(everPlastProducts[0]), true)
})
