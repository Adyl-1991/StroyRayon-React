import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import sharp from 'sharp'

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
  assert.equal(electricalSupplierImportStats.productCards, 91)
  assert.equal(electricalSupplierImportStats.variants, 696)
  assert.equal(electricalSupplierProducts.length, 91)
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

test('CHINT liquid-level relay and NL1 pole groups are classified by their real characteristics', () => {
  assert.equal(products.some((product) => product.slug === 'chint-rcd-uzo'), false)
  assert.equal(products.some((product) => product.slug === 'chint-rcd-nl-63'), false)

  const liquidLevelRelay = products.find((product) => product.slug === 'chint-relays-njyw1')
  const nl1TwoPole = products.find((product) => product.slug === 'chint-rcd-nl1-63-2p')
  const nl1FourPole = products.find((product) => product.slug === 'chint-rcd-nl1-63-4p')
  const nl1Hundred = products.find((product) => product.slug === 'chint-rcd-nl1-100')

  assert.ok(liquidLevelRelay)
  assert.deepEqual(liquidLevelRelay.catalogPath, ['elektrika', 'avtomatika-korgoo', 'rele-kontrolya'])
  assert.match(liquidLevelRelay.variants[0].titleRu, /NJYW1-NL1 AC 220V\/380V/)

  assert.ok(nl1TwoPole)
  assert.ok(nl1FourPole)
  assert.ok(nl1Hundred)
  assert.equal(nl1TwoPole.variants.every((variant) => /\b2P\b/.test(variant.titleRu)), true)
  assert.equal(nl1FourPole.variants.every((variant) => /\b4P\b/.test(variant.titleRu)), true)
  assert.equal(nl1Hundred.variants.every((variant) => /\b4P\b/.test(variant.titleRu)), true)
})

test('heating cables and Safari mats prefer the current bundled product data', () => {
  const cableSlugs = ['kabeldik-teplyi-pol-10m', 'kabeldik-teplyi-pol-20m']
  const matSlugs = ['mat-teplyi-pol-1m2', 'mat-teplyi-pol-2m2', 'mat-teplyi-pol-3m2']

  for (const slug of cableSlugs) {
    const product = products.find((item) => item.slug === slug)
    assert.ok(product, slug)
    assert.match(product.titleRu, /^Греющий кабель \d+ м$/)
    assert.doesNotMatch(JSON.stringify(product), /Кабельный т[её]плый пол/i)
    assert.equal(isBundledElectricalSupplierProduct(product), true)
  }

  for (const slug of matSlugs) {
    const product = products.find((item) => item.slug === slug)
    assert.ok(product, slug)
    assert.match(product.titleRu, /^Нагревательный мат Safari \d+ м²$/)
    assert.equal(product.brand, 'Safari')
    assert.equal(product.specificationsRu?.['Страна производства'], 'Корея')
    assert.equal(isBundledElectricalSupplierProduct(product), true)
  }

  assert.equal(shouldUseBundledElectricalSupplier({ search: 'греющий кабель' }), true)
  assert.equal(shouldUseBundledElectricalSupplier({ search: 'Safari' }), true)
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

test('CHINT NXB-63 cards use the matching official pole-count images', async () => {
  for (const poles of [1, 2, 3, 4]) {
    const slug = `chint-breakers-nxb-63-${poles}p`
    const expectedImage = `/images/products/${slug}/main-official-v1.webp`
    const product = products.find((item) => item.slug === slug)
    const localPath = path.resolve('public', expectedImage.replace(/^\/+/, ''))

    assert.ok(product, slug)
    assert.equal(product.image.src, expectedImage)
    assert.equal(product.imageStatus, 'ready')
    assert.equal(product.isPlaceholderImage, false)
    assert.equal(existsSync(localPath), true)

    const metadata = await sharp(localPath).metadata()
    assert.equal(metadata.format, 'webp')
    assert.equal(metadata.width, 900)
    assert.equal(metadata.height, 675)
  }
})

test('next CHINT breaker batch uses exact official model-family images', async () => {
  const slugs = [
    'chint-breakers-nb1-1p',
    'chint-breakers-nb1-3p',
    'chint-breakers-nxb-125-1p',
    'chint-breakers-nxb-125-3p',
    'chint-breakers-nm1-250s',
    'chint-breakers-nm1-400s',
  ]

  for (const slug of slugs) {
    const expectedImage = `/images/products/${slug}/main-official-v1.webp`
    const product = products.find((item) => item.slug === slug)
    const localPath = path.resolve('public', expectedImage.replace(/^\/+/, ''))

    assert.ok(product, slug)
    assert.equal(product.image.src, expectedImage)
    assert.equal(product.imageStatus, 'ready')
    assert.equal(product.isPlaceholderImage, false)
    assert.equal(existsSync(localPath), true)

    const metadata = await sharp(localPath).metadata()
    assert.equal(metadata.format, 'webp')
    assert.equal(metadata.width, 900)
    assert.equal(metadata.height, 675)
  }
})

test('verified NXM and NM8N supplier photos match their exact catalog families', async () => {
  const slugs = [
    'chint-breakers-nxm-160s-3300',
    'chint-breakers-nxm-250s-3300',
    'chint-breakers-nxm-1000s-3300',
    'chint-breakers-nm8n-250s',
  ]

  for (const slug of slugs) {
    const expectedImage = `/images/products/${slug}/main-supplier-v1.webp`
    const product = products.find((item) => item.slug === slug)
    const localPath = path.resolve('public', expectedImage.replace(/^\/+/, ''))

    assert.ok(product, slug)
    assert.equal(product.image.src, expectedImage)
    assert.equal(product.imageStatus, 'ready')
    assert.equal(product.isPlaceholderImage, false)
    assert.equal(existsSync(localPath), true)

    const metadata = await sharp(localPath).metadata()
    assert.equal(metadata.format, 'webp')
    assert.equal(metadata.width, 900)
    assert.equal(metadata.height, 675)
  }
})

test('verified CHINT RCCB, RCBO and liquid-level relay photos match catalog characteristics', async () => {
  const slugs = [
    'chint-rcd-nl1-63-2p',
    'chint-rcd-nl1-63-4p',
    'chint-differential-nb2le',
    'chint-differential-nxble-63',
    'chint-differential-nxble-63y',
    'chint-relays-njyw1',
  ]

  for (const slug of slugs) {
    const expectedImage = `/images/products/${slug}/main-official-v1.webp`
    const product = products.find((item) => item.slug === slug)
    const localPath = path.resolve('public', expectedImage.replace(/^\/+/, ''))

    assert.ok(product, slug)
    assert.equal(product.image.src, expectedImage)
    assert.equal(product.imageStatus, 'ready')
    assert.equal(product.isPlaceholderImage, false)
    assert.equal(existsSync(localPath), true)

    const metadata = await sharp(localPath).metadata()
    assert.equal(metadata.format, 'webp')
    assert.equal(metadata.width, 900)
    assert.equal(metadata.height, 675)
  }
})
