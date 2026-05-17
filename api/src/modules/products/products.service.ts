import { Injectable } from '@nestjs/common'
import { Prisma, ProductStockStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { ProductQueryDto } from './dto/product-query.dto'

const productInclude = {
  brand: true,
  catalogNode: true,
  images: { orderBy: [{ sortOrder: 'asc' }] },
  stock: true,
  relatedFrom: { include: { relatedProduct: true } },
} satisfies Prisma.ProductInclude

type ProductRecord = Prisma.ProductGetPayload<{ include: typeof productInclude }>

const stockMap: Record<string, ProductStockStatus> = {
  in_stock: ProductStockStatus.IN_STOCK,
  low_stock: ProductStockStatus.LOW_STOCK,
  pre_order: ProductStockStatus.PRE_ORDER,
  out_of_stock: ProductStockStatus.OUT_OF_STOCK,
}

const frontendStockMap: Record<ProductStockStatus, string> = {
  [ProductStockStatus.IN_STOCK]: 'in_stock',
  [ProductStockStatus.LOW_STOCK]: 'low_stock',
  [ProductStockStatus.PRE_ORDER]: 'pre_order',
  [ProductStockStatus.OUT_OF_STOCK]: 'out_of_stock',
}

const stockLabels: Record<string, string> = {
  in_stock: 'Бар',
  low_stock: 'Аз калды',
  pre_order: 'Заказ менен',
  out_of_stock: 'Жок',
}

const badgeLabels: Record<string, string> = {
  hit: 'Хит',
  sale: 'Акция',
  quality: 'Сапаттуу',
  new: 'Жаңы',
}

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: ProductQueryDto) {
    const page = query.page || 1
    const limit = query.limit || 24
    const where = this.buildWhere(query)

    const [products, total, filters] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: this.getOrderBy(query.sort),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
      this.getFilterOptions(),
    ])

    return {
      items: products.map((product) => this.mapProduct(product)),
      total,
      page,
      limit,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      filters,
    }
  }

  private buildWhere(query: ProductQueryDto): Prisma.ProductWhereInput {
    const stockValues = splitParam(query.stock).map((stock) => stockMap[stock]).filter(Boolean)
    const brandValues = splitParam(query.brand)
    const badgeValues = splitParam(query.badge)
    const unitValues = splitParam(query.unit)
    const normalizedCatalogPath = query.catalogPath?.replace(/^\/+|\/+$/g, '')

    return {
      isActive: true,
      ...(query.q
        ? {
            OR: [
              { titleKg: { contains: query.q, mode: 'insensitive' } },
              { shortDescriptionKg: { contains: query.q, mode: 'insensitive' } },
              { descriptionKg: { contains: query.q, mode: 'insensitive' } },
              { sku: { contains: query.q, mode: 'insensitive' } },
              { brand: { name: { contains: query.q, mode: 'insensitive' } } },
              { tags: { has: query.q } },
            ],
          }
        : {}),
      ...(query.min !== undefined || query.max !== undefined
        ? {
            price: {
              ...(query.min !== undefined ? { gte: query.min } : {}),
              ...(query.max !== undefined ? { lte: query.max } : {}),
            },
          }
        : {}),
      ...(stockValues.length ? { stockStatus: { in: stockValues } } : {}),
      ...(brandValues.length
        ? {
            brand: {
              OR: [{ slug: { in: brandValues } }, { name: { in: brandValues } }],
            },
          }
        : {}),
      ...(badgeValues.length ? { tags: { hasSome: badgeValues } } : {}),
      ...(unitValues.length ? { unit: { in: unitValues } } : {}),
      ...(normalizedCatalogPath ? { catalogNode: { path: { startsWith: normalizedCatalogPath } } } : {}),
    }
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: productInclude,
    })

    return product ? this.mapProduct(product) : null
  }

  private getOrderBy(sort?: string): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
      case 'price_asc':
        return [{ price: 'asc' }]
      case 'price_desc':
        return [{ price: 'desc' }]
      case 'rating_desc':
        return [{ createdAt: 'desc' }]
      case 'sale':
        return [{ oldPrice: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }]
      case 'newest':
      case 'new':
        return [{ createdAt: 'desc' }]
      case 'popular':
        return [{ createdAt: 'desc' }]
      default:
        return [{ createdAt: 'desc' }]
    }
  }

  private async getFilterOptions() {
    const [brands, units, products, priceRange] = await Promise.all([
      this.prisma.brand.findMany({
        where: { isActive: true, products: { some: { isActive: true } } },
        orderBy: { name: 'asc' },
        select: { name: true, slug: true, _count: { select: { products: true } } },
      }),
      this.prisma.product.groupBy({
        by: ['unit'],
        where: { isActive: true },
        _count: { unit: true },
        orderBy: { unit: 'asc' },
      }),
      this.prisma.product.findMany({
        where: { isActive: true },
        select: { stockStatus: true, tags: true },
      }),
      this.prisma.product.aggregate({
        where: { isActive: true },
        _min: { price: true },
        _max: { price: true },
      }),
    ])

    const stockCounts = new Map<string, number>()
    const badgeCounts = new Map<string, number>()
    products.forEach((product) => {
      const stock = frontendStockMap[product.stockStatus]
      stockCounts.set(stock, (stockCounts.get(stock) || 0) + 1)
      product.tags
        .filter((tag) => badgeLabels[tag])
        .forEach((tag) => badgeCounts.set(tag, (badgeCounts.get(tag) || 0) + 1))
    })

    return {
      brands: brands.map((brand) => ({ value: brand.slug, label: brand.name, count: brand._count.products })),
      units: units.map((unit) => ({ value: unit.unit, label: unit.unit, count: unit._count.unit })),
      stockStatuses: Object.entries(stockLabels).map(([value, label]) => ({ value, label, count: stockCounts.get(value) || 0 })),
      badges: [...badgeCounts.entries()].map(([value, count]) => ({ value, label: badgeLabels[value] || value, count })),
      priceRange: {
        min: priceRange._min.price ? Number(priceRange._min.price) : 0,
        max: priceRange._max.price ? Number(priceRange._max.price) : 0,
      },
    }
  }

  private mapProduct(product: ProductRecord) {
    return {
      id: product.id,
      titleKg: product.titleKg,
      titleRu: product.titleRu,
      titleEn: product.titleEn,
      slug: product.slug,
      sku: product.sku,
      catalogPath: product.catalogNode.path.split('/'),
      catalogNode: product.catalogNode,
      brand: product.brand,
      price: Number(product.price),
      oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
      currency: product.currency,
      unit: product.unit,
      stockStatus: frontendStockMap[product.stockStatus],
      minOrder: product.minOrder,
      shortDescriptionKg: product.shortDescriptionKg,
      descriptionKg: product.descriptionKg,
      packageInfoKg: product.packageInfoKg,
      deliveryInfoKg: product.deliveryInfoKg,
      warrantyInfoKg: product.warrantyInfoKg,
      recommendedUseKg: product.recommendedUseKg,
      specs: product.specs,
      tags: product.tags,
      faqKg: product.faqKg,
      seoTitleKg: product.seoTitleKg,
      seoDescriptionKg: product.seoDescriptionKg,
      isActive: product.isActive,
      images: product.images,
      stock: product.stock,
      relatedProducts: product.relatedFrom.map((relation) => relation.relatedProduct),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }
  }
}

function splitParam(value?: string) {
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : []
}
