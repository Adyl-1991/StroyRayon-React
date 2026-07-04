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
  }) {
    const { orderNumber, customer, items, total, currency, comment } = input
    const location = [customer.region, customer.address].filter(Boolean).join(', ')
    const lines = [
      'Салам! StroyRayon сайтынан жаңы заказ.',
      `Заказ номери: ${orderNumber}`,
      `Кардар аты: ${customer.name}`,
      `Телефон: ${customer.phone}`,
      location ? `Дарек/регион: ${location}` : null,
      '',
      'Товарлар:',
      ...items.map((item, index) => {
        const variantText = item.variantTitle ? ` - ${item.variantTitle}` : ''
        const sku = item.variantSku || item.sku
        return `${index + 1}) ${item.title}${variantText}${sku ? ` (${sku})` : ''} - ${item.quantity}${item.unit ? ` ${item.unit}` : ''} x ${item.price} = ${item.total} ${currency}`
      }),
      '',
      `Жалпы сумма: ${total} ${currency}`,
      comment ? `Комментарий: ${comment}` : null,
      '',
      'Жеткирүү жана наличиени тактап бериңиз.',
    ]

    return lines.filter(Boolean).join('\n')
  }

  buildWhatsappUrl(text: string, managerPhone?: string) {
    const fallbackPhone = '996700123456'
    const phone = (managerPhone || fallbackPhone).replace(/[^\d]/g, '')

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
  }
}
