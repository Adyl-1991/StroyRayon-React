import assert from 'node:assert/strict'
import test from 'node:test'
import { products } from '../src/data/products.js'
import { retiredProductSlugs } from '../src/data/retiredProductSlugs.js'
import { getSitemapRoutes } from '../src/scripts/generateSitemap.js'
import { removeJsonLd, upsertJsonLd } from '../src/utils/jsonLdDom.js'
import {
  getProductStructuredDataImages,
  normalizePublicProductImageUrl,
} from '../src/utils/productImageSeo.js'
import { buildProductStructuredData } from '../src/utils/seoUtils.js'
import { mergePublicProductImageOverride } from './public-product-image-overrides.mjs'

function product(overrides = {}) {
  return {
    id: 'test-product',
    titleKg: 'Сыноо товар',
    titleRu: 'Тестовый товар',
    slug: 'test-product',
    sku: 'TEST-1',
    price: 100,
    currency: 'KGS',
    stockStatus: 'in_stock',
    isActive: true,
    images: [],
    ...overrides,
  }
}

function image(src, overrides = {}) {
  return {
    src,
    alt: 'Сыноо товар',
    width: 900,
    height: 675,
    type: 'MAIN',
    ...overrides,
  }
}

test('Product schema emits one valid image as an HTTPS array', () => {
  const schema = buildProductStructuredData(product({
    images: [image('/images/products/test-product/main.webp')],
  }))

  assert.deepEqual(schema.image, ['https://www.stroyrayon.kg/images/products/test-product/main.webp'])
})

test('Product schema preserves primary-first gallery order', () => {
  const schema = buildProductStructuredData(product({
    images: [
      image('/images/products/test-product/main.webp'),
      image('/images/products/test-product/gallery-1.webp', { type: 'GALLERY' }),
    ],
  }))

  assert.deepEqual(schema.image, [
    'https://www.stroyrayon.kg/images/products/test-product/main.webp',
    'https://www.stroyrayon.kg/images/products/test-product/gallery-1.webp',
  ])
})

test('duplicate Product image URLs are removed', () => {
  const duplicate = '/images/products/test-product/main.webp'
  assert.deepEqual(
    getProductStructuredDataImages(product({ images: [image(duplicate), image(duplicate)] })),
    ['https://www.stroyrayon.kg/images/products/test-product/main.webp'],
  )
})

test('relative product image paths resolve against the canonical storefront', () => {
  assert.equal(
    normalizePublicProductImageUrl('images/products/test-product/main.webp'),
    'https://www.stroyrayon.kg/images/products/test-product/main.webp',
  )
})

test('absolute public R2 image URLs remain unchanged', () => {
  const r2Url = 'https://pub-example.r2.dev/products/test-product.webp'
  const schema = buildProductStructuredData(product({ images: [image(r2Url, { storageDriver: 's3' })] }))
  assert.deepEqual(schema.image, [r2Url])
})

test('public API R2 override upgrades any shared bundled product without a slug-specific workaround', () => {
  const bundledProduct = product({ slug: 'bundled-product-with-new-r2-image' })
  const r2Url = 'https://pub-example.r2.dev/products/bundled-product-real.webp'
  const merged = mergePublicProductImageOverride(
    bundledProduct,
    new Map([[bundledProduct.slug, [image(r2Url, { storageDriver: 's3' })]]]),
  )
  const schema = buildProductStructuredData(merged)

  assert.equal(merged.isPlaceholderImage, false)
  assert.deepEqual(schema.image, [r2Url])
})

test('retired products are absent from the storefront catalog and sitemap', () => {
  const sitemapRoutes = new Set(getSitemapRoutes())

  retiredProductSlugs.forEach((slug) => {
    assert.equal(products.some((item) => item.slug === slug), false)
    assert.equal(sitemapRoutes.has(`/product/${slug}`), false)
  })
})

test('product without an image omits the image property', () => {
  const schema = buildProductStructuredData(product())
  assert.equal(Object.hasOwn(schema, 'image'), false)
})

test('empty and malformed image values are never emitted', () => {
  const schema = buildProductStructuredData(product({
    images: [
      image(''),
      image('https://[invalid'),
      image('http://localhost:4000/uploads/product.webp'),
      image('https://account.r2.cloudflarestorage.com/bucket/product.webp'),
    ],
  }))
  assert.equal(Object.hasOwn(schema, 'image'), false)
})

test('generic placeholders and SVG illustrations are not treated as merchant images', () => {
  const schema = buildProductStructuredData(product({
    images: [
      image('/images/placeholders/product-building-placeholder.svg', { type: 'placeholder' }),
      image('/images/products/test-product/main.svg', { type: 'product' }),
    ],
  }))
  assert.equal(Object.hasOwn(schema, 'image'), false)
})

test('inactive products do not emit Product structured data', () => {
  assert.equal(buildProductStructuredData(product({ isActive: false })), null)
})

test('Kyrgyz/Russian language switch changes product copy but keeps the same image', () => {
  const target = product({ images: [image('/images/products/test-product/main.webp')] })
  const kg = buildProductStructuredData(target, 'kg')
  const ru = buildProductStructuredData(target, 'ru')

  assert.equal(kg.name, 'Сыноо товар')
  assert.equal(ru.name, 'Тестовый товар')
  assert.deepEqual(kg.image, ru.image)
})

function installFakeDocument() {
  const elements = new Map()
  const fakeDocument = {
    head: {
      appendChild(element) {
        elements.set(element.id, element)
      },
    },
    createElement() {
      return {
        id: '',
        type: '',
        textContent: '',
        remove() {
          elements.delete(this.id)
        },
      }
    },
    getElementById(id) {
      return elements.get(id) || null
    },
  }
  globalThis.document = fakeDocument
  return {
    elements,
    cleanup() {
      delete globalThis.document
    },
  }
}

test('client-side navigation replaces the previous Product JSON-LD without duplicates', () => {
  const dom = installFakeDocument()
  try {
    const first = buildProductStructuredData(product({ slug: 'first-product' }))
    const second = buildProductStructuredData(product({ slug: 'second-product' }))

    upsertJsonLd('stroyrayon-jsonld', first)
    upsertJsonLd('stroyrayon-jsonld', second)

    assert.equal(dom.elements.size, 1)
    assert.equal(
      JSON.parse(dom.elements.get('stroyrayon-jsonld').textContent).url,
      'https://www.stroyrayon.kg/product/second-product',
    )
  } finally {
    dom.cleanup()
  }
})

test('structured-data cleanup removes only the schema owned by the leaving route', () => {
  const dom = installFakeDocument()
  try {
    const first = buildProductStructuredData(product({ slug: 'first-product' }))
    const second = buildProductStructuredData(product({ slug: 'second-product' }))

    upsertJsonLd('stroyrayon-jsonld', first)
    upsertJsonLd('stroyrayon-jsonld', second)
    removeJsonLd('stroyrayon-jsonld', first)
    assert.equal(dom.elements.size, 1)

    removeJsonLd('stroyrayon-jsonld', second)
    assert.equal(dom.elements.size, 0)
  } finally {
    dom.cleanup()
  }
})
