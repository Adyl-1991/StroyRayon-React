import assert from 'node:assert/strict'
import test from 'node:test'
import { BadRequestException } from '@nestjs/common'
import { Prisma, ProductDocumentType, ProductImageType, ProductStockStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { calculateLineTotal } from '../orders/order-pricing.util'
import { AdminIdentity } from '../auth/admin-permissions'
import { AdminProductsService } from './admin-products.service'

const ownerAdmin: AdminIdentity = { id: 'admin-owner', email: 'owner@test.local', role: 'OWNER' }
const contentAdmin: AdminIdentity = { id: 'admin-content', email: 'content@test.local', role: 'CONTENT' }
const managerAdmin: AdminIdentity = { id: 'admin-manager', email: 'manager@test.local', role: 'MANAGER' }
const viewerAdmin: AdminIdentity = { id: 'admin-viewer', email: 'viewer@test.local', role: 'VIEWER' }

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
    seoTitleKg: null,
    seoDescriptionKg: null,
    seoTitleRu: null,
    seoDescriptionRu: null,
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
        storageKey: null,
        storageDriver: 'legacy',
        originalName: null,
        size: null,
        createdAt: new Date('2026-06-19T10:00:00Z'),
        updatedAt: new Date('2026-06-19T10:00:00Z'),
      },
    ],
    documents: [],
    variants: [],
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
  assert.equal(typeof result.items[0].completenessScore, 'number')
})

test('product list can filter by computed quality flags', async () => {
  const prisma = {
    product: {
      findMany: () => Promise.resolve([
        productFixture({ id: 'complete', seoTitleKg: 'KG', seoDescriptionKg: 'KG desc', seoTitleRu: 'RU', seoDescriptionRu: 'RU desc' }),
        productFixture({ id: 'missing-seo', slug: 'missing-seo' }),
      ]),
    },
    catalogNode: {
      findMany: () => Promise.resolve([{ path: 'tools/test', titleKg: 'Category' }]),
    },
    $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
  } as unknown as PrismaService

  const result = await new AdminProductsService(prisma).list({ page: 1, limit: 30, quality: 'missing_seo' })

  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].slug, 'missing-seo')
  assert.equal(result.items[0].qualityFlags.some((flag) => flag.code === 'missing_seo'), true)
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

test('product draft autosave stores changes without updating the published product', async () => {
  const updatedAt = new Date('2026-07-12T10:00:00Z')
  let savedPayload: Prisma.InputJsonValue | undefined
  const prisma = {
    product: {
      findUnique: () => Promise.resolve({ id: 'product-1', updatedAt }),
    },
    productDraft: {
      findUnique: () => Promise.resolve(null),
      create: (args: { data: { payload: Prisma.InputJsonValue } }) => {
        savedPayload = args.data.payload
        return Promise.resolve({
          productId: 'product-1',
          payload: args.data.payload,
          baseProductUpdatedAt: updatedAt,
          version: 1,
          createdAt: updatedAt,
          updatedAt,
          updatedBy: { id: ownerAdmin.id, name: 'Owner', email: ownerAdmin.email },
        })
      },
    },
  } as unknown as PrismaService

  const result = await new AdminProductsService(prisma).saveDraft(
    'product-1',
    { payload: { titleKg: 'Draft title', price: '150.50' }, expectedVersion: 0 },
    ownerAdmin,
  )

  assert.deepEqual(savedPayload, { titleKg: 'Draft title', price: '150.50' })
  assert.equal(result.version, 1)
  assert.equal(result.payload.titleKg, 'Draft title')
})

test('publishing a product draft validates, updates the product and removes the draft', async () => {
  const updatedAt = new Date('2026-07-12T10:00:00Z')
  let clearsDraftAtomically = false
  const prisma = {
    product: {
      findUnique: () => Promise.resolve({ id: 'product-1', updatedAt }),
    },
    productDraft: {
      findUnique: () => Promise.resolve({
        productId: 'product-1',
        payload: { titleKg: 'Published draft', price: '175.25', stockQuantity: '9' },
        baseProductUpdatedAt: updatedAt,
      }),
    },
  } as unknown as PrismaService
  const service = new AdminProductsService(prisma)
  let publishedDto: Record<string, unknown> | undefined
  service.update = async (_id, dto, _admin, clearDraft) => {
    publishedDto = dto as unknown as Record<string, unknown>
    clearsDraftAtomically = clearDraft
    return { id: 'product-1', title: dto.titleKg, price: dto.price } as never
  }

  const result = await service.publishDraft('product-1', ownerAdmin)

  assert.equal(publishedDto?.titleKg, 'Published draft')
  assert.equal(publishedDto?.price, 175.25)
  assert.equal(publishedDto?.stockQuantity, 9)
  assert.equal(clearsDraftAtomically, true)
  assert.equal(result.price, 175.25)
})

test('publishing rejects a draft based on an outdated product version', async () => {
  const prisma = {
    product: {
      findUnique: () => Promise.resolve({ id: 'product-1', updatedAt: new Date('2026-07-12T11:00:00Z') }),
    },
    productDraft: {
      findUnique: () => Promise.resolve({
        productId: 'product-1',
        payload: { titleKg: 'Stale draft' },
        baseProductUpdatedAt: new Date('2026-07-12T10:00:00Z'),
      }),
    },
  } as unknown as PrismaService

  await assert.rejects(
    () => new AdminProductsService(prisma).publishDraft('product-1', ownerAdmin),
    /changed after this draft was created/,
  )
})

test('admin can create a local product with placeholder image and stock row', async () => {
  let createArgs: Prisma.ProductCreateArgs | undefined
  let auditAction = ''
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
                src: Array.isArray(args.data.images?.create)
                  ? args.data.images?.create[0]?.src
                  : args.data.images?.create?.src,
                sortOrder: 0,
              },
            ],
            isActive: args.data.isActive,
          }),
        )
      },
    },
    productAuditLog: {
      create: (args: { data: { action: string } }) => {
        auditAction = args.data.action
        return Promise.resolve({})
      },
    },
    $transaction: (callback: (client: unknown) => Promise<unknown>) => callback(prisma),
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
    specs: [{ key: 'Size', value: '20 mm' }],
    documents: [{ title: 'Certificate', url: 'https://example.com/cert.pdf', type: ProductDocumentType.CERTIFICATE }],
    seoTitleKg: 'Stage 37 SEO KG',
    seoDescriptionKg: 'Stage 37 SEO description KG',
    seoTitleRu: 'Stage 37 SEO RU',
    seoDescriptionRu: 'Stage 37 SEO description RU',
  }, ownerAdmin)

  assert.equal(result.id, 'product-new')
  assert.equal(result.slug, 'stage-37-local-product')
  assert.equal(result.price, 321.45)
  assert.equal(result.stock?.quantity, 7)
  assert.equal(result.imageStatus, 'ready')
  const createdImages = createArgs?.data.images?.create
  const firstCreatedImage = Array.isArray(createdImages) ? createdImages[0] : createdImages
  assert.equal(firstCreatedImage?.src, '/images/products/stage37/main.webp')
  assert.equal(firstCreatedImage?.alt, 'Stage 37 photo')
  assert.equal(createArgs?.data.stock?.create?.reservedQuantity, 0)
  assert.deepEqual(createArgs?.data.specs, { Size: '20 mm' })
  assert.equal(createArgs?.data.seoTitleRu, 'Stage 37 SEO RU')
  assert.equal(auditAction, 'product_created')
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
  let savedUpdateData: Record<string, any> = {}
  let savedDocuments: Array<{ title: string; url: string; type: ProductDocumentType }> = []
  let savedImages: Array<{ src: string; alt: string; type: ProductImageType }> = []
  let auditAction = ''
  let auditFields: string[] = []

  const tx = {
    product: {
      findUnique: () => Promise.resolve(productState),
      update: (args: any) => {
        savedUpdateData = args.data
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
    productAuditLog: {
      create: (args: { data: { action: string; changedFields: string[] } }) => {
        auditAction = args.data.action
        auditFields = args.data.changedFields
        return Promise.resolve({})
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
    shortDescriptionRu: 'Краткое описание',
    price: 250,
    stockQuantity: 8,
    stockStatus: ProductStockStatus.LOW_STOCK,
    unit: 'метр',
    unitRu: 'метр',
    minOrder: '1 метр',
    minOrderRu: '1 метр',
    packageInfoKg: '2 метр',
    packageInfoRu: '2 метра',
    isActive: true,
    specs: [
      { key: 'Диаметр', value: '20 мм' },
      { key: '', value: 'ignored' },
    ],
    specsRu: [{ key: 'Цвет', value: 'белый' }],
    faqKg: [{ question: 'Суроо?', answer: 'Жооп.' }],
    faqRu: [{ question: 'Вопрос?', answer: 'Ответ.' }],
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
  }, ownerAdmin)

  assert.equal(result.slug, 'updated-product')
  assert.deepEqual(savedSpecs, { Диаметр: '20 мм' })
  assert.deepEqual(savedUpdateData.specsRu, { Цвет: 'белый' })
  assert.deepEqual(savedUpdateData.faqRu, [{ question: 'Вопрос?', answer: 'Ответ.' }])
  assert.equal(savedUpdateData.shortDescriptionRu, 'Краткое описание')
  assert.equal(savedUpdateData.packageInfoRu, '2 метра')
  assert.equal(savedDocuments.length, 1)
  assert.equal(savedDocuments[0].type, ProductDocumentType.CERTIFICATE)
  assert.equal(savedImages[0].type, ProductImageType.MAIN)
  assert.equal(auditAction, 'product_updated')
  assert.equal(auditFields.includes('documents'), true)
  assert.equal(auditFields.includes('images'), true)
  assert.equal(auditFields.includes('faq'), true)
})

test('product update permissions separate content and commercial roles', async () => {
  const service = new AdminProductsService({} as PrismaService)

  await assert.rejects(
    () => service.update('product-1', { titleKg: 'Blocked' }, managerAdmin),
    /Insufficient permissions/,
  )
  await assert.rejects(
    () => service.update('product-1', { price: 55 }, contentAdmin),
    /Insufficient permissions/,
  )
})

test('admin gallery upload creates product image record and audit log', async () => {
  let productState = productFixture({ images: [] })
  let createdImage: Record<string, unknown> | undefined
  let auditAction = ''
  const uploadedImage = {
    ...productFixture().images[0],
    id: 'image-uploaded',
    src: 'http://127.0.0.1:4027/uploads/products/uploaded.webp',
    storageKey: 'products/uploaded.webp',
    storageDriver: 'local',
  }
  const tx = {
    productImage: {
      create: (args: { data: Record<string, unknown> }) => {
        createdImage = args.data
        productState = productFixture({ images: [uploadedImage] })
        return Promise.resolve({})
      },
      updateMany: () => Promise.resolve({ count: 0 }),
    },
    product: {
      findUnique: () => Promise.resolve(productState),
    },
    productAuditLog: {
      create: (args: { data: { action: string } }) => {
        auditAction = args.data.action
        return Promise.resolve({})
      },
    },
  }
  const prisma = {
    product: { findUnique: () => Promise.resolve(productState) },
    $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService

  const result = await new AdminProductsService(prisma).addImage(
    'product-1',
    {
      driver: 'local',
      key: 'products/uploaded.webp',
      src: 'http://127.0.0.1:4027/uploads/products/uploaded.webp',
      path: '/uploads/products/uploaded.webp',
      filename: 'uploaded.webp',
      originalName: 'original.webp',
      size: 120,
      mimeType: 'image/webp',
    },
    ownerAdmin,
  )

  assert.equal(createdImage?.type, ProductImageType.MAIN)
  assert.equal(createdImage?.storageKey, 'products/uploaded.webp')
  assert.equal(createdImage?.storageDriver, 'local')
  assert.equal(auditAction, 'image_added')
  assert.equal(result.images.length, 1)
})

test('admin gallery can set main image, reorder images and detach safely', async () => {
  const imageA = { ...productFixture().images[0], id: 'image-a', sortOrder: 0, type: ProductImageType.MAIN }
  const imageB = {
    ...productFixture().images[0],
    id: 'image-b',
    src: 'http://127.0.0.1:4027/uploads/products/b.webp',
    sortOrder: 1,
    type: ProductImageType.GALLERY,
    storageKey: 'products/b.webp',
    storageDriver: 'local',
  }
  let updateManyArgs: unknown
  const updates: Array<{ id: string; data: Record<string, unknown> }> = []
  let deletedObject = false
  let currentProduct = productFixture({ images: [imageA, imageB] })
  const tx = {
    productImage: {
      updateMany: (args: unknown) => {
        updateManyArgs = args
        return Promise.resolve({ count: 1 })
      },
      update: (args: { where: { id: string }; data: Record<string, unknown> }) => {
        updates.push({ id: args.where.id, data: args.data })
        return Promise.resolve({})
      },
      delete: () => Promise.resolve({}),
      findMany: () => Promise.resolve([imageA]),
    },
    product: {
      findUnique: () => Promise.resolve(currentProduct),
    },
    productAuditLog: {
      create: () => Promise.resolve({}),
    },
  }
  const prisma = {
    product: { findUnique: () => Promise.resolve(currentProduct) },
    productImage: { count: () => Promise.resolve(0) },
    $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService
  const service = new AdminProductsService(prisma)

  await service.updateImage('product-1', 'image-b', { isMain: true }, ownerAdmin)
  assert.deepEqual(updateManyArgs, {
    where: { productId: 'product-1', id: { not: 'image-b' } },
    data: { type: ProductImageType.GALLERY },
  })

  await service.reorderImages(
    'product-1',
    { images: [{ id: 'image-b', sortOrder: 0 }, { id: 'image-a', sortOrder: 1 }], mainImageId: 'image-b' },
    ownerAdmin,
  )
  assert.equal(updates.some((item) => item.id === 'image-b' && item.data.type === ProductImageType.MAIN), true)

  currentProduct = productFixture({ images: [imageB, imageA] })
  await service.deleteImage(
    'product-1',
    'image-b',
    { deleteObject: async () => { deletedObject = true; return { deleted: true, reason: 'local-deleted' } } } as never,
    ownerAdmin,
  )
  assert.equal(deletedObject, true)
})

test('admin gallery blocks viewer role and protects legacy static assets from physical delete', async () => {
  const service = new AdminProductsService({} as PrismaService)
  await assert.rejects(
    () => service.updateImage('product-1', 'image-1', { alt: 'Blocked' }, viewerAdmin),
    /Insufficient permissions/,
  )

  const staticImage = {
    ...productFixture().images[0],
    id: 'image-static',
    src: '/images/products/static.webp',
    storageKey: null,
    storageDriver: 'legacy',
  }
  const tx = {
    productImage: {
      delete: () => Promise.resolve({}),
      findMany: () => Promise.resolve([]),
      update: () => Promise.resolve({}),
    },
    product: { findUnique: () => Promise.resolve(productFixture({ images: [] })) },
    productAuditLog: { create: () => Promise.resolve({}) },
  }
  const prisma = {
    product: { findUnique: () => Promise.resolve(productFixture({ images: [staticImage] })) },
    productImage: { count: () => Promise.resolve(0) },
    $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService
  let deletedObject = false
  const result = await new AdminProductsService(prisma).deleteImage(
    'product-1',
    'image-static',
    { deleteObject: async () => { deletedObject = true; return { deleted: true, reason: 'unexpected' } } } as never,
    ownerAdmin,
  )
  assert.equal(deletedObject, false)
  assert.equal(result.storageDelete.deleted, false)
})

test('admin can create and audit a product variant', async () => {
  const productState = productFixture()
  const createdAt = new Date('2026-07-03T11:00:00Z')
  let createArgs: { data: Record<string, unknown> } | undefined
  let auditAction = ''
  const createdVariant = {
    id: 'variant-1',
    productId: 'product-1',
    titleKg: '20 мм',
    titleRu: '20 мм',
    sku: 'VAR-20',
    price: new Prisma.Decimal(75),
    currency: 'KGS',
    unit: 'метр',
    stockQuantity: 12,
    reservedQuantity: 0,
    stockStatus: ProductStockStatus.IN_STOCK,
    isActive: true,
    sortOrder: 1,
    specs: { Диаметр: '20 мм' },
    createdAt,
    updatedAt: createdAt,
  }
  const tx = {
    productVariant: {
      create: (args: { data: Record<string, unknown> }) => {
        createArgs = args
        return Promise.resolve(createdVariant)
      },
    },
    product: {
      findUnique: () => Promise.resolve(productFixture({ variants: [createdVariant] })),
    },
    productAuditLog: {
      create: (args: { data: { action: string } }) => {
        auditAction = args.data.action
        return Promise.resolve({})
      },
    },
  }
  const prisma = {
    product: {
      findUnique: () => Promise.resolve(productState),
      findFirst: () => Promise.resolve(null),
    },
    productVariant: {
      findFirst: () => Promise.resolve(null),
    },
    $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService

  const result = await new AdminProductsService(prisma).createVariant(
    'product-1',
    {
      titleKg: '20 мм',
      titleRu: '20 мм',
      sku: 'var-20',
      price: 75,
      unit: 'метр',
      stockQuantity: 12,
      stockStatus: ProductStockStatus.IN_STOCK,
      isActive: true,
      sortOrder: 1,
      specs: [{ key: 'Диаметр', value: '20 мм' }],
    },
    ownerAdmin,
  )

  assert.equal(result.id, 'variant-1')
  assert.equal(result.sku, 'VAR-20')
  assert.equal(result.price, 75)
  assert.deepEqual(createArgs?.data.specs, { Диаметр: '20 мм' })
  assert.equal(auditAction, 'variant_created')
})

test('admin can update variant commercial fields without lowering below reserved quantity', async () => {
  const existingVariant = {
    id: 'variant-1',
    productId: 'product-1',
    titleKg: '20 мм',
    titleRu: '20 мм',
    sku: 'VAR-20',
    price: new Prisma.Decimal(75),
    currency: 'KGS',
    unit: 'метр',
    stockQuantity: 12,
    reservedQuantity: 2,
    stockStatus: ProductStockStatus.IN_STOCK,
    isActive: true,
    sortOrder: 1,
    specs: { Диаметр: '20 мм' },
    createdAt: new Date('2026-07-03T11:00:00Z'),
    updatedAt: new Date('2026-07-03T11:00:00Z'),
  }
  const updatedVariant = { ...existingVariant, price: new Prisma.Decimal(80), stockQuantity: 10 }
  let updateArgs: { data: Record<string, unknown> } | undefined
  let auditFields: string[] = []
  const tx = {
    productVariant: {
      update: (args: { data: Record<string, unknown> }) => {
        updateArgs = args
        return Promise.resolve(updatedVariant)
      },
    },
    product: {
      findUnique: () => Promise.resolve(productFixture({ variants: [updatedVariant] })),
    },
    productAuditLog: {
      create: (args: { data: { changedFields: string[] } }) => {
        auditFields = args.data.changedFields
        return Promise.resolve({})
      },
    },
  }
  const prisma = {
    product: {
      findUnique: () => Promise.resolve(productFixture({ variants: [existingVariant] })),
      findFirst: () => Promise.resolve(null),
    },
    productVariant: {
      findFirst: () => Promise.resolve(null),
    },
    $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService

  const service = new AdminProductsService(prisma)
  const result = await service.updateVariant(
    'product-1',
    'variant-1',
    { price: 80, stockQuantity: 10 },
    managerAdmin,
  )

  assert.equal(result.price, 80)
  assert.equal(result.stockQuantity, 10)
  assert.equal(Number(updateArgs?.data.price), 80)
  assert.equal(updateArgs?.data.stockQuantity, 10)
  assert.equal(auditFields.includes('variantPrice'), true)
  assert.equal(auditFields.includes('variantStock'), true)

  await assert.rejects(
    () => service.updateVariant('product-1', 'variant-1', { stockQuantity: 1 }, managerAdmin),
    /reserved quantity/,
  )
})

test('variant permissions and SKU uniqueness are enforced', async () => {
  const service = new AdminProductsService({} as PrismaService)

  await assert.rejects(
    () => service.updateVariant('product-1', 'variant-1', { price: 80 }, contentAdmin),
    /Insufficient permissions/,
  )
  await assert.rejects(
    () => service.updateVariant('product-1', 'variant-1', { titleKg: 'Blocked' }, managerAdmin),
    /Insufficient permissions/,
  )
  await assert.rejects(
    () => service.updateVariant('product-1', 'variant-1', { isActive: false }, viewerAdmin),
    /Insufficient permissions/,
  )

  const prisma = {
    product: {
      findUnique: () => Promise.resolve(productFixture({ variants: [] })),
      findFirst: () => Promise.resolve({ id: 'product-1' }),
    },
    productVariant: {
      findFirst: () => Promise.resolve(null),
    },
  } as unknown as PrismaService

  await assert.rejects(
    () => new AdminProductsService(prisma).createVariant(
      'product-1',
      {
        titleKg: 'Duplicate SKU',
        sku: 'TEST-1',
        price: 10,
        unit: 'шт',
        stockQuantity: 1,
        stockStatus: ProductStockStatus.IN_STOCK,
      },
      ownerAdmin,
    ),
    /Variant SKU already exists/,
  )
})

test('price update with auth-facing service call stores a database decimal', async () => {
  let savedPrice: Prisma.Decimal | undefined
  let productState = productFixture()
  const tx = {
    product: {
      findUnique: () => Promise.resolve(productState),
      update: (args: { data: { price: Prisma.Decimal } }) => {
        savedPrice = args.data.price
        productState = productFixture({ ...productState, price: args.data.price })
        return Promise.resolve(productState)
      },
    },
    productAuditLog: {
      create: () => Promise.resolve({}),
    },
  }
  const prisma = {
    $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService
  const service = new AdminProductsService(prisma)
  service.detail = async () => ({ id: 'product-1', price: 125.5 }) as never

  const result = await service.updatePrice('product-1', 125.5, ownerAdmin)

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
  let productState = productFixture({ isActive })
  const tx = {
    product: {
      findUnique: () => Promise.resolve(productState),
      update: (args: { data: { isActive: boolean } }) => {
        isActive = args.data.isActive
        productState = productFixture({ ...productState, isActive })
        return Promise.resolve(productState)
      },
    },
    productAuditLog: {
      create: () => Promise.resolve({}),
    },
  }
  const prisma = {
    $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService
  const service = new AdminProductsService(prisma)
  service.detail = async () => ({ id: 'product-1', isActive }) as never

  assert.equal((await service.updateActive('product-1', false, ownerAdmin)).isActive, false)
  assert.equal((await service.updateActive('product-1', true, ownerAdmin)).isActive, true)
})

test('product audit log returns admin identity and pagination metadata', async () => {
  const createdAt = new Date('2026-07-03T09:00:00Z')
  const prisma = {
    product: {
      findUnique: () => Promise.resolve({ id: 'product-1' }),
    },
    productAuditLog: {
      findMany: () =>
        Promise.resolve([
          {
            id: 'audit-1',
            productId: 'product-1',
            adminId: 'admin-owner',
            action: 'product_updated',
            changedFields: ['titleKg'],
            beforeSnapshot: { titleKg: 'Old' },
            afterSnapshot: { titleKg: 'New' },
            metadata: { adminRole: 'OWNER' },
            createdAt,
            admin: { id: 'admin-owner', name: 'Owner', email: 'owner@test.local', role: 'OWNER' },
          },
        ]),
      count: () => Promise.resolve(1),
    },
    $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
  } as unknown as PrismaService

  const result = await new AdminProductsService(prisma).auditLog('product-1', { page: 1, limit: 20 })

  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].action, 'product_updated')
  assert.equal(result.items[0].admin?.email, 'owner@test.local')
  assert.equal(result.pagination.total, 1)
})

test('order created after admin price update uses new DB price while old snapshot stays unchanged', async () => {
  const databaseProduct = { price: 100 }
  const oldOrderSnapshot = 100
  let productState = productFixture({ price: new Prisma.Decimal(databaseProduct.price) })
  const tx = {
    product: {
      findUnique: () => Promise.resolve(productState),
      update: (args: { data: { price: Prisma.Decimal } }) => {
        databaseProduct.price = Number(args.data.price)
        productState = productFixture({ ...productState, price: args.data.price })
        return Promise.resolve(productState)
      },
    },
    productAuditLog: {
      create: () => Promise.resolve({}),
    },
  }
  const prisma = {
    $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as PrismaService
  const service = new AdminProductsService(prisma)
  service.detail = async () => ({ id: 'product-1', price: databaseProduct.price }) as never

  await service.updatePrice('product-1', 175, ownerAdmin)
  const newOrderLineTotal = calculateLineTotal(databaseProduct.price, 2)

  assert.equal(newOrderLineTotal, 350)
  assert.equal(oldOrderSnapshot, 100)
})
