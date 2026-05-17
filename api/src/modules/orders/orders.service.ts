import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { OrderStatus, Prisma, Product } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { CreateOrderItemDto } from './dto/create-order-item.dto'
import { WhatsappOrderService } from './whatsapp-order.service'

type OrderProductLookup = Pick<Product, 'id' | 'sku' | 'slug' | 'titleKg' | 'stockStatus'>

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly whatsappOrderService: WhatsappOrderService,
  ) {}

  async create(dto: CreateOrderDto) {
    const currency = 'KGS'
    const deliveryPrice = 0
    const source = dto.source || 'website'
    const order = await this.prisma.$transaction(async (tx) => {
      const customer = await tx.customer.upsert({
        where: { phone: dto.customer.phone },
        update: {
          name: dto.customer.name,
          region: dto.customer.region,
          address: dto.customer.address,
        },
        create: {
          name: dto.customer.name,
          phone: dto.customer.phone,
          region: dto.customer.region,
          address: dto.customer.address,
        },
      })
      const orderNumber = await this.createOrderNumber(tx)
      const normalizedItems = await Promise.all(
        dto.items.map(async (item) => {
          const product = await this.findProductForOrderItem(tx, item)
          const price = Number(item.price)
          const quantity = Number(item.quantity)
          const total = price * quantity

          return {
            product,
            title: item.title || product?.titleKg || 'Товар',
            sku: item.sku || product?.sku || '',
            unit: item.unit,
            price,
            quantity,
            total,
          }
        }),
      )
      const subtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0)
      const total = subtotal + deliveryPrice
      const whatsappText = this.whatsappOrderService.buildWhatsappOrderText({
        orderNumber,
        customer,
        items: normalizedItems,
        total,
        currency,
        comment: dto.comment,
      })

      return tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          status: OrderStatus.NEW,
          subtotal: new Prisma.Decimal(subtotal),
          deliveryPrice: new Prisma.Decimal(deliveryPrice),
          total: new Prisma.Decimal(total),
          currency,
          source,
          whatsappText,
          customerComment: dto.comment,
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.product?.id,
              productTitleSnapshot: item.title,
              productSkuSnapshot: item.sku,
              unitPriceSnapshot: new Prisma.Decimal(item.price),
              quantity: item.quantity,
              totalSnapshot: new Prisma.Decimal(item.total),
            })),
          },
        },
        include: {
          customer: true,
          items: true,
        },
      })
    })
    const total = Number(order.total)
    const whatsappUrl = this.whatsappOrderService.buildWhatsappUrl(
      order.whatsappText,
      this.configService.get<string>('WHATSAPP_MANAGER_PHONE') || this.configService.get<string>('SITE_WHATSAPP_MANAGER_PHONE'),
    )

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase(),
      total,
      currency: order.currency,
      whatsappText: order.whatsappText,
      whatsappUrl,
    }
  }

  private async createOrderNumber(tx: Prisma.TransactionClient) {
    const now = new Date()
    const year = now.getFullYear()
    const startOfYear = new Date(year, 0, 1)
    const startOfNextYear = new Date(year + 1, 0, 1)
    const orderCount = await tx.order.count({
      where: {
        createdAt: {
          gte: startOfYear,
          lt: startOfNextYear,
        },
      },
    })

    return `SR-${year}-${String(orderCount + 1).padStart(6, '0')}`
  }

  private async findProductForOrderItem(tx: Prisma.TransactionClient, item: CreateOrderItemDto) {
    const select = {
      id: true,
      sku: true,
      slug: true,
      titleKg: true,
      stockStatus: true,
    } satisfies Prisma.ProductSelect

    if (item.productId) {
      const product = await tx.product.findUnique({ where: { id: item.productId }, select })
      if (product) return product as OrderProductLookup
    }

    if (item.slug) {
      const product = await tx.product.findUnique({ where: { slug: item.slug }, select })
      if (product) return product as OrderProductLookup
    }

    if (item.sku) {
      const product = await tx.product.findUnique({ where: { sku: item.sku }, select })
      if (product) return product as OrderProductLookup
    }

    return null
  }
}
