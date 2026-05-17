import { formatPrice } from '../utils/formatPrice'

export const contactConfig = {
  phone: '+996 700 123 456',
  whatsapp: '996700123456',
  telegram: '@StroyRayon',
}

export function buildWhatsAppOrderText({ customer, items, total }) {
  const lines = [
    'Саламатсызбы, StroyRayon!',
    'Заказ бергим келет.',
    '',
    `Аты-жөнү: ${customer.name}`,
    `Телефон: ${customer.phone}`,
    `Дарек/регион: ${customer.address}`,
    '',
    'Товарлар:',
    ...items.map(
      (item, index) =>
        `${index + 1}. ${item.name} - ${item.quantity} ${item.unit} x ${formatPrice(item.price)} = ${formatPrice(
          item.price * item.quantity,
        )}`,
    ),
    '',
    `Жалпы сумма: ${formatPrice(total)}`,
    `Комментарий: ${customer.comment || 'Жок'}`,
  ]

  return lines.join('\n')
}

export function getWhatsAppUrl(text) {
  return `https://wa.me/${contactConfig.whatsapp}?text=${encodeURIComponent(text)}`
}
