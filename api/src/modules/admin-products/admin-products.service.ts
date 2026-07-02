import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, ProductDocumentType, ProductImageType, ProductStockStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AdminProductsQueryDto } from './dto/admin-products-query.dto'
import { CreateAdminProductDto } from './dto/create-admin-product.dto'
import { UpdateAdminProductDto } from './dto/update-admin-product.dto'

const adminProductInclude = {
  brand: { select: { id: true, name: true, slug: true } },
  catalogNode: { select: { id: true, titleKg: true, path: true } },
  stock: true,
  images: { orderBy: { sortOrder: 'asc' as const } },
  documents: { orderBy: { sortOrder: 'asc' as const } },
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
    const page = query.page
    const limit = query.limit
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

    const [allProducts, categories] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: adminProductInclude,
        orderBy: [{ updatedAt: 'desc' }, { titleKg: 'asc' }],
      }),
      this.prisma.catalogNode.findMany({
        where: { products: { some: {} } },
        orderBy: { path: 'asc' },
        select: { path: true, titleKg: true },
      }),
    ])
    const mappedProducts = allProducts.map((product) => this.mapProduct(product))
    const qualityFilter = query.quality
    const filteredProducts = qualityFilter
      ? mappedProducts.filter((product) => productMatchesQuality(product, qualityFilter))
      : mappedProducts
    const total = filteredProducts.length
    const products = filteredProducts.slice((page - 1) * limit, page * limit)

    return {
      items: products,
      filters: { categories },
      pagination: {
        page,
        limit,
        total,
        pages: Math.max(Math.ceil(total / limit), 1),
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

    const brandId = dto.brandId?.trim() || null
    if (brandId) {
      const brand = await this.prisma.brand.findFirst({
        where: { id: brandId, isActive: true },
        select: { id: true },
      })
      if (!brand) throw new BadRequestException('Brand is unavailable')
    }

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
    const imageSrc = normalizeImageSrc(dto.imageSrc)
    const imageAlt = dto.imageAlt?.trim() || `${titleKg} - StroyRayon`
    const specs = dto.specs === undefined ? {} : normalizeSpecs(dto.specs)
    const documents = dto.documents === undefined ? [] : normalizeDocuments(dto.documents)
    const submittedImages = dto.images?.length
      ? dto.images
      : imageSrc
        ? [{ src: imageSrc, alt: imageAlt, type: ProductImageType.MAIN, sortOrder: 0 }]
        : []
    const images = normalizeImages(submittedImages, titleKg)

    const created = await this.prisma.product.create({
      data: {
        catalogNodeId: category.id,
        brandId,
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
        descriptionRu: descriptionRu || null,
        seoTitleKg: dto.seoTitleKg?.trim() || null,
        seoDescriptionKg: dto.seoDescriptionKg?.trim() || null,
        seoTitleRu: dto.seoTitleRu?.trim() || null,
        seoDescriptionRu: dto.seoDescriptionRu?.trim() || null,
        specs: Object.keys(specs).length ? specs : Prisma.JsonNull,
        tags: [],
        adminNote: dto.adminNote?.trim() || null,
        isActive: dto.isActive,
        images: {
          create: images.length
            ? images.map((image) => ({
                src: image.src,
                alt: image.alt,
                width: 900,
                height: 700,
                type: image.type,
                sortOrder: image.sortOrder,
              }))
            : {
                src: placeholderImageSrc,
                alt: `${titleKg} - StroyRayon placeholder`,
                width: 900,
                height: 700,
                type: 'MAIN',
                sortOrder: 0,
              },
        },
        documents: {
          create: documents.map((document, index) => ({
            title: document.title,
            url: document.url,
            type: document.type,
            sortOrder: document.sortOrder ?? index,
          })),
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

  async update(id: string, dto: UpdateAdminProductDto) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { stock: true },
    })
    if (!existing) throw new NotFoundException('Product not found')

    const titleKg = dto.titleKg !== undefined ? dto.titleKg.trim() : existing.titleKg
    const titleRu = dto.titleRu !== undefined ? dto.titleRu.trim() : existing.titleRu || ''
    if (!titleKg) throw new BadRequestException('Kyrgyz title is required')

    const slug = dto.slug !== undefined ? normalizeSlug(dto.slug) : existing.slug
    if (!slug) throw new BadRequestException('Slug is required')

    const sku = dto.sku !== undefined ? dto.sku.trim().toUpperCase() : existing.sku
    if (!sku) throw new BadRequestException('SKU is required')

    if (dto.slug !== undefined && slug !== existing.slug) {
      const duplicateSlug = await this.prisma.product.findFirst({
        where: { slug, id: { not: id } },
        select: { id: true },
      })
      if (duplicateSlug) throw new BadRequestException('Product slug already exists')
    }

    if (dto.sku !== undefined && sku !== existing.sku) {
      const duplicateSku = await this.prisma.product.findFirst({
        where: { sku, id: { not: id } },
        select: { id: true },
      })
      if (duplicateSku) throw new BadRequestException('Product SKU already exists')
    }

    if (dto.catalogNodeId !== undefined) {
      const category = await this.prisma.catalogNode.findFirst({
        where: { id: dto.catalogNodeId, isActive: true },
        select: { id: true },
      })
      if (!category) throw new BadRequestException('Category is unavailable')
    }

    const brandId = dto.brandId?.trim() || null
    if (dto.brandId !== undefined && brandId) {
      const brand = await this.prisma.brand.findFirst({
        where: { id: brandId, isActive: true },
        select: { id: true },
      })
      if (!brand) throw new BadRequestException('Brand is unavailable')
    }

    const stockQuantity = dto.stockQuantity
    if (stockQuantity !== undefined && stockQuantity < (existing.stock?.reservedQuantity || 0)) {
      throw new BadRequestException(
        `Stock quantity cannot be lower than reserved quantity (${existing.stock?.reservedQuantity || 0})`,
      )
    }

    const specs = dto.specs === undefined ? undefined : normalizeSpecs(dto.specs)
    const documents = dto.documents === undefined ? undefined : normalizeDocuments(dto.documents)
    const images = dto.images === undefined ? undefined : normalizeImages(dto.images, titleKg)

    await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...(dto.catalogNodeId !== undefined ? { catalogNodeId: dto.catalogNodeId } : {}),
          ...(dto.brandId !== undefined ? { brandId } : {}),
          ...(dto.titleKg !== undefined ? { titleKg } : {}),
          ...(dto.titleRu !== undefined ? { titleRu: titleRu || null } : {}),
          ...(dto.slug !== undefined ? { slug } : {}),
          ...(dto.sku !== undefined ? { sku } : {}),
          ...(dto.shortDescriptionKg !== undefined
            ? { shortDescriptionKg: dto.shortDescriptionKg?.trim() || null }
            : {}),
          ...(dto.descriptionKg !== undefined
            ? { descriptionKg: dto.descriptionKg?.trim() || null }
            : {}),
          ...(dto.descriptionRu !== undefined
            ? { descriptionRu: dto.descriptionRu?.trim() || null }
            : {}),
          ...(dto.seoTitleKg !== undefined ? { seoTitleKg: dto.seoTitleKg?.trim() || null } : {}),
          ...(dto.seoDescriptionKg !== undefined
            ? { seoDescriptionKg: dto.seoDescriptionKg?.trim() || null }
            : {}),
          ...(dto.seoTitleRu !== undefined ? { seoTitleRu: dto.seoTitleRu?.trim() || null } : {}),
          ...(dto.seoDescriptionRu !== undefined
            ? { seoDescriptionRu: dto.seoDescriptionRu?.trim() || null }
            : {}),
          ...(dto.unit !== undefined ? { unit: dto.unit.trim() } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
          ...(dto.adminNote !== undefined ? { adminNote: dto.adminNote?.trim() || null } : {}),
          ...(dto.price !== undefined
            ? { price: new Prisma.Decimal(Math.round(dto.price * 100) / 100) }
            : {}),
          ...(dto.stockStatus !== undefined ? { stockStatus: dto.stockStatus } : {}),
          ...(specs !== undefined ? { specs: Object.keys(specs).length ? specs : Prisma.JsonNull } : {}),
        },
      })

      if (stockQuantity !== undefined) {
        await tx.stock.upsert({
          where: { productId: id },
          update: { quantity: stockQuantity },
          create: {
            productId: id,
            quantity: stockQuantity,
            reservedQuantity: 0,
            lowStockThreshold: 5,
          },
        })
      }

      if (documents !== undefined) {
        await tx.productDocument.deleteMany({ where: { productId: id } })
        if (documents.length) {
          await tx.productDocument.createMany({
            data: documents.map((document, index) => ({
              productId: id,
              title: document.title,
              url: document.url,
              type: document.type,
              sortOrder: document.sortOrder ?? index,
            })),
          })
        }
      }

      if (images !== undefined) {
        await tx.productImage.deleteMany({ where: { productId: id } })
        if (images.length) {
          await tx.productImage.createMany({
            data: images.map((image, index) => ({
              productId: id,
              src: image.src,
              alt: image.alt,
              width: 900,
              height: 700,
              type: image.type,
              sortOrder: image.sortOrder ?? index,
            })),
          })
        }
      }
    })

    return this.detail(id)
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
    const specs =
      product.specs && typeof product.specs === 'object' && !Array.isArray(product.specs)
        ? product.specs
        : {}
    const specsCount = Object.keys(specs).length
    const documentCount = product.documents.length
    const quality = buildProductQuality(product, hasRealImage, specsCount, documentCount)
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
      descriptionRu: product.descriptionRu || '',
      seoTitleKg: product.seoTitleKg || '',
      seoDescriptionKg: product.seoDescriptionKg || '',
      seoTitleRu: product.seoTitleRu || '',
      seoDescriptionRu: product.seoDescriptionRu || '',
      specs,
      documents: product.documents.map((document) => ({
        id: document.id,
        title: document.title,
        url: document.url,
        type: document.type,
        sortOrder: document.sortOrder,
      })),
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
      thumbnail: product.images.find((image) => !image.src.includes('/placeholders/')) || product.images[0] || null,
      image: product.images[0] || null,
      images: product.images,
      qualityFlags: quality.flags,
      completenessScore: quality.score,
      completenessLabel: quality.label,
      documentCount,
      specsCount,
      seoStatus: quality.seoStatus,
      tags: product.tags,
      adminNote: product.adminNote,
      updatedAt: product.updatedAt,
    }
  }
}

function buildProductQuality(
  product: AdminProduct,
  hasRealImage: boolean,
  specsCount: number,
  documentCount: number,
) {
  const hasKgDescription = Boolean(product.shortDescriptionKg?.trim() || product.descriptionKg?.trim())
  const hasRuDescription = Boolean(product.descriptionRu?.trim())
  const hasSeoTitle = Boolean(product.seoTitleKg?.trim() && product.seoTitleRu?.trim())
  const hasSeoDescription = Boolean(product.seoDescriptionKg?.trim() && product.seoDescriptionRu?.trim())
  const hasSeo = hasSeoTitle && hasSeoDescription
  const hasStock = product.stockStatus !== ProductStockStatus.OUT_OF_STOCK && (product.stock?.quantity || 0) > 0
  const hasTitlePair = Boolean(product.titleKg?.trim() && product.titleRu?.trim())
  const hasPositivePrice = Number(product.price) > 0

  const flags: Array<{ code: string; label: string; severity: 'info' | 'warning' | 'danger' }> = []
  if (!hasRealImage) flags.push({ code: 'missing_image', label: 'Нет фото', severity: 'warning' })
  if (!hasKgDescription) flags.push({ code: 'missing_description_kg', label: 'Нет KG описания', severity: 'warning' })
  if (!hasRuDescription) flags.push({ code: 'missing_description_ru', label: 'Нет RU описания', severity: 'warning' })
  if (!specsCount) flags.push({ code: 'missing_specs', label: 'Нет характеристик', severity: 'warning' })
  if (!documentCount) flags.push({ code: 'missing_documents', label: 'Нет документов', severity: 'info' })
  if (!hasSeo) flags.push({ code: 'missing_seo', label: 'SEO не заполнено', severity: 'warning' })
  if (!product.isActive) flags.push({ code: 'inactive', label: 'Скрыт', severity: 'info' })
  if (product.stockStatus === ProductStockStatus.LOW_STOCK) {
    flags.push({ code: 'low_stock', label: 'Мало на складе', severity: 'warning' })
  }
  if (product.stockStatus === ProductStockStatus.OUT_OF_STOCK || (product.stock?.quantity || 0) <= 0) {
    flags.push({ code: 'out_of_stock', label: 'Нет остатка', severity: 'danger' })
  }

  const checks = [
    hasRealImage,
    hasTitlePair,
    hasKgDescription,
    hasRuDescription,
    hasPositivePrice,
    hasStock,
    specsCount > 0,
    hasSeo,
    documentCount > 0,
  ]
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100)

  return {
    flags,
    score,
    label: score >= 85 ? 'Хорошо заполнен' : score >= 60 ? 'Неполный' : 'Нужны данные',
    seoStatus: {
      hasTitleKg: Boolean(product.seoTitleKg?.trim()),
      hasDescriptionKg: Boolean(product.seoDescriptionKg?.trim()),
      hasTitleRu: Boolean(product.seoTitleRu?.trim()),
      hasDescriptionRu: Boolean(product.seoDescriptionRu?.trim()),
      complete: hasSeo,
    },
  }
}

function productMatchesQuality(
  product: { qualityFlags: Array<{ code: string }> },
  quality: string,
) {
  switch (quality) {
    case 'missing_image':
      return product.qualityFlags.some((flag) => flag.code === 'missing_image')
    case 'missing_description':
      return product.qualityFlags.some((flag) =>
        flag.code === 'missing_description_kg' || flag.code === 'missing_description_ru',
      )
    case 'missing_specs':
      return product.qualityFlags.some((flag) => flag.code === 'missing_specs')
    case 'missing_documents':
      return product.qualityFlags.some((flag) => flag.code === 'missing_documents')
    case 'missing_seo':
      return product.qualityFlags.some((flag) => flag.code === 'missing_seo')
    case 'inactive':
      return product.qualityFlags.some((flag) => flag.code === 'inactive')
    case 'low_stock':
      return product.qualityFlags.some((flag) => flag.code === 'low_stock')
    case 'out_of_stock':
      return product.qualityFlags.some((flag) => flag.code === 'out_of_stock')
    default:
      return true
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

function normalizeImageSrc(value?: string) {
  const imageSrc = value?.trim()
  if (!imageSrc) return ''
  if (imageSrc.startsWith('/images/') || imageSrc.startsWith('/uploads/')) return imageSrc
  if (/^https?:\/\/.+/i.test(imageSrc)) return imageSrc
  throw new BadRequestException('Image URL must start with https://, http://, /images/ or /uploads/')
}

function normalizeSpecs(rows: Array<{ key: string; value: string }>) {
  return rows.reduce<Record<string, string>>((result, row) => {
    const key = row.key?.trim()
    const value = row.value?.trim()
    if (!key || !value) return result
    result[key] = value
    return result
  }, {})
}

function normalizeDocuments(
  rows: Array<{ title: string; url: string; type: ProductDocumentType; sortOrder?: number }>,
) {
  return rows
    .map((row, index) => ({
      title: row.title?.trim(),
      url: normalizeDocumentUrl(row.url),
      type: row.type || ProductDocumentType.OTHER,
      sortOrder: row.sortOrder ?? index,
    }))
    .filter((row) => row.title && row.url)
}

function normalizeDocumentUrl(value: string) {
  const url = value?.trim()
  if (!url) return ''
  if (url.startsWith('/') && !url.startsWith('//')) return url
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return url
  } catch {
    throw new BadRequestException('Document URL must be http(s) or a safe absolute path')
  }
  throw new BadRequestException('Document URL must be http(s) or a safe absolute path')
}

function normalizeImages(
  rows: Array<{ src: string; alt: string; type?: ProductImageType; sortOrder?: number }>,
  fallbackAlt: string,
) {
  const normalized = rows
    .map((row, index) => ({
      src: normalizeImageSrc(row.src),
      alt: row.alt?.trim() || `${fallbackAlt} - StroyRayon`,
      type: row.type || ProductImageType.GALLERY,
      sortOrder: row.sortOrder ?? index,
    }))
    .filter((row) => row.src)
    .sort((a, b) => a.sortOrder - b.sortOrder)

  return normalized.map((row, index) => ({
    ...row,
    type: index === 0 ? ProductImageType.MAIN : ProductImageType.GALLERY,
    sortOrder: index,
  }))
}
