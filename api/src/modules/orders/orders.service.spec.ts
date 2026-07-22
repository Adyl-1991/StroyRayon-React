import assert from 'node:assert/strict'
import test from 'node:test'
import { OrdersService } from './orders.service'

test('EVER PLAST order is persisted from the server catalog when the CRM product row is absent', async () => {
  let createdOrderData: any = null
  const tx = {
    customer: {
      upsert: async () => ({ id: 'customer-1', name: 'QA Buyer', phone: '+996700000000', address: 'Bishkek' }),
    },
    orderSequence: {
      upsert: async () => ({ year: 2026, value: 1 }),
    },
    productVariant: {
      findUnique: async () => null,
    },
    product: {
      findUnique: async () => {
        throw new Error('A missing database variant must resolve from the bundled catalog before the base product')
      },
    },
    order: {
      create: async ({ data }: any) => {
        createdOrderData = data
        return {
          id: data.id,
          orderNumber: data.orderNumber,
          status: data.status,
          total: data.total,
          currency: data.currency,
          availabilityCheckRequired: data.availabilityCheckRequired,
          whatsappText: data.whatsappText,
          items: data.items.create.map((item: any) => ({ id: 'item-1', ...item })),
        }
      },
    },
  }
  const prisma = {
    $transaction: async (callback: (transaction: typeof tx) => unknown) => callback(tx),
  }
  const config = { get: () => '996700123456' }
  const pdf = { createPublicPdfUrl: () => 'https://api.stroyrayon.kg/api/orders/order-1/pdf?token=test' }
  const whatsapp = {
    buildWhatsappOrderText: () => 'Server order text',
    buildWhatsappUrl: () => 'https://wa.me/996700123456?text=Server%20order%20text',
  }
  const stock = {}
  const service = new OrdersService(prisma as any, config as any, pdf as any, whatsapp as any, stock as any)

  const result = await service.create({
    customer: { name: 'QA Buyer', phone: '+996700000000', address: 'Bishkek' },
    locale: 'ru',
    source: 'website',
    items: [{
      productId: 'ever-plast-ppr-pipe-pn20',
      variantId: 'ever-plast-ppr-pipe-pn20-1-20-mm',
      slug: 'ever-plast-ppr-pipe-pn20',
      sku: 'UPP.20.034.20.60.W',
      title: 'Client title is not trusted',
      price: 1,
      quantity: 2,
      unit: 'client-unit',
    }],
  })

  const persistedItem = createdOrderData.items.create[0]
  assert.equal(persistedItem.productId, null)
  assert.equal(persistedItem.variantId, null)
  assert.equal(Number(persistedItem.unitPriceSnapshot), 60)
  assert.equal(Number(persistedItem.totalSnapshot), 120)
  assert.equal(persistedItem.variantSkuSnapshot, 'UPP.20.034.20.60.W')
  assert.equal(createdOrderData.availabilityCheckRequired, true)
  assert.equal(result.orderNumber, 'SR-2026-000001')
  assert.equal(result.total, 120)
})

test('current storefront item wins when a stale CRM row reuses its product id', async () => {
  const tx = {
    productVariant: {
      findUnique: async () => null,
    },
    product: {
      findUnique: async ({ where }: any) => where.id === 'wago-terminal-3'
        ? { id: 'wago-terminal-3', slug: 'stale-wago-slug' }
        : null,
    },
  }
  const service = new OrdersService({} as any, {} as any, {} as any, {} as any, {} as any)

  const resolved = await (service as any).findProductForOrderItem(tx, {
    productId: 'wago-terminal-3',
    slug: 'wago-tip-klemma-3-orun',
    sku: 'SR-ELC-WAG-003',
    title: 'Client title is not trusted',
    price: 1,
    quantity: 1,
    unit: 'client-unit',
  })

  assert.equal(resolved.kind, 'bundled')
  assert.equal(resolved.item.slug, 'wago-tip-klemma-3-orun')
  assert.equal(resolved.item.price, 22)
})
