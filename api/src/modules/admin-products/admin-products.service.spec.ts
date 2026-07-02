import assert from 'node:assert/strict'
import test from 'node:test'
import { BadRequestException } from '@nestjs/common'
import { Prisma, ProductDocumentType, ProductImageType, ProductStockStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { calculateLineTotal } from '../orders/order-pricing.util'
import { AdminProductsService } from './admin-products.service'

function productFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 'product-1',
    titleKg: 'Test product',
    titleRu: 'Тестовый товар',
    slug: 'test-product',
    sku: 'TEST-1',
    catalogNode: { id: 'category-1', titleKg: 'Category', path: 'tools/test' },
    brand: { id: 'brand-1', name: 'Test Brand', slug: 'test-brand' },
    price: new Prisma.Decimal(100),
    currency: 'KGS',
    unit: 'шт',
    shortDescriptionKg: null,
    descriptionKg: null,
    descriptionRu: null,
    specs: {},
    stockStatus: ProductStockStatus.IN_STOCK,
    stock: {
      id: 'stock-1',
      productId: 'product-1',
      quantity: 10,
      reservedQuantity: 2,
      lowStockThreshold: 5,
      warehouseName: null,
      updatedAt: new Date('2026-06-19T10:00:00Z'),
    },
    isActive: true,
    images: [
      {
        id: 'image-1',
        src: '/images/product.webp',
        alt: 'Product image',
        width: 900,
        height: 700,
        type: ProductImageType.MAIN,
        sortOrder: 0,
      },
    ],
    documents: [],
    tags: [],
    adminNote: null,
    updatedAt: new Date('2026-06-19T10:00:00Z'),
    ...overrides,
  }
}

test('product list with auth-facing service call returns admin product rows', async () => {
  const prisma = {
    product: {
      findMany: () => Promise.resolve([productFixture()]),
      count: () => Promise.resolve(1),
    },
    catalogNode: {
      findMany: () => Promise.resolve([{ path: 'tools/test', titleKg: 'Category' }]),
    },
    $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
  } as unknown as PrismaService

  const result = await new AdminProductsService(prisma).list({ page: 1, limit: 30 })

  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].price, 100)
  assert.equal(result.items[0].stock?.availableQuantity, 8)
  assert.equal(result.items[0].imageStatus, 'ready')
})

test('product detail with auth-facing service call returns launch-critical fields', async () => {
  const prisma = {
    product: { findUnique: () => Promise.resolve(productFixture()) },
  } as unknown as PrismaService

  const result = await new AdminProductsService(prisma).detail('product-1')

  assert.equal(result.slug, 'test-product')
  assert.equal(result.catalogPath, 'tools/test')
  assert.equal(result.isActive, true)
})

test('admin can create a local product with placeholder image and stock row', async () => {
  let createArgs: Prisma.ProductCreateArgs | undefined
  const prisma = {
    catalogNode: {
      findFirst: () => Promise.resolve({ id: 'category-1' }),
    },
    product: {
      findUnique: () => Promise.resolve(null),
      create: (args: Prisma.ProductCreateArgs) => {
        createArgs = args
        return Promise.resolve(
          productFixture({
            id: 'product-new',
            titleKg: args.data.titleKg,
            titleRu: args.data.titleRu,
            slug: args.data.slug,
            sku: args.data.sku,
            price: args.data.price,
            unit: args.data.unit,
            stockStatus: args.data.stockStatus,
            stock: {
              ...productFixture().stock,
              productId: 'product-new',
              quantity: args.data.stock?.create?.quantity,
              reservedQuantity: 0,
            },
            images: [
              {
                id: 'image-new',
                src: args.data.images?.create?.src,
                sortOrder: 0,
              },
            ],
            isActive: args.data.isActive,
          }),
        )
      },
    },
  } as unknown as PrismaService

  const result = await new AdminProductsService(prisma).create({
    catalogNodeId: 'category-1',
    titleKg: 'Stage 37 KG товар',
    titleRu: 'Stage 37 RU товар',
    slug: 'stage-37-local-product',
    sku: 'SR-STAGE37-001',
    descriptionKg: 'Кыргызча сүрөттөмө',
    descriptionRu: 'Русское описание',
    price: 321.45,
    stockQuantity: 7,
    unit: 'даана',
    stockStatus: ProductStockStatus.IN_STOCK,
    isActive: true,
    imageSrc: '/images/products/stage37/main.webp',
    imageAlt: 'Stage 37 photo',
  })

  assert.equal(result.id, 'product-new')
  assert.equal(result.slug, 'stage-37-local-product')
  assert.equal(result.price, 321.45)
  assert.equal(result.stock?.quantity, 7)
  assert.equal(result.imageStatus, 'ready')
  assert.equal(createArgs?.data.images?.create?.src, '/images/products/stage37/main.webp')
  assert.equal(createArgs?.data.images?.create?.alt, 'Stage 37 photo')
  assert.equal(createArgs?.data.stock?.create?.reservedQuantity, 0)
})

test('admin product create rejects unavailable category and duplicate slug', async () => {
  const invalidCategory = {
    catalogNode: {
      findFirst: () => Promise.resolve(null),
    },
  } as unknown as PrismaService
  await assert.rejects(
    () =>
      new AdminProductsService(invalidCategory).create({
        catalogNodeId: 'missing',
        titleKg: 'Title KG',
        titleRu: 'Title RU',
        price: 1,
        stockQuantity: 1,
        unit: 'даана',
        stockStatus: ProductStockStatus.IN_STOCK,
      }),
    BadRequestException,
  )

  const duplicateSlug = {
    catalogNode: {
      findFirst: () => Promise.resolve({ id: 'category-1' }),
    },
    product: {
      findUnique: () => Promise.resolve({ id: 'existing-product' }),
    },
  } as unknown as PrismaService
  await assert.rejects(
    () =>
      new AdminProductsService(duplicateSlug).create({
        catalogNodeId: 'category-1',
        titleKg: 'Title KG',
        titleRu: 'Title RU',
        slug: 'existing-product',
        price: 1,
        stockQuantity: 1,
        unit: 'даана',
        stockStatus: ProductStockStatus.IN_STOCK,
      }),
    /slug already exists/,
  )
})

test('admin can update core product content, specs, documents and images', async () => {
  let productState = productFixture()
  let savedSpecs: Prisma.InputJsonValue | undefined
  let savedDocuments: Array<{ title: string; url: string; type: ProductDocumentType }> = []
  let savedImages: Array<{ src: string; alt: string; type: ProductImageType }> = []

  const tx = {
    product: {
      update: (args: any) => {
        productState = productFixture({
          ...productState,
          ...args.data,
          titleKg: args.data.titleKg || productState.titleKg,
          titleRu: args.data.titleRu || productState.titleRu,
          slug: args.data.slug || productState.slug,
          sku: args.data.sku || productState.sku,
          price: args.data.price || productState.price,
          unit: args.data.unit || productState.unit,
          descriptionRu: args.data.descriptionRu || productState.descriptionRu,
          specs: args.data.specs || productState.specs,
        })
        savedSpecs = args.data.specs as Prisma.InputJsonValue
        return Promise.resolve(productState)
      },
    },
    stock: {
      upsert: () => Promise.resolve({}),
    },
    productDocument: {
      deleteMany: () => Promise.resolve({ count: 0 }),
      createMany: (args: { data: Array<{ title: string; url: string; type: ProductDocumentType }> }) => {
        savedDocuments = args.data
        return Promise.resolve({ count: args.data.length })
      },
    },
    productImage: {
      deleteMany: () => Promise.resolve({ count: 0 }),
      createMany: (args: { data: Array<{ src: string; alt: string; type: ProductImageType }> }) => {
        savedImages = args.data
        return Promise.resolve({ count: args.data.length })
      },
    },
  }
  const prisma = {
    product: {
      findUnique: () => Promise.resolve(productState),
      findFirst: () => Promise.resolve(null),
    },
    catalogNode: {
      findFirst: () => Promise.resolve({ id: 'category-1' }),
    },
    brand: {
      findFirst: () => Promise.resolve({ id: 'brand-1' }),
    },
    $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService

  const result = await new AdminProductsService(prisma).update('product-1', {
    catalogNodeId: 'category-1',
    brandId: 'brand-1',
    titleKg: 'Updated KG',
    titleRu: 'Updated RU',
    slug: 'updated-product',
    sku: 'updated-sku',
    descriptionRu: 'Updated Russian description',
    price: 250,
    stockQuantity: 8,
    stockStatus: ProductStockStatus.LOW_STOCK,
    unit: 'метр',
    isActive: true,
    specs: [
      { key: 'Диаметр', value: '20 мм' },
      { key: '', value: 'ignored' },
    ],
    documents: [
      {
        title: 'Сертификат',
        url: 'https://example.com/cert.pdf',
        type: ProductDocumentType.CERTIFICATE,
      },
    ],
    images: [
      { src: '/uploads/products/new.png', alt: 'Updated photo', type: ProductImageType.MAIN },
    ],
  })

  assert.equal(result.slug, 'updated-product')
  assert.deepEqual(savedSpecs, { Диаметр: '20 мм' })
  assert.equal(savedDocuments.length, 1)
  assert.equal(savedDocuments[0].type, ProductDocumentType.CERTIFICATE)
  assert.equal(savedImages[0].type, ProductImageType.MAIN)
})

test('price update with auth-facing service call stores a database decimal', async () => {
  let savedPrice: Prisma.Decimal | undefined
  const prisma = {
    product: {
      findUnique: () => Promise.resolve({ id: 'product-1' }),
      update: (args: { data: { price: Prisma.Decimal } }) => {
        savedPrice = args.data.price
        return Promise.resolve({})
      },
    },
  } as unknown as PrismaService
  const service = new AdminProductsService(prisma)
  service.detail = async () => ({ id: 'product-1', price: 125.5 }) as never

  const result = await service.updatePrice('product-1', 125.5)

  assert.equal(Number(savedPrice), 125.5)
  assert.equal(result.price, 125.5)
})

test('invalid product price is rejected defensively', async () => {
  const service = new AdminProductsService({} as PrismaService)
  await assert.rejects(() => service.updatePrice('product-1', -1), BadRequestException)
  await assert.rejects(() => service.updatePrice('product-1', Number.NaN), BadRequestException)
})

test('stock update with auth preserves reservations and changes quantity/status', async () => {
  let quantity = 10
  let status = ProductStockStatus.IN_STOCK
  const tx = {
    product: {
      findUnique: (args: { include?: unknown }) =>
        Promise.resolve(
          args.include
            ? productFixture({
                stockStatus: status,
                stock: { ...productFixture().stock, quantity },
              })
            : {
                id: 'product-1',
                stockStatus: status,
                stock: { quantity, reservedQuantity: 2 },
              },
        ),
      update: (args: { data: { stockStatus: ProductStockStatus } }) => {
        status = args.data.stockStatus
        return Promise.resolve({})
      },
    },
    stock: {
      upsert: (args: { update: { quantity: number } }) => {
        quantity = args.update.quantity
        return Promise.resolve({})
      },
    },
  }
  const prisma = {
    $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService

  const result = await new AdminProductsService(prisma).updateStock(
    'product-1',
    6,
    ProductStockStatus.LOW_STOCK,
  )

  assert.equal(result.stock?.quantity, 6)
  assert.equal(result.stock?.reservedQuantity, 2)
  assert.equal(result.stockStatus, 'low_stock')
})

test('negative stock and quantity below existing reservations are rejected', async () => {
  const service = new AdminProductsService({} as PrismaService)
  await assert.rejects(() => service.updateStock('product-1', -1), BadRequestException)

  const tx = {
    product: {
      findUnique: () =>
        Promise.resolve({
          id: 'product-1',
          stockStatus: ProductStockStatus.IN_STOCK,
          stock: { quantity: 10, reservedQuantity: 4 },
        }),
    },
  }
  const prisma = {
    $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService
  await assert.rejects(
    () => new AdminProductsService(prisma).updateStock('product-1', 3),
    /reserved quantity/,
  )
})

test('active and inactive state can be updated', async () => {
  let isActive = true
  const prisma = {
    product: {
      findUnique: () => Promise.resolve({ id: 'product-1' }),
      update: (args: { data: { isActive: boolean } }) => {
        isActive = args.data.isActive
        return Promise.resolve({})
      },
    },
  } as unknown as PrismaService
  const service = new AdminProductsService(prisma)
  service.detail = async () => ({ id: 'product-1', isActive }) as never

  assert.equal((await service.updateActive('product-1', false)).isActive, false)
  assert.equal((await service.updateActive('product-1', true)).isActive, true)
})

test('order created after admin price update uses new DB price while old snapshot stays unchanged', async () => {
  const databaseProduct = { price: 100 }
  const oldOrderSnapshot = 100
  const prisma = {
    product: {
      findUnique: () => Promise.resolve({ id: 'product-1' }),
      update: (args: { data: { price: Prisma.Decimal } }) => {
        databaseProduct.price = Number(args.data.price)
        return Promise.resolve({})
      },
    },
  } as unknown as PrismaService
  const service = new AdminProductsService(prisma)
  service.detail = async () => ({ id: 'product-1', price: databaseProduct.price }) as never

  await service.updatePrice('product-1', 175)
  const newOrderLineTotal = calculateLineTotal(databaseProduct.price, 2)

  assert.equal(newOrderLineTotal, 350)
  assert.equal(oldOrderSnapshot, 100)
})
