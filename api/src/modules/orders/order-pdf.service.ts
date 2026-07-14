import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import PDFDocument = require('pdfkit')
import { PrismaService } from '../../prisma/prisma.service'

type PdfLocale = 'kg' | 'ru'

type PdfTokenPayload = {
  expiresAt: number
  locale: PdfLocale
}

@Injectable()
export class OrderPdfService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  createPublicPdfUrl(orderId: string, locale: PdfLocale) {
    const ttlSeconds = Math.max(
      300,
      Number(this.configService.get<string>('ORDER_PDF_LINK_TTL_SECONDS') || 604800),
    )
    const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds
    const signature = this.sign(orderId, expiresAt, locale)
    const token = `${expiresAt}.${locale}.${signature}`
    const apiOrigin = (
      this.configService.get<string>('PUBLIC_API_ORIGIN') || 'http://localhost:4000'
    ).replace(/\/$/, '')

    return `${apiOrigin}/api/orders/${encodeURIComponent(orderId)}/pdf?token=${encodeURIComponent(token)}`
  }

  async createPublicPdf(orderId: string, token: string) {
    const { locale } = this.verifyToken(orderId, token)
    return this.createOrderPdf(orderId, locale)
  }

  private async createOrderPdf(orderId: string, locale: PdfLocale) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          orderBy: { id: 'asc' },
        },
      },
    })
    if (!order) throw new NotFoundException('Order not found')

    const buffer = await this.renderPdf({
      locale,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      customer: order.customer,
      comment: order.customerComment,
      subtotal: Number(order.subtotal),
      deliveryPrice: Number(order.deliveryPrice),
      total: Number(order.total),
      currency: order.currency,
      items: order.items.map((item) => ({
        title: item.productTitleSnapshot,
        variantTitle: item.variantTitleSnapshot,
        sku: item.variantSkuSnapshot || item.productSkuSnapshot,
        unit: item.productUnitSnapshot,
        unitPrice: Number(item.unitPriceSnapshot),
        quantity: item.quantity,
        lineTotal: Number(item.totalSnapshot),
      })),
    })

    return {
      buffer,
      filename: `StroyRayon-${order.orderNumber}.pdf`,
    }
  }

  private renderPdf(input: {
    locale: PdfLocale
    orderNumber: string
    createdAt: Date
    customer: { name: string; phone: string; region?: string | null; address?: string | null }
    comment?: string | null
    subtotal: number
    deliveryPrice: number
    total: number
    currency: string
    items: Array<{
      title: string
      variantTitle?: string | null
      sku?: string | null
      unit: string
      unitPrice: number
      quantity: number
      lineTotal: number
    }>
  }) {
    const regularFont = join(process.cwd(), 'assets', 'fonts', 'NotoSans-Regular.ttf')
    const boldFont = join(process.cwd(), 'assets', 'fonts', 'NotoSans-Bold.ttf')
    if (!existsSync(regularFont) || !existsSync(boldFont)) {
      throw new Error('PDF fonts are missing')
    }

    const isRu = input.locale === 'ru'
    const labels = isRu
      ? {
          document: 'Заказ',
          date: 'Дата',
          customer: 'Покупатель',
          phone: 'Телефон',
          address: 'Адрес',
          comment: 'Комментарий',
          position: 'Товар / вариант',
          quantity: 'Кол-во',
          price: 'Цена',
          amount: 'Сумма',
          subtotal: 'Товары',
          delivery: 'Доставка',
          total: 'Итого к оплате',
          deliveryPending: 'уточняется менеджером',
          note: 'Наличие товара и условия доставки подтверждаются менеджером StroyRayon.',
        }
      : {
          document: 'Буйрутма',
          date: 'Дата',
          customer: 'Кардар',
          phone: 'Телефон',
          address: 'Дарек',
          comment: 'Комментарий',
          position: 'Товар / вариант',
          quantity: 'Саны',
          price: 'Баасы',
          amount: 'Суммасы',
          subtotal: 'Товарлар',
          delivery: 'Жеткирүү',
          total: 'Жалпы төлөм',
          deliveryPending: 'менеджер тактайт',
          note: 'Товардын бар-жогу жана жеткирүү шарттары StroyRayon менеджери менен такталат.',
        }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 42,
        bufferPages: true,
        info: {
          Title: `${labels.document} ${input.orderNumber}`,
          Author: 'StroyRayon',
          Subject: 'Order summary',
        },
      })
      const chunks: Buffer[] = []
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
      doc.on('error', reject)
      doc.on('end', () => resolve(Buffer.concat(chunks)))

      doc.registerFont('NotoSans', regularFont)
      doc.registerFont('NotoSansBold', boldFont)

      const left = 42
      const right = 553
      const contentWidth = right - left
      const green = '#1f6b4f'
      const dark = '#17251f'
      const muted = '#66746e'
      const border = '#d9e1dc'
      const soft = '#f3f7f4'

      const money = (value: number) => {
        const formatted = new Intl.NumberFormat(isRu ? 'ru-RU' : 'ky-KG', {
          maximumFractionDigits: 2,
        }).format(value)
        return `${formatted} ${input.currency === 'KGS' ? 'сом' : input.currency}`
      }

      const drawPageHeader = () => {
        doc.rect(0, 0, 595.28, 14).fill(green)
        doc.font('NotoSansBold').fontSize(17).fillColor(green).text('StroyRayon', left, 34)
        doc
          .font('NotoSans')
          .fontSize(9)
          .fillColor(muted)
          .text('Курулуш материалдары • Строительные материалы', left, 57)
        doc
          .font('NotoSansBold')
          .fontSize(20)
          .fillColor(dark)
          .text(`${labels.document} № ${input.orderNumber}`, 290, 34, {
            width: right - 290,
            align: 'right',
          })
        doc
          .font('NotoSans')
          .fontSize(9)
          .fillColor(muted)
          .text(
            `${labels.date}: ${new Intl.DateTimeFormat(isRu ? 'ru-RU' : 'ky-KG', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(input.createdAt)}`,
            290,
            62,
            { width: right - 290, align: 'right' },
          )
      }

      const drawTableHeader = (y: number) => {
        doc.roundedRect(left, y, contentWidth, 30, 6).fill(green)
        doc.font('NotoSansBold').fontSize(8).fillColor('#ffffff')
        doc.text(labels.position, left + 10, y + 9, { width: 253 })
        doc.text(labels.quantity, 318, y + 9, { width: 54, align: 'center' })
        doc.text(labels.price, 378, y + 9, { width: 76, align: 'right' })
        doc.text(labels.amount, 461, y + 9, { width: 82, align: 'right' })
        return y + 36
      }

      const ensureSpace = (needed: number) => {
        if (doc.y + needed <= 770) return false
        doc.addPage()
        drawPageHeader()
        doc.y = 94
        return true
      }

      drawPageHeader()
      let y = 96

      const address = [input.customer.region, input.customer.address].filter(Boolean).join(', ') || '—'
      doc.roundedRect(left, y, contentWidth, 88, 10).fill(soft).stroke(border)
      doc.font('NotoSansBold').fontSize(10).fillColor(dark).text(labels.customer, left + 14, y + 12)
      doc.font('NotoSans').fontSize(10).fillColor(dark)
      doc.text(input.customer.name, left + 14, y + 32, { width: 232 })
      doc.font('NotoSansBold').fontSize(8).fillColor(muted).text(labels.phone, 304, y + 12)
      doc.font('NotoSans').fontSize(10).fillColor(dark).text(input.customer.phone, 304, y + 30, { width: 225 })
      doc.font('NotoSansBold').fontSize(8).fillColor(muted).text(labels.address, 304, y + 50)
      doc.font('NotoSans').fontSize(9).fillColor(dark).text(address, 304, y + 65, { width: 225, height: 18, ellipsis: true })
      y += 104

      y = drawTableHeader(y)
      input.items.forEach((item, index) => {
        const productName = `${index + 1}. ${item.title}${item.variantTitle ? ` — ${item.variantTitle}` : ''}`
        const details = [item.sku ? `SKU: ${item.sku}` : '', item.unit].filter(Boolean).join(' • ')
        doc.font('NotoSansBold').fontSize(9)
        const nameHeight = doc.heightOfString(productName, { width: 245 })
        const rowHeight = Math.max(56, nameHeight + 30)
        if (ensureSpace(rowHeight + 42)) y = drawTableHeader(94)

        doc.roundedRect(left, y, contentWidth, rowHeight, 6).fill(index % 2 ? '#f8faf9' : '#ffffff').stroke(border)
        doc.font('NotoSansBold').fontSize(9).fillColor(dark).text(productName, left + 10, y + 9, { width: 245 })
        doc.font('NotoSans').fontSize(7.5).fillColor(muted).text(details, left + 10, y + 13 + nameHeight, { width: 245 })
        doc.font('NotoSansBold').fontSize(10).fillColor(dark)
        doc.text(`${item.quantity} ${item.unit}`, 318, y + 19, { width: 54, align: 'center' })
        doc.font('NotoSans').fontSize(9).text(money(item.unitPrice), 378, y + 19, { width: 76, align: 'right' })
        doc.font('NotoSansBold').fontSize(9).text(money(item.lineTotal), 461, y + 19, { width: 82, align: 'right' })
        y += rowHeight + 7
        doc.y = y
      })

      ensureSpace(150)
      y = doc.y + 8
      if (input.comment) {
        const commentHeight = Math.min(54, doc.heightOfString(input.comment, { width: contentWidth - 24 }) + 25)
        doc.roundedRect(left, y, contentWidth, commentHeight, 8).fill('#fffaf0').stroke('#ead8ad')
        doc.font('NotoSansBold').fontSize(8).fillColor('#826323').text(labels.comment, left + 12, y + 9)
        doc.font('NotoSans').fontSize(8.5).fillColor(dark).text(input.comment, left + 12, y + 23, {
          width: contentWidth - 24,
          height: commentHeight - 27,
          ellipsis: true,
        })
        y += commentHeight + 10
      }

      const totalsX = 320
      const totalsWidth = right - totalsX
      const line = (label: string, value: string, bold = false) => {
        doc.font(bold ? 'NotoSansBold' : 'NotoSans').fontSize(bold ? 11 : 9).fillColor(bold ? dark : muted)
        doc.text(label, totalsX, y, { width: 112 })
        doc.text(value, totalsX + 110, y, { width: totalsWidth - 110, align: 'right' })
        y += bold ? 25 : 20
      }
      line(labels.subtotal, money(input.subtotal))
      line(labels.delivery, input.deliveryPrice > 0 ? money(input.deliveryPrice) : labels.deliveryPending)
      doc.moveTo(totalsX, y).lineTo(right, y).strokeColor(border).stroke()
      y += 10
      line(labels.total, money(input.total), true)

      y += 10
      doc.font('NotoSans').fontSize(8).fillColor(muted).text(labels.note, left, y, {
        width: contentWidth,
        align: 'center',
      })

      const range = doc.bufferedPageRange()
      for (let pageIndex = 0; pageIndex < range.count; pageIndex += 1) {
        doc.switchToPage(pageIndex)
        doc.font('NotoSans').fontSize(7.5).fillColor('#8a9691')
        doc.text(
          `StroyRayon • ${input.orderNumber} • ${pageIndex + 1}/${range.count}`,
          left,
          784,
          { width: contentWidth, align: 'center' },
        )
      }

      doc.end()
    })
  }

  private verifyToken(orderId: string, token: string): PdfTokenPayload {
    const [expiresRaw, localeRaw, signature] = String(token || '').split('.')
    const expiresAt = Number(expiresRaw)
    const locale = localeRaw === 'ru' ? 'ru' : localeRaw === 'kg' ? 'kg' : null
    if (!expiresAt || !locale || !signature || expiresAt < Math.floor(Date.now() / 1000)) {
      throw new UnauthorizedException('PDF link is invalid or expired')
    }

    const expected = this.sign(orderId, expiresAt, locale)
    const providedBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)
    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('PDF link is invalid or expired')
    }

    return { expiresAt, locale }
  }

  private sign(orderId: string, expiresAt: number, locale: PdfLocale) {
    const secret =
      this.configService.get<string>('ORDER_PDF_SECRET') ||
      this.configService.get<string>('ADMIN_JWT_SECRET') ||
      ''
    if (secret.length < 32) throw new Error('ORDER_PDF_SECRET must contain at least 32 characters')

    return createHmac('sha256', secret)
      .update(`${orderId}.${expiresAt}.${locale}`)
      .digest('base64url')
  }
}
