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
          const { product, variant } = await this.findProductForOrderItem(tx, item)
          const quantity = Number(item.quantity)
          const price = Number(variant?.price ?? product.price)
          const stockStatus = variant?.stockStatus ?? product.stockStatus
          const stock = variant
            ? { quantity: variant.stockQuantity, reservedQuantity: variant.reservedQuantity }
            : product.stock
          const stockCheckStatus = product.isActive && (!variant || variant.isActive)
            ? getStockCheckStatus(stockStatus, stock, quantity)
            : OrderItemStockCheckStatus.UNAVAILABLE

          if (stockCheckStatus === OrderItemStockCheckStatus.UNAVAILABLE) {
            throw new BadRequestException(`Product is unavailable: ${product.slug}`)
          }

          return {
            product,
            variant,
            title: product.titleKg,
            variantTitle: variant?.titleKg || null,
            sku: variant?.sku || product.sku,
            productSku: product.sku,
            variantSku: variant?.sku || null,
            slug: product.slug,
            unit: variant?.unit || product.unit,
            price,
            quantity,
            total: calculateLineTotal(price, quantity),
            stockCheckStatus,
            reservedQuantity: 0,
          }
        }),
      )

      const itemsByVariant = new Map<string, typeof normalizedItems>()
      normalizedItems.filter((item) => item.variant).forEach((item) => {
        const variantItems = itemsByVariant.get(item.variant!.id) || []
        variantItems.push(item)
        itemsByVariant.set(item.variant!.id, variantItems)
      })
      for (const variantItems of itemsByVariant.values()) {
        const firstItem = variantItems[0]
        const requestedQuantity = variantItems.reduce((sum, item) => sum + item.quantity, 0)
        const variantStock = {
          quantity: firstItem.variant!.stockQuantity,
          reservedQuantity: firstItem.variant!.reservedQuantity,
        }
        const stockCheckStatus = getStockCheckStatus(
          firstItem.variant!.stockStatus,
          variantStock,
          requestedQuantity,
        )

        if (stockCheckStatus === OrderItemStockCheckStatus.UNAVAILABLE) {
          throw new BadRequestException(`Product variant is unavailable: ${firstItem.product.slug}`)
        }

        if (stockCheckStatus !== OrderItemStockCheckStatus.OK) {
          variantItems.forEach((item) => {
            item.stockCheckStatus = OrderItemStockCheckStatus.NEEDS_CONFIRMATION
          })
          continue
        }

        const reserved = await this.stockService.reserveAvailableVariant(
          tx,
          firstItem.variant!.id,
          requestedQuantity,
          firstItem.variant!,
        )

        variantItems.forEach((item) => {
          item.stockCheckStatus = reserved
            ? OrderItemStockCheckStatus.OK
            : OrderItemStockCheckStatus.NEEDS_CONFIRMATION
          item.reservedQuantity = reserved ? item.quantity : 0
        })
      }

      const itemsByProduct = new Map<string, typeof normalizedItems>()
      normalizedItems.filter((item) => !item.variant).forEach((item) => {
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
              variantId: item.variant?.id || null,
              productSlugSnapshot: item.slug,
              productTitleSnapshot: item.title,
              productSkuSnapshot: item.productSku,
              variantTitleSnapshot: item.variantTitle,
              variantSkuSnapshot: item.variantSku,
              productUnitSnapshot: item.unit,
              unitPriceSnapshot: new Prisma.Decimal(item.price),
              quantity: item.quantity,
              totalSnapshot: new Prisma.Decimal(item.total),
              stockCheckStatus: item.stockCheckStatus,
              reservedQuantity: item.reservedQuantity,
            })),
          },
          statusHistory: {
            create: {
              toStatus: OrderStatus.NEW,
            },
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
        variantId: item.variantId,
        variantTitle: item.variantTitleSnapshot,
        variantSku: item.variantSkuSnapshot,
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
    const productSelect = {
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

    if (item.variantId) {
      const variant = await tx.productVariant.findUnique({
        where: { id: item.variantId },
        include: { product: { select: productSelect } },
      })
      if (!variant) throw new BadRequestException(`Product variant not found: ${item.variantId}`)
      if (item.productId && item.productId !== variant.productId) {
        throw new BadRequestException(`Product identifier mismatch: ${item.productId}`)
      }
      if (item.slug && item.slug !== variant.product.slug) {
        throw new BadRequestException(`Product identifier mismatch: ${item.slug}`)
      }
      return { product: variant.product, variant }
    }

    if (item.productId) {
      const product = await tx.product.findUnique({ where: { id: item.productId }, select: productSelect })
      if (product) {
        if (item.slug && item.slug !== product.slug) {
          throw new BadRequestException(`Product identifier mismatch: ${item.slug}`)
        }
        return { product, variant: null }
      }
    }

    if (item.slug) {
      const product = await tx.product.findUnique({ where: { slug: item.slug }, select: productSelect })
      if (product) return { product, variant: null }
    }

    if (item.sku) {
      const product = await tx.product.findUnique({ where: { sku: item.sku }, select: productSelect })
      if (product) return { product, variant: null }
    }

    throw new BadRequestException(`Product not found: ${item.slug || item.productId || item.sku || 'unknown'}`)
  }
}
