import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { OrderStatus, Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AdminOrdersQueryDto } from './dto/admin-orders-query.dto'

const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.NEW]: [
    OrderStatus.PENDING_CONFIRMATION,
    OrderStatus.CONFIRMED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PENDING_CONFIRMATION]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.ASSEMBLING, OrderStatus.CANCELLED],
  [OrderStatus.ASSEMBLING]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
}

@Injectable()
export class AdminOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminOrdersQueryDto) {
    const where = query.status ? { status: query.status } : {}
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          customer: true,
          items: {
            select: {
              stockCheckStatus: true,
              reservedQuantity: true,
            },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ])

    return {
      items: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        customerName: order.customer.name,
        phone: order.customer.phone,
        total: Number(order.total),
        currency: order.currency,
        status: order.status.toLowerCase(),
        paymentStatus: null,
        availabilityCheckRequired: order.availabilityCheckRequired,
        stockStatus: this.stockSummary(order.items),
      })),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    }
  }

  async detail(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        statusHistory: {
          orderBy: { createdAt: 'asc' },
          include: { adminUser: { select: { id: true, name: true, email: true } } },
        },
      },
    })
    if (!order) throw new NotFoundException('Order not found')

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      status: order.status.toLowerCase(),
      customer: order.customer,
      customerComment: order.customerComment,
      adminNote: order.adminNote,
      subtotal: Number(order.subtotal),
      deliveryPrice: Number(order.deliveryPrice),
      total: Number(order.total),
      currency: order.currency,
      availabilityCheckRequired: order.availabilityCheckRequired,
      stockStatus: this.stockSummary(order.items),
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        slug: item.productSlugSnapshot,
        title: item.productTitleSnapshot,
        sku: item.productSkuSnapshot,
        unit: item.productUnitSnapshot,
        unitPrice: Number(item.unitPriceSnapshot),
        quantity: item.quantity,
        lineTotal: Number(item.totalSnapshot),
        stockCheckStatus: item.stockCheckStatus.toLowerCase(),
        reservedQuantity: item.reservedQuantity,
      })),
      statusHistory: order.statusHistory.map((event) => ({
        id: event.id,
        fromStatus: event.fromStatus?.toLowerCase() || null,
        toStatus: event.toStatus.toLowerCase(),
        createdAt: event.createdAt,
        admin: event.adminUser,
      })),
    }
  }

  async updateStatus(id: string, nextStatus: OrderStatus, adminUserId: string) {
    await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true },
      })
      if (!order) throw new NotFoundException('Order not found')
      if (order.status === nextStatus) return
      if (!allowedTransitions[order.status].includes(nextStatus)) {
        throw new BadRequestException(
          `Status cannot change from ${order.status.toLowerCase()} to ${nextStatus.toLowerCase()}`,
        )
      }

      if (nextStatus === OrderStatus.CANCELLED) {
        await this.releaseReservations(tx, order.items)
      }
      if (nextStatus === OrderStatus.DELIVERED) {
        await this.fulfillReservations(tx, order.items)
      }

      await tx.order.update({
        where: { id },
        data: {
          status: nextStatus,
          statusHistory: {
            create: {
              fromStatus: order.status,
              toStatus: nextStatus,
              adminUserId,
            },
          },
        },
      })
    })

    return this.detail(id)
  }

  async updateNote(id: string, note: string) {
    const exists = await this.prisma.order.findUnique({ where: { id }, select: { id: true } })
    if (!exists) throw new NotFoundException('Order not found')

    await this.prisma.order.update({
      where: { id },
      data: { adminNote: note.trim() || null },
    })
    return this.detail(id)
  }

  private stockSummary(items: Array<{ stockCheckStatus: string; reservedQuantity: number }>) {
    if (items.some((item) => item.stockCheckStatus !== 'OK')) return 'needs_confirmation'
    if (items.some((item) => item.reservedQuantity > 0)) return 'reserved'
    return 'confirmed'
  }

  private async releaseReservations(
    tx: Prisma.TransactionClient,
    items: Array<{ productId: string | null; reservedQuantity: number; id: string }>,
  ) {
    for (const item of items) {
      if (!item.productId || item.reservedQuantity <= 0) continue
      const result = await tx.stock.updateMany({
        where: {
          productId: item.productId,
          reservedQuantity: { gte: item.reservedQuantity },
        },
        data: { reservedQuantity: { decrement: item.reservedQuantity } },
      })
      if (result.count !== 1) {
        throw new BadRequestException('Stock reservation could not be released safely')
      }
      await tx.orderItem.update({
        where: { id: item.id },
        data: { reservedQuantity: 0 },
      })
    }
  }

  private async fulfillReservations(
    tx: Prisma.TransactionClient,
    items: Array<{ productId: string | null; reservedQuantity: number; id: string }>,
  ) {
    for (const item of items) {
      if (!item.productId || item.reservedQuantity <= 0) continue
      const result = await tx.stock.updateMany({
        where: {
          productId: item.productId,
          quantity: { gte: item.reservedQuantity },
          reservedQuantity: { gte: item.reservedQuantity },
        },
        data: {
          quantity: { decrement: item.reservedQuantity },
          reservedQuantity: { decrement: item.reservedQuantity },
        },
      })
      if (result.count !== 1) {
        throw new BadRequestException('Reserved stock could not be fulfilled safely')
      }
      await tx.orderItem.update({
        where: { id: item.id },
        data: { reservedQuantity: 0 },
      })
    }
  }
}
