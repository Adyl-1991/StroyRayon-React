import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { products } from '../src/data/products.js'
import {
  getDefaultVariant,
  getUnitLabel,
} from '../src/services/productService.js'

const productCardSource = await readFile(
  new URL('../src/components/catalog/ProductCard.jsx', import.meta.url),
  'utf8',
)
const productInfoSource = await readFile(
  new URL('../src/components/product/ProductInfo.jsx', import.meta.url),
  'utf8',
)
const productPageSource = await readFile(
  new URL('../src/pages/ProductPage.jsx', import.meta.url),
  'utf8',
)
const translationsSource = await readFile(
  new URL('../src/i18n/translations.js', import.meta.url),
  'utf8',
)
const globalCssSource = await readFile(
  new URL('../src/styles/global.css', import.meta.url),
  'utf8',
)

test('every product card uses the compact commercial layout', () => {
  for (const requiredCopy of [
    "t('product.sku')",
    "t('productCard.availabilityCheck')",
    "t('productCard.quantity')",
    "t('productCard.addToCart')",
    'formatPrice(activePrice)',
    'addToCart(product, quantity, activeVariant)',
  ]) {
    assert.match(productCardSource, new RegExp(requiredCopy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }

  for (const removedCopy of [
    "t('common.from')",
    "t('productCard.details')",
    "t('productCard.rating')",
    "t('productCard.minOrder')",
    "t('productCard.checkStock')",
    "t('productCard.chooseVariant')",
    'getProductShortDescription',
    'getLocalizedProductValue',
    'product.weight',
    'product.size',
    'product.pack',
    'product-card__badges',
    'product-card__commercial-meta',
  ]) {
    assert.doesNotMatch(productCardSource, new RegExp(removedCopy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  }
})

test('availability wording is consistent in both storefront languages', () => {
  assert.match(translationsSource, /availabilityCheck: 'Бар-жогун адистен тактаңыз'/)
  assert.match(translationsSource, /availabilityCheck: 'Наличие уточните у менеджера'/)
})

test('article and availability remain visible in narrow product cards', () => {
  assert.match(globalCssSource, /\.product-card__article,\s*\.product-card__availability/)
  assert.doesNotMatch(
    globalCssSource,
    /\.product-card__body > p:not\(\.microcopy\),\s*\.product-card__variants/,
  )
})

test('card units are concise and variants resolve to a concrete priced option', () => {
  assert.equal(getUnitLabel('метр', 'kg'), 'м')
  assert.equal(getUnitLabel('метр', 'ru'), 'м')
  assert.equal(getUnitLabel('даана', 'ru'), 'шт.')
  assert.equal(getUnitLabel('1 мешок', 'ru'), 'мешок')
  assert.equal(getUnitLabel('1 кап', 'kg'), 'кап')
  assert.equal(getUnitLabel('1 упаковка', 'ru'), 'упаковка')

  const product = {
    id: 'test-product',
    unit: 'даана',
    variants: [
      { id: 'unknown-price', size: '20 мм', price: 0, stockStatus: 'in_stock' },
      { id: 'priced', size: '25 мм', price: 75, stockStatus: 'in_stock' },
    ],
  }
  assert.equal(getDefaultVariant(product)?.id, 'priced')
})

test('no bundled product can render a repeated leading quantity in its price unit', () => {
  const units = products.flatMap((product) => [
    product.unit,
    ...(product.variants || []).map((variant) => variant.unit || product.unit),
  ]).filter(Boolean)

  for (const unit of units) {
    assert.doesNotMatch(getUnitLabel(unit, 'kg'), /^1\s/u)
    assert.doesNotMatch(getUnitLabel(unit, 'ru'), /^1\s/u)
  }
})

test('catalog cards use readable column counts and compact fixed image heights', () => {
  assert.match(globalCssSource, /\.product-card__image\s*\{[^}]*height: 156px;/s)
  assert.match(globalCssSource, /@media \(max-width: 480px\)\s*\{[^}]*\.product-grid\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\);/s)
  assert.match(globalCssSource, /@media \(min-width: 1180px\)\s*\{[\s\S]*?\.catalog-products-layout \.product-grid\s*\{[^}]*repeat\(3,/)
  assert.doesNotMatch(globalCssSource, /\.catalog-products-layout \.product-grid\s*\{[^}]*repeat\(4,/s)
})

test('product detail does not repeat summary copy and commercial facts in specifications', () => {
  assert.doesNotMatch(productInfoSource, /getProductShortDescription/)
  assert.doesNotMatch(productInfoSource, /product-info__description/)
  assert.doesNotMatch(productPageSource, /\[t\('product\.sku'\)\]:/)
  assert.doesNotMatch(productPageSource, /\[t\('product\.pack'\)\]:/)
  assert.doesNotMatch(productPageSource, /\[t\('product\.stock'\)\]:/)
})
