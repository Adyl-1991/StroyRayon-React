import assert from 'node:assert/strict'
import test from 'node:test'
import { ConfigService } from '@nestjs/config'
import { PrismaService as AppPrismaService } from '../../prisma/prisma.service'
import { OrderPdfService } from './order-pdf.service'

function createService() {
  const prisma = {
    order: {
      findUnique: () =>
        Promise.resolve({
          id: 'order-1',
          orderNumber: 'SR-2026-000007',
          createdAt: new Date('2026-07-14T09:30:00Z'),
          customerComment: 'Позвонить перед доставкой',
          subtotal: 1290,
          deliveryPrice: 0,
          total: 1290,
          currency: 'KGS',
          customer: {
            name: 'Тестовый клиент',
            phone: '+996 700 000 000',
            region: 'Бишкек',
            address: 'ул. Тестовая, 1',
          },
          items: [
            {
              id: 'item-1',
              productTitleSnapshot: 'Саморез по металлу',
              variantTitleSnapshot: '4,2 × 16 мм',
              productSkuSnapshot: 'SCR-4216',
              variantSkuSnapshot: null,
              productUnitSnapshot: 'шт.',
              unitPriceSnapshot: 12.9,
              quantity: 100,
              totalSnapshot: 1290,
            },
          ],
        }),
    },
  } as unknown as AppPrismaService
  const values: Record<string, string> = {
    ORDER_PDF_SECRET: 'test-order-pdf-secret-contains-more-than-32-characters',
    ORDER_PDF_LINK_TTL_SECONDS: '604800',
    PUBLIC_API_ORIGIN: 'https://api.stroyrayon.kg',
  }
  const config = {
    get: (key: string) => values[key],
  } as ConfigService

  return new OrderPdfService(prisma, config)
}

test('signed order link renders a readable PDF document', async () => {
  const service = createService()
  const url = new URL(service.createPublicPdfUrl('order-1', 'ru'))
  const token = url.searchParams.get('token') || ''
  const result = await service.createPublicPdf('order-1', token)

  assert.equal(url.origin, 'https://api.stroyrayon.kg')
  assert.equal(url.pathname, '/api/orders/order-1/pdf')
  assert.equal(result.filename, 'StroyRayon-SR-2026-000007.pdf')
  assert.equal(result.buffer.subarray(0, 4).toString(), '%PDF')
  assert.ok(result.buffer.length > 10_000)
  assert.equal((result.buffer.toString('latin1').match(/\/Type \/Page\b/g) || []).length, 1)
})

test('tampered order PDF token is rejected', async () => {
  const service = createService()
  const url = new URL(service.createPublicPdfUrl('order-1', 'kg'))
  const token = `${url.searchParams.get('token')}broken`

  await assert.rejects(() => service.createPublicPdf('order-1', token), /invalid or expired/)
})
