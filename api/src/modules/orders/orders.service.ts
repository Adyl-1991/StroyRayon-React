import { BadRequestException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  OrderItemStockCheckStatus,
  OrderStatus,
  Prisma,
} from '@prisma/client'
import { formatOrderNumber } from '../../common/utils/order-number.util'
import { PrismaService } from '../../prisma/prisma.service'
import { StockService } from '../stock/stock.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { CreateOrderItemDto } from './dto/create-order-item.dto'
import { calculateLineTotal, getStockCheckStatus } from './order-pricing.util'
import { WhatsappOrderService } from './whatsapp-order.service'

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly whatsappOrderService: WhatsappOrderService,
    private readonly stockService: StockService,
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
          const quantity = Number(item.quantity)
          const price = Number(product.price)
          const stockCheckStatus = product.isActive
            ? getStockCheckStatus(product.stockStatus, product.stock, quantity)
            : OrderItemStockCheckStatus.UNAVAILABLE

          if (stockCheckStatus === OrderItemStockCheckStatus.UNAVAILABLE) {
            throw new BadRequestException(`Product is unavailable: ${product.slug}`)
          }

          return {
            product,
            title: product.titleKg,
            sku: product.sku,
            slug: product.slug,
            unit: product.unit,
            price,
            quantity,
            total: calculateLineTotal(price, quantity),
            stockCheckStatus,
            reservedQuantity: 0,
          }
        }),
      )

      const itemsByProduct = new Map<string, typeof normalizedItems>()
      normalizedItems.forEach((item) => {
        const productItems = itemsByProduct.get(item.product.id) || []
        productItems.push(item)
        itemsByProduct.set(item.product.id, productItems)
      })
      for (const productItems of itemsByProduct.values()) {
        const firstItem = productItems[0]
        const requestedQuantity = productItems.reduce((sum, item) => sum + item.quantity, 0)
        const stockCheckStatus = getStockCheckStatus(
          firstItem.product.stockStatus,
          firstItem.product.stock,
          requestedQuantity,
        )

        if (stockCheckStatus === OrderItemStockCheckStatus.UNAVAILABLE) {
          throw new BadRequestException(`Product is unavailable: ${firstItem.product.slug}`)
        }

        if (stockCheckStatus !== OrderItemStockCheckStatus.OK || !firstItem.product.stock) {
          productItems.forEach((item) => {
            item.stockCheckStatus = OrderItemStockCheckStatus.NEEDS_CONFIRMATION
          })
          continue
        }

        const reserved = await this.stockService.reserveAvailableProduct(
          tx,
          firstItem.product.id,
          requestedQuantity,
          firstItem.product.stock,
        )

        productItems.forEach((item) => {
          item.stockCheckStatus = reserved
            ? OrderItemStockCheckStatus.OK
            : OrderItemStockCheckStatus.NEEDS_CONFIRMATION
          item.reservedQuantity = reserved ? item.quantity : 0
        })
      }

      const subtotal = normalizedItems.reduce((sum, item) => sum + item.total, 0)
      const total = subtotal + deliveryPrice
      const availabilityCheckRequired = normalizedItems.some(
        (item) => item.stockCheckStatus !== OrderItemStockCheckStatus.OK,
      )
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
          availabilityCheckRequired,
          items: {
            create: normalizedItems.map((item) => ({
              productId: item.product.id,
              productSlugSnapshot: item.slug,
              productTitleSnapshot: item.title,
              productSkuSnapshot: item.sku,
              productUnitSnapshot: item.unit,
              unitPriceSnapshot: new Prisma.Decimal(item.price),
              quantity: item.quantity,
              totalSnapshot: new Prisma.Decimal(item.total),
              stockCheckStatus: item.stockCheckStatus,
              reservedQuantity: item.reservedQuantity,
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
      availabilityCheckRequired: order.availabilityCheckRequired,
      items: order.items.map((item) => ({
        productId: item.productId,
        slug: item.productSlugSnapshot,
        title: item.productTitleSnapshot,
        sku: item.productSkuSnapshot,
        unit: item.productUnitSnapshot,
        quantity: item.quantity,
        unitPrice: Number(item.unitPriceSnapshot),
        lineTotal: Number(item.totalSnapshot),
        stockCheckStatus: item.stockCheckStatus.toLowerCase(),
        reservedQuantity: item.reservedQuantity,
      })),
      whatsappText: order.whatsappText,
      whatsappUrl,
    }
  }

  private async createOrderNumber(tx: Prisma.TransactionClient) {
    const now = new Date()
    const year = now.getFullYear()
    const sequence = await tx.orderSequence.upsert({
      where: { year },
      update: {
        value: { increment: 1 },
      },
      create: { year, value: 1 },
    })

    return formatOrderNumber(year, sequence.value)
  }

  private async findProductForOrderItem(tx: Prisma.TransactionClient, item: CreateOrderItemDto) {
    const select = {
      id: true,
      sku: true,
      slug: true,
      titleKg: true,
      price: true,
      unit: true,
      isActive: true,
      stockStatus: true,
      stock: {
        select: {
          quantity: true,
          reservedQuantity: true,
        },
      },
    } satisfies Prisma.ProductSelect

    if (item.productId) {
      const product = await tx.product.findUnique({ where: { id: item.productId }, select })
      if (product) {
        if (item.slug && item.slug !== product.slug) {
          throw new BadRequestException(`Product identifier mismatch: ${item.slug}`)
        }
        return product
      }
    }

    if (item.slug) {
      const product = await tx.product.findUnique({ where: { slug: item.slug }, select })
      if (product) return product
    }

    if (item.sku) {
      const product = await tx.product.findUnique({ where: { sku: item.sku }, select })
      if (product) return product
    }

    throw new BadRequestException(`Product not found: ${item.slug || item.productId || item.sku || 'unknown'}`)
  }
}
