import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import {
  electricalSupplierImportStats,
  electricalSupplierProducts,
} from '../src/data/electricalSupplierProducts.generated.js'
import { rootCategoryImages } from '../src/data/categoryAssets.js'
import { products } from '../src/data/products.js'
import {
  isBundledElectricalSupplierProduct,
  shouldUseBundledElectricalSupplier,
} from '../src/utils/electricalSupplierCatalogMode.js'

const expectedSupplierCounts = {
  CHINT: 442,
  PANASONIC: 130,
  VIKO: 124,
}

function importedVariants() {
  return electricalSupplierProducts.flatMap((product) => product.variants)
}

function variantBySku(sku) {
  return importedVariants().find((variant) => variant.sku === sku)
}

test('all reliably priced April 2026 electrical rows are published as variants', () => {
  assert.equal(electricalSupplierImportStats.sourceItems, 696)
  assert.equal(electricalSupplierImportStats.productCards, 90)
  assert.equal(electricalSupplierImportStats.variants, 696)
  assert.equal(electricalSupplierProducts.length, 90)
  assert.equal(importedVariants().length, 696)

  for (const [supplier, expectedCount] of Object.entries(expectedSupplierCounts)) {
    const supplierProducts = electricalSupplierProducts.filter((product) => product.brand === supplier)
    const variants = supplierProducts.flatMap((product) => product.variants)

    assert.equal(variants.length, expectedCount)
    assert.equal(electricalSupplierImportStats.bySupplier[supplier].variants, expectedCount)
  }
})

test('representative retail prices follow the approved market-balanced rules', () => {
  assert.equal(variantBySku('CHINT-APR26-B103')?.price, 100)
  assert.equal(variantBySku('CHINT-APR26-B277')?.price, 4680)
  assert.equal(variantBySku('PANASONIC-APR26-B3')?.price, 180)
  assert.equal(variantBySku('VIKO-APR26-B16')?.price, 150)
})

test('all imported supplier products and variants are in stock and have unique identifiers', () => {
  const publishedIds = new Set(products.map((product) => product.id))
  const productIds = electricalSupplierProducts.map((product) => product.id)
  const variantIds = importedVariants().map((variant) => variant.id)
  const variantSkus = importedVariants().map((variant) => variant.sku)

  assert.equal(new Set(productIds).size, productIds.length)
  assert.equal(new Set(variantIds).size, variantIds.length)
  assert.equal(new Set(variantSkus).size, variantSkus.length)

  for (const product of electricalSupplierProducts) {
    assert.equal(publishedIds.has(product.id), true, product.id)
    assert.equal(product.stockStatus, 'in_stock')
    assert.equal(product.price, Math.min(...product.variants.map((variant) => variant.price)))
    assert.ok(product.catalogPath.length >= 2)
    product.variants.forEach((variant) => assert.equal(variant.stockStatus, 'in_stock'))
  }
})

test('generated public catalog does not expose supplier wholesale fields', () => {
  const source = readFileSync(
    path.resolve('src/data/electricalSupplierProducts.generated.js'),
    'utf8',
  )

  assert.doesNotMatch(source, /"wholesale"\s*:/)
})

test('each cable subsection uses its own relevant generated image', () => {
  const expectedImages = {
    'vvgng-kabel': '/images/categories/generated/electrical/vvgng.webp',
    'pvs-provod': '/images/categories/generated/electrical/pvs.webp',
    'shvvp-provod': '/images/categories/generated/electrical/shvvp.webp',
    'sip-kabel': '/images/categories/generated/electrical/sip.webp',
    'internet-kabel': '/images/categories/generated/electrical/internet-cat5e.webp',
  }

  assert.equal(new Set(Object.values(expectedImages)).size, Object.keys(expectedImages).length)

  for (const [slug, imagePath] of Object.entries(expectedImages)) {
    assert.equal(rootCategoryImages[slug]?.src, imagePath)
    assert.equal(existsSync(path.resolve('public', imagePath.replace(/^\/+/, ''))), true)
  }
})

test('new supplier products stay available when the public API has not imported them yet', () => {
  const chintProduct = products.find((product) => product.slug === 'chint-breakers-nxb-63-1p')

  assert.equal(isBundledElectricalSupplierProduct(chintProduct), true)
  assert.equal(shouldUseBundledElectricalSupplier({ search: 'CHINT NXB-63' }), true)
  assert.equal(shouldUseBundledElectricalSupplier({ search: 'PANASONIC ARKEDİA' }), true)
  assert.equal(shouldUseBundledElectricalSupplier({ search: 'VIKO Carmen' }), true)
  assert.equal(shouldUseBundledElectricalSupplier({ search: 'несуществующий товар' }), false)
})
