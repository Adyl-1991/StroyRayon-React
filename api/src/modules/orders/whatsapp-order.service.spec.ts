import assert from 'node:assert/strict'
import test from 'node:test'
import { WhatsappOrderService } from './whatsapp-order.service'

const service = new WhatsappOrderService()

function buildInput(locale: 'kg' | 'ru') {
  return {
    orderNumber: 'SR-2026-000007',
    customer: {
      name: locale === 'ru' ? 'Тестовый клиент' : 'Тест кардар',
      phone: '+996 700 000 000',
      address: 'Бишкек',
    },
    items: [
      {
        title: locale === 'ru' ? 'ППР труба' : 'ППР түтүк',
        sku: 'PPR-20',
        price: 45,
        quantity: 2,
        unit: 'метр',
        total: 90,
      },
    ],
    total: 90,
    currency: 'KGS',
    locale,
    pdfUrl: 'https://api.stroyrayon.kg/api/orders/order-1/pdf?token=signed',
  }
}

test('Russian checkout produces a short PDF-first WhatsApp order', () => {
  const text = service.buildWhatsappOrderText(buildInput('ru'))

  assert.match(text, /Новый заказ с сайта StroyRayon/)
  assert.match(text, /Заказ № SR-2026-000007/)
  assert.match(text, /Позиций: 1/)
  assert.match(text, /Итого: 90 сом/)
  assert.match(text, /PDF заказа: https:\/\/api\.stroyrayon\.kg/)
  assert.doesNotMatch(text, /ППР труба|45/)
})

test('Kyrgyz checkout produces a short PDF-first WhatsApp order', () => {
  const text = service.buildWhatsappOrderText(buildInput('kg'))

  assert.match(text, /StroyRayon сайтынан жаңы буйрутма/)
  assert.match(text, /Буйрутма № SR-2026-000007/)
  assert.match(text, /Позициялар: 1/)
  assert.match(text, /Жалпы сумма: 90 сом/)
  assert.match(text, /Буйрутманын PDF файлы: https:\/\/api\.stroyrayon\.kg/)
  assert.doesNotMatch(text, /ППР түтүк|45/)
})
