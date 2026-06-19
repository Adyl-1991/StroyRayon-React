import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, ProductStockStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AdminProductsQueryDto } from './dto/admin-products-query.dto'

const adminProductInclude = {
  brand: { select: { id: true, name: true, slug: true } },
  catalogNode: { select: { id: true, titleKg: true, path: true } },
  stock: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.ProductInclude

type AdminProduct = Prisma.ProductGetPayload<{ include: typeof adminProductInclude }>

@Injectable()
export class AdminProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminProductsQueryDto) {
    const normalizedPath = query.catalogPath?.trim().replace(/^\/+|\/+$/g, '')
    const search = query.q?.trim()
    const where: Prisma.ProductWhereInput = {
      ...(search
        ? {
            OR: [
              { titleKg: { contains: search, mode: 'insensitive' } },
              { titleRu: { contains: search, mode: 'insensitive' } },
              { slug: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(normalizedPath ? { catalogNode: { path: { startsWith: normalizedPath } } } : {}),
      ...(query.stockStatus ? { stockStatus: query.stockStatus } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
    }

    const [products, total, categories] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: adminProductInclude,
        orderBy: [{ updatedAt: 'desc' }, { titleKg: 'asc' }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.product.count({ where }),
      this.prisma.catalogNode.findMany({
        where: { products: { some: {} } },
        orderBy: { path: 'asc' },
        select: { path: true, titleKg: true },
      }),
    ])

    return {
      items: products.map((product) => this.mapProduct(product)),
      filters: { categories },
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.max(Math.ceil(total / query.limit), 1),
      },
    }
  }

  async detail(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: adminProductInclude,
    })
    if (!product) throw new NotFoundException('Product not found')
    return this.mapProduct(product)
  }

  async updatePrice(id: string, price: number) {
    if (!Number.isFinite(price) || price <= 0 || price > 9999999999.99) {
      throw new BadRequestException('Price must be a positive number')
    }
    await this.ensureProduct(id)
    await this.prisma.product.update({
      where: { id },
      data: { price: new Prisma.Decimal(Math.round(price * 100) / 100) },
    })
    return this.detail(id)
  }

  async updateStock(id: string, quantity?: number, stockStatus?: ProductStockStatus) {
    if (quantity === undefined && stockStatus === undefined) {
      throw new BadRequestException('Quantity or stock status is required')
    }
    if (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0)) {
      throw new BadRequestException('Stock quantity cannot be negative')
    }

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id },
        select: { id: true, stockStatus: true, stock: true },
      })
      if (!product) throw new NotFoundException('Product not found')

      const reservedQuantity = product.stock?.reservedQuantity || 0
      if (quantity !== undefined && quantity < reservedQuantity) {
        throw new BadRequestException(
          `Stock quantity cannot be lower than reserved quantity (${reservedQuantity})`,
        )
      }

      if (quantity !== undefined) {
        await tx.stock.upsert({
          where: { productId: id },
          update: { quantity },
          create: {
            productId: id,
            quantity,
            reservedQuantity: 0,
            lowStockThreshold: 5,
          },
        })
      }

      const nextStatus =
        stockStatus ||
        (quantity === 0 ? ProductStockStatus.OUT_OF_STOCK : product.stockStatus)
      await tx.product.update({
        where: { id },
        data: { stockStatus: nextStatus },
      })

      const updated = await tx.product.findUnique({
        where: { id },
        include: adminProductInclude,
      })
      if (!updated) throw new NotFoundException('Product not found')
      return this.mapProduct(updated)
    })
  }

  async updateActive(id: string, isActive: boolean) {
    await this.ensureProduct(id)
    await this.prisma.product.update({ where: { id }, data: { isActive } })
    return this.detail(id)
  }

  async updateNote(id: string, note: string) {
    await this.ensureProduct(id)
    await this.prisma.product.update({
      where: { id },
      data: { adminNote: note.trim() || null },
    })
    return this.detail(id)
  }

  private async ensureProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id }, select: { id: true } })
    if (!product) throw new NotFoundException('Product not found')
  }

  private mapProduct(product: AdminProduct) {
    const hasRealImage = product.images.some(
      (image) => !image.src.includes('/placeholders/'),
    )
    return {
      id: product.id,
      title: product.titleKg,
      titleRu: product.titleRu,
      slug: product.slug,
      sku: product.sku,
      catalogPath: product.catalogNode.path,
      category: product.catalogNode,
      brand: product.brand,
      price: Number(product.price),
      currency: product.currency,
      unit: product.unit,
      stockStatus: product.stockStatus.toLowerCase(),
      stock: product.stock
        ? {
            quantity: product.stock.quantity,
            reservedQuantity: product.stock.reservedQuantity,
            availableQuantity: Math.max(
              product.stock.quantity - product.stock.reservedQuantity,
              0,
            ),
            lowStockThreshold: product.stock.lowStockThreshold,
            updatedAt: product.stock.updatedAt,
          }
        : null,
      isActive: product.isActive,
      imageStatus: hasRealImage ? 'ready' : product.images.length ? 'placeholder' : 'missing',
      image: product.images[0] || null,
      tags: product.tags,
      adminNote: product.adminNote,
      updatedAt: product.updatedAt,
    }
  }
}
