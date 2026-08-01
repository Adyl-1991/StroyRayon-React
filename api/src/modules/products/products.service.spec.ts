import assert from 'node:assert/strict'
import test from 'node:test'
import { ProductStockStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { PUBLIC_PRODUCT_BRANDS, ProductsService } from './products.service'
import { CATALOG_BRAND_PROVENANCE } from '../../../../src/data/catalogBrandProvenance.js'

test('public API brand allowlist matches the storefront provenance registry', () => {
  assert.deepEqual(
    [...PUBLIC_PRODUCT_BRANDS].sort(),
    Object.keys(CATALOG_BRAND_PROVENANCE).sort(),
  )
})

test('public product list uses a lightweight card query and response', async () => {
  let receivedSelect: Record<string, unknown> | undefined
  const listProduct = {
    id: 'product-1',
    titleKg: 'Товар',
    titleRu: 'Товар',
    slug: 'product-1',
    sku: 'PRODUCT-1',
    catalogNode: { path: 'elektrika/kabel' },
    brand: { name: 'CHINT', slug: 'chint' },
    price: 100,
    oldPrice: null,
    currency: 'KGS',
    unit: 'даана',
    unitRu: 'шт.',
    stockStatus: ProductStockStatus.IN_STOCK,
    minOrder: '1 даана',
    minOrderRu: '1 шт.',
    shortDescriptionKg: 'Кыскача',
    shortDescriptionRu: 'Кратко',
    packageInfoKg: null,
    packageInfoRu: null,
    tags: ['hit'],
    isActive: true,
    images: [{
      id: 'image-1',
      src: '/image.webp',
      alt: 'Товар',
      width: 900,
      height: 675,
      type: 'MAIN',
      sortOrder: 0,
      storageDriver: 'legacy',
    }],
    variants: [
      {
        id: 'variant-out',
        titleKg: 'Жок',
        titleRu: 'Нет',
        sku: 'OUT',
        price: 90,
        currency: 'KGS',
        unit: 'даана',
        stockStatus: ProductStockStatus.OUT_OF_STOCK,
      },
      {
        id: 'variant-live',
        titleKg: 'Бар',
        titleRu: 'Есть',
        sku: 'LIVE',
        price: 100,
        currency: 'KGS',
        unit: 'даана',
        stockStatus: ProductStockStatus.IN_STOCK,
      },
    ],
  }
  const prisma = {
    product: {
      findMany: (args: { select?: Record<string, unknown> }) => {
        if (args.select?.images) {
          receivedSelect = args.select
          return Promise.resolve([listProduct])
        }
        return Promise.resolve([])
      },
      count: () => Promise.resolve(1),
      groupBy: () => Promise.resolve([]),
      aggregate: () => Promise.resolve({ _min: { price: 100 }, _max: { price: 100 } }),
    },
    brand: {
      findMany: () => Promise.resolve([]),
    },
  } as unknown as PrismaService

  const result = await new ProductsService(prisma).findMany({})
  const item = result.items[0]

  assert.equal((receivedSelect?.images as { take: number }).take, 1)
  assert.equal('documents' in (receivedSelect || {}), false)
  assert.equal('relatedFrom' in (receivedSelect || {}), false)
  assert.equal('stock' in (receivedSelect || {}), false)
  assert.equal('descriptionKg' in (receivedSelect || {}), false)
  assert.equal('specs' in (receivedSelect || {}), false)
  assert.equal(item.variants.length, 1)
  assert.equal(item.variants[0].sku, 'LIVE')
  assert.equal('descriptionKg' in item, false)
  assert.equal('documents' in item, false)
  assert.equal('relatedProducts' in item, false)
  assert.equal('specs' in item.variants[0], false)
})

test('public product detail excludes inactive products', async () => {
  let receivedWhere: unknown
  const prisma = {
    product: {
      findFirst: (args: { where: unknown }) => {
        receivedWhere = args.where
        return Promise.resolve(null)
      },
    },
  } as unknown as PrismaService

  const result = await new ProductsService(prisma).findBySlug('hidden-product')

  assert.equal(result, null)
  assert.deepEqual(receivedWhere, {
    slug: 'hidden-product',
    isActive: true,
    brand: { name: { in: [...PUBLIC_PRODUCT_BRANDS] } },
  })
})

test('public product detail loads the real brand for related products', async () => {
  let receivedInclude: Record<string, unknown> | undefined
  const prisma = {
    product: {
      findFirst: (args: { include: Record<string, unknown> }) => {
        receivedInclude = args.include
        return Promise.resolve(null)
      },
    },
  } as unknown as PrismaService

  await new ProductsService(prisma).findBySlug('test-product')

  assert.equal(
    (receivedInclude?.relatedFrom as {
      include: { relatedProduct: { include: { brand: boolean } } }
    }).include.relatedProduct.include.brand,
    true,
  )
  assert.equal('documents' in (receivedInclude || {}), true)
  assert.equal('stock' in (receivedInclude || {}), true)
  assert.equal('take' in (receivedInclude?.images as Record<string, unknown>), false)
  assert.equal('select' in (receivedInclude?.variants as Record<string, unknown>), false)
})
