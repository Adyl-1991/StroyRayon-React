import assert from 'node:assert/strict'
import test from 'node:test'
import { Prisma } from '@prisma/client'
import { StockService } from './stock.service'

test('reservation uses the exact stock snapshot and increments atomically', async () => {
  let receivedArgs: unknown
  const tx = {
    stock: {
      updateMany: (args: unknown) => {
        receivedArgs = args
        return Promise.resolve({ count: 1 })
      },
    },
  } as unknown as Prisma.TransactionClient

  const reserved = await new StockService().reserveAvailableProduct(
    tx,
    'product-1',
    3,
    { quantity: 10, reservedQuantity: 2 },
  )

  assert.equal(reserved, true)
  assert.deepEqual(receivedArgs, {
    where: {
      productId: 'product-1',
      quantity: 10,
      reservedQuantity: 2,
    },
    data: {
      reservedQuantity: {
        increment: 3,
      },
    },
  })
})

test('reservation reports a concurrent stock change instead of over-reserving', async () => {
  const tx = {
    stock: {
      updateMany: () => Promise.resolve({ count: 0 }),
    },
  } as unknown as Prisma.TransactionClient

  const reserved = await new StockService().reserveAvailableProduct(
    tx,
    'product-1',
    3,
    { quantity: 10, reservedQuantity: 2 },
  )

  assert.equal(reserved, false)
})

test('variant reservation uses variant stock snapshot atomically', async () => {
  let receivedArgs: unknown
  const tx = {
    productVariant: {
      updateMany: (args: unknown) => {
        receivedArgs = args
        return Promise.resolve({ count: 1 })
      },
    },
  } as unknown as Prisma.TransactionClient

  const reserved = await new StockService().reserveAvailableVariant(
    tx,
    'variant-1',
    4,
    { stockQuantity: 20, reservedQuantity: 3 },
  )

  assert.equal(reserved, true)
  assert.deepEqual(receivedArgs, {
    where: {
      id: 'variant-1',
      stockQuantity: 20,
      reservedQuantity: 3,
    },
    data: {
      reservedQuantity: {
        increment: 4,
      },
    },
  })
})
