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
      address: locale === 'ru' ? 'Бишкек' : 'Бишкек',
    },
    items: [{
      title: locale === 'ru' ? 'ППР труба' : 'ППР түтүк',
      sku: 'PPR-20',
      price: 45,
      quantity: 2,
      unit: locale === 'ru' ? 'метр' : 'метр',
      total: 90,
    }],
    total: 90,
    currency: 'KGS',
    comment: locale === 'ru' ? 'Тестовый заказ' : 'Тест буйрутма',
    locale,
  }
}

test('Russian checkout produces a complete Russian WhatsApp order', () => {
  const text = service.buildWhatsappOrderText(buildInput('ru'))

  assert.match(text, /Новый заказ с сайта StroyRayon/)
  assert.match(text, /Номер заказа: SR-2026-000007/)
  assert.match(text, /ППР труба/)
  assert.match(text, /Общая сумма: 90 KGS/)
  assert.match(text, /подтвердите наличие и условия доставки/)
  assert.doesNotMatch(text, /Жалпы сумма|ППР түтүк/)
})

test('Kyrgyz checkout preserves the Kyrgyz WhatsApp order', () => {
  const text = service.buildWhatsappOrderText(buildInput('kg'))

  assert.match(text, /StroyRayon сайтынан жаңы заказ/)
  assert.match(text, /Заказ номери: SR-2026-000007/)
  assert.match(text, /ППР түтүк/)
  assert.match(text, /Жалпы сумма: 90 KGS/)
  assert.match(text, /товар бар-жогун тактап бериңиз/)
})
