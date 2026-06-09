import { formatPrice } from '../utils/formatPrice'

export const contactConfig = {
  phone: '+996 553 12 19 91',
  phoneDigits: '996553121991',
  whatsapp: '996553121991',
  telegram: '+996 553 12 19 91',
  telegramUrl: 'tg://resolve?phone=996553121991',
  address: 'Бишкек шаары',
}

export const businessHours = [
  'Шейшемби - Жекшемби: 09:00 - 19:00',
  'Дүйшөмбү: эс алуу күнү',
  'Жума күнү: 13:00 - 14:00 тыныгуу',
]

export const priceStockDisclaimer =
  'Баалар өзгөрүшү мүмкүн. Акыркы бааны жана товар бар-жогун WhatsApp аркылуу тактап беребиз.'

export const shortPriceStockDisclaimer = 'Акыркы баа жана бар-жогу менеджер аркылуу такталат.'

export const deliverySummary = 'Бишкек шаары ичинде жана аймактарга жеткирүү бар.'

function formatOrderItem(item, index) {
  const variantText = item.variantSize ? ` (${item.variantSize})` : ''
  const skuText = item.variantSku || item.sku ? `, SKU: ${item.variantSku || item.sku}` : ''
  const packageText = item.packageInfo ? `, таңгак: ${item.packageInfo}` : ''

  return `${index + 1}. ${item.name}${variantText}${skuText}${packageText} - ${item.quantity} ${item.unit} x ${formatPrice(item.price)} = ${formatPrice(
    item.price * item.quantity,
  )}`
}

export function buildProductInquiryText({ product, variant }) {
  const variantText = variant?.size ? ` - ${variant.size}` : ''
  const skuText = variant?.sku || product?.sku ? `SKU: ${variant?.sku || product.sku}` : ''
  const packageText = variant?.packageInfo || product?.packageInfoKg || product?.minOrder
  const price = variant?.price ?? product?.price
  const unit = variant?.unit || product?.unit
  const priceText = price ? `Баасы: ${formatPrice(price)}${unit ? ` / ${unit}` : ''}` : ''

  return [
    'Салам! StroyRayon сайтынан товар боюнча маалымат алгым келет.',
    `${product?.name || 'Товар'}${variantText}`,
    skuText,
    packageText ? `Таңгак: ${packageText}` : '',
    priceText,
    priceStockDisclaimer,
  ]
    .filter(Boolean)
    .join('\n')
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
    '',
    priceStockDisclaimer,
  ]

  return lines.join('\n')
}

export function getWhatsAppUrl(text) {
  return `https://wa.me/${contactConfig.whatsapp}?text=${encodeURIComponent(text)}`
}
