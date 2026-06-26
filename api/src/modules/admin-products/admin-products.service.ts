import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, ProductStockStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AdminProductsQueryDto } from './dto/admin-products-query.dto'
import { CreateAdminProductDto } from './dto/create-admin-product.dto'

const adminProductInclude = {
  brand: { select: { id: true, name: true, slug: true } },
  catalogNode: { select: { id: true, titleKg: true, path: true } },
  stock: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
} satisfies Prisma.ProductInclude

type AdminProduct = Prisma.ProductGetPayload<{ include: typeof adminProductInclude }>

const placeholderImageSrc = '/images/placeholders/product-placeholder.svg'
const defaultUnits = ['даана', 'метр', 'кг', 'м2', 'комплект', 'рулон', 'кап']

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

  async options() {
    const [categories, brands, units] = await Promise.all([
      this.prisma.catalogNode.findMany({
        where: { isActive: true },
        orderBy: [{ path: 'asc' }],
        select: { id: true, titleKg: true, titleRu: true, path: true, level: true },
      }),
      this.prisma.brand.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true, slug: true },
      }),
      this.prisma.product.groupBy({
        by: ['unit'],
        orderBy: { unit: 'asc' },
      }),
    ])

    return {
      categories,
      brands,
      units: [...new Set([...defaultUnits, ...units.map((item) => item.unit)])],
      stockStatuses: Object.values(ProductStockStatus),
    }
  }

  async create(dto: CreateAdminProductDto) {
    const titleKg = dto.titleKg.trim()
    const titleRu = dto.titleRu.trim()
    if (!titleKg || !titleRu) {
      throw new BadRequestException('Kyrgyz and Russian titles are required')
    }

    const category = await this.prisma.catalogNode.findFirst({
      where: { id: dto.catalogNodeId, isActive: true },
      select: { id: true },
    })
    if (!category) throw new BadRequestException('Category is unavailable')

    const slug = normalizeSlug(dto.slug || titleRu || titleKg)
    if (!slug) throw new BadRequestException('Slug is required')

    const existingSlug = await this.prisma.product.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (existingSlug) throw new BadRequestException('Product slug already exists')

    const sku = (dto.sku?.trim() || `SR-LOCAL-${Date.now()}`).toUpperCase()
    const existingSku = await this.prisma.product.findUnique({
      where: { sku },
      select: { id: true },
    })
    if (existingSku) throw new BadRequestException('Product SKU already exists')

    const price = new Prisma.Decimal(Math.round(dto.price * 100) / 100)
    const descriptionKg = dto.descriptionKg?.trim() || dto.shortDescriptionKg?.trim() || null
    const shortDescriptionKg = dto.shortDescriptionKg?.trim() || descriptionKg
    const descriptionRu = dto.descriptionRu?.trim()

    const created = await this.prisma.product.create({
      data: {
        catalogNodeId: category.id,
        titleKg,
        titleRu,
        slug,
        sku,
        price,
        currency: 'KGS',
        unit: dto.unit.trim(),
        stockStatus: dto.stockStatus,
        shortDescriptionKg,
        descriptionKg,
        specs: descriptionRu ? { descriptionRu } : undefined,
        tags: [],
        adminNote: dto.adminNote?.trim() || null,
        isActive: dto.isActive,
        images: {
          create: {
            src: placeholderImageSrc,
            alt: `${titleKg} - StroyRayon placeholder`,
            width: 900,
            height: 700,
            type: 'MAIN',
            sortOrder: 0,
          },
        },
        stock: {
          create: {
            quantity: dto.stockQuantity,
            reservedQuantity: 0,
            lowStockThreshold: 5,
          },
        },
      },
      include: adminProductInclude,
    })

    return this.mapProduct(created)
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
      shortDescriptionKg: product.shortDescriptionKg,
      descriptionKg: product.descriptionKg,
      descriptionRu:
        product.specs &&
        typeof product.specs === 'object' &&
        !Array.isArray(product.specs) &&
        'descriptionRu' in product.specs
          ? String(product.specs.descriptionRu || '')
          : '',
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

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160)
}
