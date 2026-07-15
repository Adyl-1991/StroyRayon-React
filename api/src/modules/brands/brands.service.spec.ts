import assert from 'node:assert/strict'
import test from 'node:test'
import { ConflictException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { BrandsService } from './brands.service'

test('admin can create a brand with a normalized slug', async () => {
  let createData: { name: string; slug: string } | undefined
  const prisma = {
    brand: {
      findFirst: () => Promise.resolve(null),
      create: ({ data }: { data: { name: string; slug: string } }) => {
        createData = data
        return Promise.resolve({ id: 'brand-1', ...data, _count: { products: 0 } })
      },
    },
  } as unknown as PrismaService

  const result = await new BrandsService(prisma).create({ name: 'Новый Бренд' })

  assert.deepEqual(createData, { name: 'Новый Бренд', slug: 'новый-бренд' })
  assert.equal(result.id, 'brand-1')
})

test('renaming a brand keeps its product links and returns the count', async () => {
  const prisma = {
    brand: {
      findUnique: () => Promise.resolve({ id: 'brand-1', name: 'Old' }),
      findFirst: () => Promise.resolve(null),
      update: ({ data }: { data: { name: string; slug: string } }) =>
        Promise.resolve({ id: 'brand-1', ...data, _count: { products: 3 } }),
    },
  } as unknown as PrismaService

  const result = await new BrandsService(prisma).update('brand-1', { name: 'New Name' })

  assert.equal(result.name, 'New Name')
  assert.equal(result.slug, 'new-name')
  assert.equal(result._count.products, 3)
})

test('a brand linked to products cannot be deleted', async () => {
  const prisma = {
    brand: {
      findUnique: () => Promise.resolve({ id: 'brand-1', _count: { products: 2 } }),
      delete: () => Promise.reject(new Error('delete must not run')),
    },
  } as unknown as PrismaService

  await assert.rejects(
    () => new BrandsService(prisma).remove('brand-1'),
    (error: unknown) => error instanceof ConflictException,
  )
})
