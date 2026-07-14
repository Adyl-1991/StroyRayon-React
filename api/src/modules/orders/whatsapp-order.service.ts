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
    pdfUrl?: string
  }) {
    const { orderNumber, customer, items, total, currency, pdfUrl } = input
    const isRu = input.locale === 'ru'
    const amount = new Intl.NumberFormat(isRu ? 'ru-RU' : 'ky-KG', {
      maximumFractionDigits: 2,
    }).format(total)
    const currencyLabel = currency === 'KGS' ? 'сом' : currency

    const lines = [
      isRu ? 'Здравствуйте! Новый заказ с сайта StroyRayon.' : 'Саламатсызбы! StroyRayon сайтынан жаңы буйрутма.',
      '',
      `${isRu ? 'Заказ' : 'Буйрутма'} № ${orderNumber}`,
      `${isRu ? 'Покупатель' : 'Кардар'}: ${customer.name}`,
      `${isRu ? 'Телефон' : 'Телефон'}: ${customer.phone}`,
      `${isRu ? 'Позиций' : 'Позициялар'}: ${items.length}`,
      `${isRu ? 'Итого' : 'Жалпы сумма'}: ${amount} ${currencyLabel}`,
      '',
      pdfUrl ? `${isRu ? 'PDF заказа' : 'Буйрутманын PDF файлы'}: ${pdfUrl}` : null,
      '',
      isRu
        ? 'Пожалуйста, подтвердите наличие и условия доставки.'
        : 'Товардын бар-жогун жана жеткирүү шарттарын тактап бериңиз.',
    ]

    return lines.filter((line) => line !== null).join('\n')
  }

  buildWhatsappUrl(text: string, managerPhone?: string) {
    const fallbackPhone = '996700123456'
    const phone = (managerPhone || fallbackPhone).replace(/[^\d]/g, '')

    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
  }
}
