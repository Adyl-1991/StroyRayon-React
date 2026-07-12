import { formatPrice } from '../utils/formatPrice'
import { getLocalizedProductValue, getProductBySlug, getProductTitle, getUnitLabel, normalizeKgText } from './productService'
import { contactConfig, getWhatsAppUrl } from '../config/contact'

export { contactConfig, getWhatsAppUrl }

export const businessHours = [
  'Шейшемби - Жекшемби: 09:00 - 19:00',
  'Дүйшөмбү: эс алуу күнү',
  'Жума күнү: 13:00 - 14:00 тыныгуу',
]

export const priceStockDisclaimer =
  'Баалар өзгөрүшү мүмкүн. Акыркы бааны жана товар бар-жогун WhatsApp аркылуу тактап беребиз.'

export const shortPriceStockDisclaimer = priceStockDisclaimer
export const priceStockDisclaimerRu =
  'Цены могут измениться. Актуальную цену и наличие уточним через WhatsApp.'

export const deliverySummary = 'Бишкек шаары ичинде жана аймактарга жеткирүү бар.'

const localizedContactDetails = {
  kg: {
    address: 'Бишкек шаары',
    hours: ['Шейшемби - Жекшемби: 09:00 - 19:00', 'Дүйшөмбү: эс алуу күнү', 'Жума күнү: 13:00 - 14:00 тыныгуу'],
    delivery: 'Бишкек шаары ичинде жана аймактарга жеткирүү бар.',
  },
  ru: {
    address: 'город Бишкек',
    hours: ['Вторник - Воскресенье: 09:00 - 19:00', 'Понедельник: выходной', 'Пятница: перерыв 13:00 - 14:00'],
    delivery: 'Доставляем по Бишкеку и в регионы.',
  },
}

export function getContactDetails(locale = 'kg') {
  return localizedContactDetails[locale] || localizedContactDetails.kg
}

function formatOrderItem(item, index, locale) {
  const product = getProductBySlug(item.slug)
  const name = product ? getProductTitle(product, locale) : locale === 'ru' ? item.titleRu || item.name : item.titleKg || item.name
  const variantText = item.variantSize ? ` (${item.variantSize})` : ''
  const skuText = item.variantSku || item.sku ? `, SKU: ${item.variantSku || item.sku}` : ''
  const packageInfo = locale === 'ru' ? item.packageInfoRu : item.packageInfo
  const packageText = packageInfo ? `, ${locale === 'ru' ? 'фасовка' : 'таңгак'}: ${packageInfo}` : ''
  const unit = getUnitLabel(item.unitKg || item.unit, locale)

  return `${index + 1}. ${name}${variantText}${skuText}${packageText} - ${item.quantity} ${unit} x ${formatPrice(item.price)} = ${formatPrice(
    item.price * item.quantity,
  )}`
}

export function buildProductInquiryText({ product, variant, locale = 'kg' }) {
  const variantTitle = locale === 'ru' ? variant?.titleRu || variant?.size : variant?.titleKg || variant?.size
  const variantText = variantTitle ? ` - ${variantTitle}` : ''
  const skuText = variant?.sku || product?.sku ? `SKU: ${variant?.sku || product.sku}` : ''
  const price = variant?.price ?? product?.price
  const isRu = locale === 'ru'
  const packageText = isRu
    ? variant?.packageInfoRu || getLocalizedProductValue(product, 'pack', locale) || getLocalizedProductValue(product, 'minOrder', locale)
    : normalizeKgText(variant?.packageInfo || product?.packageInfoKg || product?.minOrder)
  const unit = getUnitLabel(variant?.unit || product?.unit, locale)
  const priceText = price ? `${isRu ? 'Цена' : 'Баасы'}: ${formatPrice(price)}${unit ? ` / ${unit}` : ''}` : ''

  return [
    isRu
      ? 'Здравствуйте! Хочу уточнить товар на сайте StroyRayon.'
      : 'Салам! StroyRayon сайтынан товар боюнча маалымат алгым келет.',
    `${product?.name || 'Товар'}${variantText}`,
    skuText,
    packageText ? `${isRu ? 'Фасовка' : 'Таңгак'}: ${packageText}` : '',
    priceText,
    isRu ? priceStockDisclaimerRu : priceStockDisclaimer,
  ]
    .filter(Boolean)
    .join('\n')
}

export function buildWhatsAppOrderText({ customer, items, total, locale = 'kg' }) {
  const isRu = locale === 'ru'
  const lines = [
    isRu ? 'Здравствуйте, StroyRayon!' : 'Саламатсызбы, StroyRayon!',
    isRu ? 'Хочу оформить заказ.' : 'Буйрутма бергим келет.',
    '',
    `${isRu ? 'Имя' : 'Аты-жөнү'}: ${customer.name}`,
    `${isRu ? 'Телефон' : 'Телефон'}: ${customer.phone}`,
    `${isRu ? 'Адрес/регион' : 'Дарек/регион'}: ${customer.address}`,
    '',
    isRu ? 'Товары:' : 'Товарлар:',
    ...items.map((item, index) => formatOrderItem(item, index, locale)),
    '',
    `${isRu ? 'Общая сумма' : 'Жалпы сумма'}: ${formatPrice(total)}`,
    `${isRu ? 'Комментарий' : 'Кошумча маалымат'}: ${customer.comment || (isRu ? 'Нет' : 'Жок')}`,
    '',
    isRu ? priceStockDisclaimerRu : priceStockDisclaimer,
  ]

  return lines.join('\n')
}
