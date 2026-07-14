import assert from 'node:assert/strict'
import test from 'node:test'
import { OrderStatus } from '@prisma/client'
import { PrismaService as AppPrismaService } from '../../prisma/prisma.service'
import { OrderPdfService } from '../orders/order-pdf.service'
import { AdminOrdersService } from './admin-orders.service'

const orderPdfService = {
  createPublicPdfUrl: (id: string) => `https://api.stroyrayon.kg/api/orders/${id}/pdf?token=signed`,
} as OrderPdfService

test('orders list with authorized service call returns CRM rows', async () => {
  const prisma = {
    order: {
      findMany: () =>
        Promise.resolve([
          {
            id: 'order-1',
            orderNumber: 'SR-2026-000001',
            createdAt: new Date('2026-06-19T10:00:00Z'),
            updatedAt: new Date('2026-06-19T10:00:00Z'),
            customer: { name: 'Test Customer', phone: '+996700000000' },
            total: 500,
            currency: 'KGS',
            status: OrderStatus.NEW,
            availabilityCheckRequired: false,
            items: [{ stockCheckStatus: 'OK', reservedQuantity: 1 }],
          },
        ]),
      count: () => Promise.resolve(1),
    },
    $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
  } as unknown as AppPrismaService

  const result = await new AdminOrdersService(prisma, orderPdfService).list({ page: 1, limit: 25 })

  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].orderNumber, 'SR-2026-000001')
  assert.equal(result.items[0].stockStatus, 'reserved')
})

test('status update with auth records history and updates the order', async () => {
  let updateArgs: unknown
  const tx = {
    order: {
      findUnique: () =>
        Promise.resolve({
          id: 'order-1',
          status: OrderStatus.NEW,
          items: [],
        }),
      update: (args: unknown) => {
        updateArgs = args
        return Promise.resolve({})
      },
    },
  }
  const prisma = {
    $transaction: (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
  } as unknown as AppPrismaService
  const service = new AdminOrdersService(prisma, orderPdfService)
  service.detail = async () => ({ id: 'order-1', status: 'confirmed' }) as never

  const result = await service.updateStatus('order-1', OrderStatus.CONFIRMED, 'admin-1')

  assert.deepEqual(result, { id: 'order-1', status: 'confirmed' })
  assert.deepEqual(updateArgs, {
    where: { id: 'order-1' },
    data: {
      status: OrderStatus.CONFIRMED,
      statusHistory: {
        create: {
          fromStatus: OrderStatus.NEW,
          toStatus: OrderStatus.CONFIRMED,
          adminUserId: 'admin-1',
        },
      },
    },
  })
})

test('admin note update with auth supports saving and clearing internal text', async () => {
  let savedNote: unknown
  const prisma = {
    order: {
      findUnique: () => Promise.resolve({ id: 'order-1' }),
      update: (args: { data: { adminNote: string | null } }) => {
        savedNote = args.data.adminNote
        return Promise.resolve({})
      },
    },
  } as unknown as AppPrismaService
  const service = new AdminOrdersService(prisma, orderPdfService)
  service.detail = async () => ({ id: 'order-1' }) as never

  await service.updateNote('order-1', '  Call before delivery  ')
  assert.equal(savedNote, 'Call before delivery')

  await service.updateNote('order-1', '   ')
  assert.equal(savedNote, null)
})
