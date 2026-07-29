import { pathToFileURL } from 'node:url'
import { AdminRole, Prisma, PrismaClient, ProductImageType, ProductStockStatus } from '@prisma/client'
import { hashPassword } from '../src/modules/auth/password.util'

const prisma = new PrismaClient()

type CatalogNodeInput = {
  id?: string
  titleKg: string
  titleRu?: string
  slug: string
  descriptionKg?: string
  seoTextKg?: string
  seoTitleKg?: string
  seoDescriptionKg?: string
  icon?: string
  image?: string | { src?: string }
  children?: CatalogNodeInput[]
}

type ProductImageInput = {
  src?: string
  alt?: string
  width?: number
  height?: number
  type?: string
  storageDriver?: string
}

type ProductAssetInput = {
  main?: string
  gallery?: string[]
}

type ProductInput = {
  id: string
  titleKg: string
  titleRu?: string | null
  titleEn?: string | null
  slug: string
  sku: string
  catalogPath?: string[]
  brand?: string | null
  price: number
  oldPrice?: number | null
  currency?: string
  unit: string
  unitRu?: string | null
  stockStatus?: string
  minOrder?: string | null
  minOrderRu?: string | null
  shortDescriptionKg?: string | null
  shortDescriptionRu?: string | null
  descriptionKg?: string | null
  descriptionRu?: string | null
  packageInfoKg?: string | null
  packageInfoRu?: string | null
  deliveryInfoKg?: string | null
  warrantyInfoKg?: string | null
  recommendedUseKg?: string | null
  specs?: Prisma.InputJsonValue
  specsRu?: Prisma.InputJsonValue
  specificationsRu?: Prisma.InputJsonValue
  tags?: string[]
  badges?: string[]
  faqKg?: Prisma.InputJsonValue
  faqRu?: Prisma.InputJsonValue
  seoTitleKg?: string | null
  seoDescriptionKg?: string | null
  seoTitleRu?: string | null
  seoDescriptionRu?: string | null
  images?: ProductImageInput[]
  imageAssets?: ProductAssetInput | null
  relatedProductIds?: string[]
  variants?: ProductVariantInput[]
  isActive?: boolean
}

type ProductVariantInput = {
  id?: string
  titleKg?: string
  titleRu?: string | null
  size?: string
  sku?: string | null
  price: number
  currency?: string
  unit?: string
  stockStatus?: string
  stockQuantity?: number
  isActive?: boolean
  sortOrder?: number
  specs?: Prisma.InputJsonValue
}

type SeedStats = {
  catalogNodes: number
  brands: number
  products: number
  images: number
  relations: number
  stock: number
  variants: number
  preservedImages: number
  preservedManualProducts: number
  rekeyedProducts: number
  skippedProducts: string[]
  warnings: string[]
  staleCatalogNodes: number
  staleProductsDeactivated: number
}

const stockStatusMap: Record<string, ProductStockStatus> = {
  in_stock: ProductStockStatus.IN_STOCK,
  low_stock: ProductStockStatus.LOW_STOCK,
  pre_order: ProductStockStatus.PRE_ORDER,
  out_of_stock: ProductStockStatus.OUT_OF_STOCK,
}

const stockQuantityMap: Record<ProductStockStatus, number> = {
  [ProductStockStatus.IN_STOCK]: 25,
  [ProductStockStatus.LOW_STOCK]: 5,
  [ProductStockStatus.PRE_ORDER]: 0,
  [ProductStockStatus.OUT_OF_STOCK]: 0,
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'e')
    .replace(/[^a-z0-9а-яөңүчыэюяё\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function imageSrc(image?: string | { src?: string }) {
  if (!image) return null
  return typeof image === 'string' ? image : image.src || null
}

function normalizeStockStatus(status?: string) {
  return stockStatusMap[status || ''] || ProductStockStatus.IN_STOCK
}

async function loadFrontendData() {
  const catalogModule = await import(pathToFileURL('../src/data/catalogTree.js').href)
  const productsModule = await import(pathToFileURL('../src/data/products.js').href)

  return {
    catalogTree: catalogModule.catalogTree as CatalogNodeInput[],
    products: productsModule.products as ProductInput[],
  }
}

function collectCatalogPaths(nodes: CatalogNodeInput[], parentPath = '', paths = new Set<string>()) {
  for (const node of nodes) {
    if (!node.slug) continue
    const path = parentPath ? `${parentPath}/${node.slug}` : node.slug
    paths.add(path)
    if (node.children?.length) collectCatalogPaths(node.children, path, paths)
  }

  return paths
}

async function assertIdentityCompatibility(products: ProductInput[]) {
  const desiredProductIds = new Set<string>()
  const desiredSlugs = new Set<string>()
  const desiredSkus = new Set<string>()
  const desiredVariantIds = new Set<string>()

  for (const product of products) {
    if (desiredProductIds.has(product.id)) throw new Error(`Duplicate product id in catalog: ${product.id}`)
    if (desiredSlugs.has(product.slug)) throw new Error(`Duplicate product slug in catalog: ${product.slug}`)
    if (desiredSkus.has(product.sku)) throw new Error(`Duplicate product/variant SKU in catalog: ${product.sku}`)
    desiredProductIds.add(product.id)
    desiredSlugs.add(product.slug)
    desiredSkus.add(product.sku)

    for (const variant of product.variants || []) {
      if (variant.id) {
        if (desiredVariantIds.has(variant.id)) throw new Error(`Duplicate variant id in catalog: ${variant.id}`)
        desiredVariantIds.add(variant.id)
      }
      if (variant.sku) {
        if (desiredSkus.has(variant.sku)) throw new Error(`Duplicate product/variant SKU in catalog: ${variant.sku}`)
        desiredSkus.add(variant.sku)
      }
    }
  }

  const [databaseProducts, databaseVariants] = await Promise.all([
    prisma.product.findMany({ select: { id: true, slug: true, sku: true } }),
    prisma.productVariant.findMany({ select: { id: true, productId: true, sku: true } }),
  ])
  const databaseProductsById = new Map(databaseProducts.map((product) => [product.id, product]))
  const databaseProductsBySlug = new Map(databaseProducts.map((product) => [product.slug, product]))
  const databaseSkuOwners = new Map<string, string>()
  databaseProducts.forEach((product) => databaseSkuOwners.set(product.sku, product.id))
  databaseVariants.forEach((variant) => {
    if (variant.sku) databaseSkuOwners.set(variant.sku, variant.productId)
  })

  for (const product of products) {
    const byId = databaseProductsById.get(product.id)
    const bySlug = databaseProductsBySlug.get(product.slug)
    if (byId && bySlug && byId.id !== bySlug.id) {
      throw new Error(`Product identity conflict for ${product.slug}: id and slug belong to different rows`)
    }
    const targetProductId = bySlug?.id || byId?.id || product.id
    for (const sku of [product.sku, ...(product.variants || []).map((variant) => variant.sku).filter(Boolean)]) {
      const ownerId = databaseSkuOwners.get(sku as string)
      if (ownerId && ownerId !== targetProductId) {
        throw new Error(`Database SKU conflict for ${product.slug}: ${sku}`)
      }
    }
    for (const variant of product.variants || []) {
      if (!variant.id) continue
      const existingVariant = databaseVariants.find((item) => item.id === variant.id)
      if (existingVariant && existingVariant.productId !== targetProductId) {
        throw new Error(`Database variant id conflict for ${product.slug}: ${variant.id}`)
      }
    }
  }
}

function catalogNodeData(node: CatalogNodeInput, parentId: string | null, path: string, level: number, sortOrder: number) {
  return {
    parentId,
    titleKg: node.titleKg,
    titleRu: node.titleRu || null,
    slug: node.slug,
    path,
    level,
    sortOrder,
    descriptionKg: node.descriptionKg || null,
    seoTextKg: node.seoTextKg || null,
    seoTitleKg: node.seoTitleKg || `${node.titleKg} - StroyRayon`,
    seoDescriptionKg: node.seoDescriptionKg || node.descriptionKg || node.seoTextKg || null,
    icon: node.icon || null,
    imageUrl: imageSrc(node.image),
    isActive: true,
  }
}

async function seedCatalogNodes(nodes: CatalogNodeInput[], stats: SeedStats, parentId: string | null = null, parentPath = '', level = 0) {
  const siblingSlugs = new Set<string>()

  for (const [index, node] of nodes.entries()) {
    if (!node.slug || !node.titleKg) {
      stats.warnings.push(`Catalog node skipped: empty title or slug near ${parentPath || 'root'}`)
      continue
    }

    if (siblingSlugs.has(node.slug)) {
      stats.warnings.push(`Duplicate catalog slug "${node.slug}" under "${parentPath || 'root'}"`)
    }
    siblingSlugs.add(node.slug)

    const path = parentPath ? `${parentPath}/${node.slug}` : node.slug
    const data = catalogNodeData(node, parentId, path, level, index)
    const existingById = node.id ? await prisma.catalogNode.findUnique({ where: { id: node.id }, select: { id: true } }) : null

    if (existingById) {
      await prisma.catalogNode.update({
        where: { id: node.id },
        data,
      })
    } else {
      await prisma.catalogNode.upsert({
        where: { path },
        update: data,
        create: {
          id: node.id || undefined,
          ...data,
        },
      })
    }
    stats.catalogNodes += 1

    if (node.children?.length) {
      const savedNode = await prisma.catalogNode.findUniqueOrThrow({ where: { path }, select: { id: true } })
      await seedCatalogNodes(node.children, stats, savedNode.id, path, level + 1)
    }
  }
}

async function deactivateStaleCatalogNodes(activePaths: Set<string>, stats: SeedStats) {
  const result = await prisma.catalogNode.updateMany({
    where: {
      isActive: true,
      path: { notIn: [...activePaths] },
      products: { none: { isActive: true } },
    },
    data: { isActive: false },
  })

  stats.staleCatalogNodes = result.count
}

async function seedBrands(products: ProductInput[], stats: SeedStats) {
  const brandNames = [...new Set(products.map((product) => product.brand?.trim()).filter(Boolean) as string[])]
  const brandMap = new Map<string, string>()

  for (const name of brandNames) {
    const brand = await prisma.brand.upsert({
      where: { slug: slugify(name) },
      update: { name, isActive: true },
      create: { name, slug: slugify(name), isActive: true },
    })
    brandMap.set(name, brand.id)
    stats.brands += 1
  }

  return brandMap
}

function normalizeImages(product: ProductInput) {
  const explicitImages = product.images?.filter((image) => image.src) || []
  if (explicitImages.length) return explicitImages

  const assets = product.imageAssets
  const assetImages: ProductImageInput[] = []
  if (assets?.main) assetImages.push({ src: assets.main, alt: product.titleKg, width: 900, height: 675, type: 'main' })
  for (const src of assets?.gallery || []) {
    assetImages.push({ src, alt: product.titleKg, width: 900, height: 675, type: 'gallery' })
  }

  return assetImages
}

async function seedProducts(products: ProductInput[], brandMap: Map<string, string>, stats: SeedStats) {
  const importedProducts = new Map<string, string>()

  for (const product of products) {
    const catalogPath = product.catalogPath?.join('/')
    if (!catalogPath) {
      stats.warnings.push(`Product skipped: ${product.id} has no catalogPath`)
      stats.skippedProducts.push(product.id)
      continue
    }

    const catalogNode = await prisma.catalogNode.findUnique({ where: { path: catalogPath }, select: { id: true } })
    if (!catalogNode) {
      stats.warnings.push(`Product skipped: ${product.id} catalogPath not found: ${catalogPath}`)
      stats.skippedProducts.push(product.id)
      continue
    }

    const existingBySlug = await prisma.product.findUnique({
      where: { slug: product.slug },
      include: {
        images: true,
        stock: true,
        variants: true,
        auditLogs: { select: { changedFields: true } },
      },
    })
    const existingById = existingBySlug
      ? null
      : await prisma.product.findUnique({
          where: { id: product.id },
          include: {
            images: true,
            stock: true,
            variants: true,
            auditLogs: { select: { changedFields: true } },
          },
        })
    const existing = existingBySlug || existingById
    const changedFields = new Set(existing?.auditLogs.flatMap((entry) => entry.changedFields) || [])
    const wasEdited = (...fields: string[]) => fields.some((field) => changedFields.has(field))
    const stockStatus = normalizeStockStatus(product.stockStatus)
    const staticData = {
      catalogNodeId: catalogNode.id,
      brandId: product.brand ? brandMap.get(product.brand) || null : null,
      titleKg: product.titleKg,
      titleRu: product.titleRu || null,
      titleEn: product.titleEn || null,
      sku: product.sku,
      price: new Prisma.Decimal(product.price),
      oldPrice: product.oldPrice ? new Prisma.Decimal(product.oldPrice) : null,
      currency: product.currency || 'KGS',
      unit: product.unit,
      unitRu: product.unitRu || null,
      stockStatus,
      minOrder: product.minOrder || null,
      minOrderRu: product.minOrderRu || null,
      shortDescriptionKg: product.shortDescriptionKg || null,
      shortDescriptionRu: product.shortDescriptionRu || null,
      descriptionKg: product.descriptionKg || null,
      descriptionRu: product.descriptionRu || null,
      packageInfoKg: product.packageInfoKg || null,
      packageInfoRu: product.packageInfoRu || null,
      deliveryInfoKg: product.deliveryInfoKg || null,
      warrantyInfoKg: product.warrantyInfoKg || null,
      recommendedUseKg: product.recommendedUseKg || null,
      specs: product.specs || Prisma.JsonNull,
      specsRu: product.specificationsRu || product.specsRu || Prisma.JsonNull,
      tags: product.tags || product.badges || [],
      faqKg: product.faqKg || Prisma.JsonNull,
      faqRu: product.faqRu || Prisma.JsonNull,
      seoTitleKg: product.seoTitleKg || `${product.titleKg} - StroyRayon`,
      seoDescriptionKg: product.seoDescriptionKg || product.shortDescriptionKg || product.descriptionKg || null,
      seoTitleRu: product.seoTitleRu || (product.titleRu ? `${product.titleRu} - StroyRayon` : null),
      seoDescriptionRu: product.seoDescriptionRu || product.descriptionRu || null,
      isActive: product.isActive !== false,
    }
    let savedProduct

    if (existing) {
      const updateData: Prisma.ProductUncheckedUpdateInput = {
        ...(!wasEdited('catalogNodeId') ? { catalogNodeId: staticData.catalogNodeId } : {}),
        ...(!wasEdited('brandId') ? { brandId: staticData.brandId } : {}),
        ...(!wasEdited('titleKg') ? { titleKg: staticData.titleKg } : {}),
        ...(!wasEdited('titleRu') ? { titleRu: staticData.titleRu } : {}),
        titleEn: staticData.titleEn,
        ...(existing.slug !== product.slug ? { slug: product.slug } : {}),
        ...(!wasEdited('sku') ? { sku: staticData.sku } : {}),
        ...(!wasEdited('price') ? { price: staticData.price, oldPrice: staticData.oldPrice } : {}),
        currency: staticData.currency,
        ...(!wasEdited('unit') ? { unit: staticData.unit } : {}),
        ...(!wasEdited('unitRu') ? { unitRu: staticData.unitRu } : {}),
        ...(!wasEdited('stock', 'stockStatus') ? { stockStatus: staticData.stockStatus } : {}),
        ...(!wasEdited('commercialText')
          ? {
              minOrder: staticData.minOrder,
              minOrderRu: staticData.minOrderRu,
              packageInfoKg: staticData.packageInfoKg,
              packageInfoRu: staticData.packageInfoRu,
            }
          : {}),
        ...(!wasEdited('description')
          ? {
              shortDescriptionKg: staticData.shortDescriptionKg,
              shortDescriptionRu: staticData.shortDescriptionRu,
              descriptionKg: staticData.descriptionKg,
              descriptionRu: staticData.descriptionRu,
            }
          : {}),
        deliveryInfoKg: staticData.deliveryInfoKg,
        warrantyInfoKg: staticData.warrantyInfoKg,
        recommendedUseKg: staticData.recommendedUseKg,
        ...(!wasEdited('specs') ? { specs: staticData.specs, specsRu: staticData.specsRu } : {}),
        tags: staticData.tags,
        ...(!wasEdited('faq') ? { faqKg: staticData.faqKg, faqRu: staticData.faqRu } : {}),
        ...(!wasEdited('seo')
          ? {
              seoTitleKg: staticData.seoTitleKg,
              seoDescriptionKg: staticData.seoDescriptionKg,
              seoTitleRu: staticData.seoTitleRu,
              seoDescriptionRu: staticData.seoDescriptionRu,
            }
          : {}),
        ...(!wasEdited('isActive') ? { isActive: staticData.isActive } : {}),
      }
      savedProduct = await prisma.product.update({ where: { id: existing.id }, data: updateData })
      if (existing.slug !== product.slug) stats.rekeyedProducts += 1
      if (changedFields.size) stats.preservedManualProducts += 1
    } else {
      savedProduct = await prisma.product.create({
        data: {
          id: product.id,
          slug: product.slug,
          ...staticData,
        },
      })
    }
    importedProducts.set(product.id, savedProduct.id)
    stats.products += 1

    if (!existing?.stock) {
      await prisma.stock.create({
        data: {
          productId: savedProduct.id,
          quantity: stockQuantityMap[stockStatus],
          reservedQuantity: 0,
          lowStockThreshold: 5,
          warehouseName: 'Негизги склад',
        },
      })
    }
    stats.stock += 1

    const preserveImages = Boolean(
      existing?.images.some((image) => image.storageDriver !== 'legacy') || wasEdited('images'),
    )
    if (preserveImages) {
      stats.preservedImages += existing?.images.length || 0
    } else {
      await prisma.productImage.deleteMany({ where: { productId: savedProduct.id } })
      const images = normalizeImages(product)
      for (const [index, image] of images.entries()) {
        await prisma.productImage.create({
          data: {
            productId: savedProduct.id,
            src: image.src || '/images/placeholders/product-placeholder.svg',
            alt: image.alt || product.titleKg,
            width: image.width || 900,
            height: image.height || 675,
            type: index === 0 || image.type === 'main' ? ProductImageType.MAIN : ProductImageType.GALLERY,
            sortOrder: index,
            storageDriver: image.storageDriver || 'legacy',
          },
        })
        stats.images += 1
      }
    }

    await seedProductVariants(product, savedProduct.id, existing?.variants || [], changedFields, stats)
  }

  return importedProducts
}

async function seedProductVariants(
  product: ProductInput,
  productId: string,
  existingVariants: Array<{
    id: string
    sku: string | null
    stockQuantity: number
    reservedQuantity: number
  }>,
  changedFields: Set<string>,
  stats: SeedStats,
) {
  const savedVariantIds: string[] = []
  const wasEdited = (...fields: string[]) => fields.some((field) => changedFields.has(field))

  for (const [index, variant] of (product.variants || []).entries()) {
    const titleKg = variant.titleKg || variant.size || `${product.titleKg} ${index + 1}`
    const stockStatus = normalizeStockStatus(variant.stockStatus || product.stockStatus)
    const existing = existingVariants.find((item) =>
      (variant.id && item.id === variant.id) || (variant.sku && item.sku === variant.sku),
    )

    if (existing) {
      await prisma.productVariant.update({
        where: { id: existing.id },
        data: {
          ...(!wasEdited('variants', 'variantTitle')
            ? { titleKg, titleRu: variant.titleRu || titleKg }
            : {}),
          ...(!wasEdited('variants', 'variantSku') ? { sku: variant.sku || null } : {}),
          ...(!wasEdited('variants', 'variantPrice')
            ? { price: new Prisma.Decimal(variant.price), currency: variant.currency || product.currency || 'KGS' }
            : {}),
          ...(!wasEdited('variants', 'variantUnit') ? { unit: variant.unit || product.unit } : {}),
          ...(!wasEdited('variants', 'variantStock') ? { stockStatus } : {}),
          ...(!wasEdited('variants', 'variantActive') ? { isActive: variant.isActive !== false } : {}),
          ...(!wasEdited('variants', 'variantSortOrder') ? { sortOrder: variant.sortOrder ?? index } : {}),
          ...(!wasEdited('variants', 'variantSpecs') ? { specs: variant.specs || Prisma.JsonNull } : {}),
        },
      })
      savedVariantIds.push(existing.id)
    } else {
      const created = await prisma.productVariant.create({
        data: {
          id: variant.id || undefined,
          productId,
          titleKg,
          titleRu: variant.titleRu || titleKg,
          sku: variant.sku || null,
          price: new Prisma.Decimal(variant.price),
          currency: variant.currency || product.currency || 'KGS',
          unit: variant.unit || product.unit,
          stockQuantity: variant.stockQuantity ?? stockQuantityMap[stockStatus],
          reservedQuantity: 0,
          stockStatus,
          isActive: variant.isActive !== false,
          sortOrder: variant.sortOrder ?? index,
          specs: variant.specs || Prisma.JsonNull,
        },
      })
      savedVariantIds.push(created.id)
    }
    stats.variants += 1
  }

  if (!wasEdited('variants', 'variantActive')) {
    await prisma.productVariant.updateMany({
      where: {
        productId,
        ...(savedVariantIds.length ? { id: { notIn: savedVariantIds } } : {}),
        isActive: true,
      },
      data: { isActive: false },
    })
  }
}

async function deactivateStaleProducts(products: ProductInput[], stats: SeedStats) {
  const activeSlugs = products.map((product) => product.slug)
  const result = await prisma.product.updateMany({
    where: {
      slug: { notIn: activeSlugs },
      isActive: true,
      auditLogs: { none: {} },
    },
    data: { isActive: false },
  })

  stats.staleProductsDeactivated = result.count
}

async function seedProductRelations(products: ProductInput[], importedProducts: Map<string, string>, stats: SeedStats) {
  for (const product of products) {
    const productId = importedProducts.get(product.id)
    if (!productId) continue

    await prisma.productRelation.deleteMany({ where: { productId } })
    for (const relatedId of product.relatedProductIds || []) {
      const relatedProductId = importedProducts.get(relatedId)
      if (!relatedProductId) {
        stats.warnings.push(`Relation skipped: ${product.id} -> ${relatedId} not found`)
        continue
      }
      if (relatedProductId === productId) {
        stats.warnings.push(`Relation skipped: ${product.id} cannot relate to itself`)
        continue
      }

      await prisma.productRelation.upsert({
        where: { productId_relatedProductId: { productId, relatedProductId } },
        update: {},
        create: { productId, relatedProductId },
      })
      stats.relations += 1
    }
  }
}

async function main() {
  const stats: SeedStats = {
    catalogNodes: 0,
    brands: 0,
    products: 0,
    images: 0,
    relations: 0,
    stock: 0,
    variants: 0,
    preservedImages: 0,
    preservedManualProducts: 0,
    rekeyedProducts: 0,
    skippedProducts: [],
    warnings: [],
    staleCatalogNodes: 0,
    staleProductsDeactivated: 0,
  }

  console.log('Seed started')
  const { catalogTree, products } = await loadFrontendData()
  if (products.length < 300) {
    throw new Error(`Catalog safety check failed: expected at least 300 products, received ${products.length}`)
  }
  await assertIdentityCompatibility(products)
  await seedCatalogNodes(catalogTree, stats)
  const brandMap = await seedBrands(products, stats)
  const importedProducts = await seedProducts(products, brandMap, stats)
  await seedProductRelations(products, importedProducts, stats)
  if (stats.skippedProducts.length || stats.warnings.length) {
    throw new Error(
      `Catalog safety check failed: ${stats.skippedProducts.length} skipped product(s), ${stats.warnings.length} warning(s)`,
    )
  }
  await deactivateStaleProducts(products, stats)
  await deactivateStaleCatalogNodes(collectCatalogPaths(catalogTree), stats)
  await seedInitialAdmin()

  console.log(
    JSON.stringify(
      {
        catalogNodes: stats.catalogNodes,
        brands: stats.brands,
        products: stats.products,
        productImages: stats.images,
        productRelations: stats.relations,
        stockRecords: stats.stock,
        productVariants: stats.variants,
        preservedImages: stats.preservedImages,
        preservedManualProducts: stats.preservedManualProducts,
        rekeyedProducts: stats.rekeyedProducts,
        staleCatalogNodes: stats.staleCatalogNodes,
        staleProductsDeactivated: stats.staleProductsDeactivated,
        skippedProducts: stats.skippedProducts.length,
        warnings: stats.warnings,
      },
      null,
      2,
    ),
  )
  console.log('Seed finished')
}

async function seedInitialAdmin() {
  const email = process.env.ADMIN_INITIAL_EMAIL?.trim().toLowerCase()
  const password = process.env.ADMIN_INITIAL_PASSWORD
  const name = process.env.ADMIN_INITIAL_NAME?.trim() || 'StroyRayon Owner'
  if (!password) {
    console.log('Initial admin skipped: ADMIN_INITIAL_PASSWORD is not set')
    return
  }
  if (!email || !password || password.length < 12) {
    throw new Error('Initial admin requires ADMIN_INITIAL_EMAIL and ADMIN_INITIAL_PASSWORD (12+ characters)')
  }

  const roleValue = process.env.ADMIN_INITIAL_ROLE?.trim() || 'OWNER'
  if (!Object.values(AdminRole).includes(roleValue as AdminRole)) {
    throw new Error(`Unsupported ADMIN_INITIAL_ROLE: ${roleValue}`)
  }

  const passwordHash = await hashPassword(password)
  await prisma.adminUser.upsert({
    where: { email },
    update: {
      name,
      role: roleValue as AdminRole,
      passwordHash,
      isActive: true,
    },
    create: {
      email,
      name,
      role: roleValue as AdminRole,
      passwordHash,
      isActive: true,
    },
  })
  console.log('Initial admin is ready')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
