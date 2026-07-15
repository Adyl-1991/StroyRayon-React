import assert from 'node:assert/strict'
import test from 'node:test'
import { PrismaService } from '../../prisma/prisma.service'
import { ProductsService } from './products.service'

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
  assert.deepEqual(receivedWhere, { slug: 'hidden-product', isActive: true })
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
})
