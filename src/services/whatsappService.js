import { formatPrice } from '../utils/formatPrice'

export const contactConfig = {
  phone: '+996 700 123 456',
  whatsapp: '996700123456',
  telegram: '@StroyRayon',
}

function formatOrderItem(item, index) {
  const variantText = item.variantSize ? ` (${item.variantSize})` : ''
  const skuText = item.variantSku || item.sku ? `, SKU: ${item.variantSku || item.sku}` : ''
  const packageText = item.packageInfo ? `, таңгак: ${item.packageInfo}` : ''

  return `${index + 1}. ${item.name}${variantText}${skuText}${packageText} - ${item.quantity} ${item.unit} x ${formatPrice(item.price)} = ${formatPrice(
    item.price * item.quantity,
  )}`
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
    ...items.map((item, index) => formatOrderItem(item, index)),
    '',
    `Жалпы сумма: ${formatPrice(total)}`,
    `Комментарий: ${customer.comment || 'Жок'}`,
  ]

  return lines.join('\n')
}

export function getWhatsAppUrl(text) {
  return `https://wa.me/${contactConfig.whatsapp}?text=${encodeURIComponent(text)}`
}
