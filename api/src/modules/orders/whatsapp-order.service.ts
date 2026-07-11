import { Injectable } from '@nestjs/common'

@Injectable()
export class WhatsappOrderService {
  buildWhatsappOrderText(input: {
    orderNumber: string
    customer: { name: string; phone: string; region?: string | null; address?: string | null }
    items: Array<{
      title: string
      sku?: string | null
      variantTitle?: string | null
      variantSku?: string | null
      price: number
      quantity: number
      unit?: string | null
      total: number
    }>
    total: number
    currency: string
    comment?: string | null
    locale?: 'kg' | 'ru'
  }) {
    const { orderNumber, customer, items, total, currency, comment } = input
    const isRu = input.locale === 'ru'
    const location = [customer.region, customer.address].filter(Boolean).join(', ')
    const lines = [
      isRu ? 'Здравствуйте! Новый заказ с сайта StroyRayon.' : 'Салам! StroyRayon сайтынан жаңы заказ.',
      `${isRu ? 'Номер заказа' : 'Заказ номери'}: ${orderNumber}`,
      `${isRu ? 'Имя клиента' : 'Кардар аты'}: ${customer.name}`,
      `${isRu ? 'Телефон' : 'Телефон'}: ${customer.phone}`,
      location ? `${isRu ? 'Адрес/регион' : 'Дарек/регион'}: ${location}` : null,
      '',
      isRu ? 'Товары:' : 'Товарлар:',
      ...items.map((item, index) => {
        const variantText = item.variantTitle ? ` - ${item.variantTitle}` : ''
        const sku = item.variantSku || item.sku
        return `${index + 1}) ${item.title}${variantText}${sku ? ` (${sku})` : ''} - ${item.quantity}${item.unit ? ` ${item.unit}` : ''} x ${item.price} = ${item.total} ${currency}`
      }),
      '',
      `${isRu ? 'Общая сумма' : 'Жалпы сумма'}: ${total} ${currency}`,
      comment ? `${isRu ? 'Комментарий' : 'Комментарий'}: ${comment}` : null,
      '',
      isRu
        ? 'Пожалуйста, подтвердите наличие и условия доставки.'
        : 'Жеткирүү жана товар бар-жогун тактап бериңиз.',
    ]

    return lines.filter(Boolean).join('\n')
  }

  buildWhatsappUrl(text: string, managerPhone?: string) {
    const fallbackPhone = '996700123456'
    const phone = (managerPhone || fallbackPhone).replace(/[^\d]/g, '')

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
  }
}
