import { pathToFileURL } from 'node:url'
import { Prisma, PrismaClient, ProductImageType, ProductStockStatus } from '@prisma/client'

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
}

type ProductAssetInput = {
  main?: string
  gallery?: string[]
}

type ProductInput = {
  id: string
  titleKg: string
  slug: string
  sku: string
  catalogPath?: string[]
  brand?: string | null
  price: number
  oldPrice?: number | null
  currency?: string
  unit: string
  stockStatus?: string
  minOrder?: string | null
  shortDescriptionKg?: string | null
  descriptionKg?: string | null
  packageInfoKg?: string | null
  deliveryInfoKg?: string | null
  warrantyInfoKg?: string | null
  recommendedUseKg?: string | null
  specs?: Prisma.InputJsonValue
  tags?: string[]
  badges?: string[]
  faqKg?: Prisma.InputJsonValue
  seoTitleKg?: string | null
  seoDescriptionKg?: string | null
  images?: ProductImageInput[]
  imageAssets?: ProductAssetInput | null
  relatedProductIds?: string[]
}

type SeedStats = {
  catalogNodes: number
  brands: number
  products: number
  images: number
  relations: number
  stock: number
  skippedProducts: string[]
  warnings: string[]
  staleCatalogNodes: number
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

    const stockStatus = normalizeStockStatus(product.stockStatus)
    const savedProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        catalogNodeId: catalogNode.id,
        brandId: product.brand ? brandMap.get(product.brand) || null : null,
        titleKg: product.titleKg,
        sku: product.sku,
        price: new Prisma.Decimal(product.price),
        oldPrice: product.oldPrice ? new Prisma.Decimal(product.oldPrice) : null,
        currency: product.currency || 'KGS',
        unit: product.unit,
        stockStatus,
        minOrder: product.minOrder || null,
        shortDescriptionKg: product.shortDescriptionKg || null,
        descriptionKg: product.descriptionKg || null,
        packageInfoKg: product.packageInfoKg || null,
        deliveryInfoKg: product.deliveryInfoKg || null,
        warrantyInfoKg: product.warrantyInfoKg || null,
        recommendedUseKg: product.recommendedUseKg || null,
        specs: product.specs || Prisma.JsonNull,
        tags: product.tags || product.badges || [],
        faqKg: product.faqKg || Prisma.JsonNull,
        seoTitleKg: product.seoTitleKg || `${product.titleKg} - StroyRayon`,
        seoDescriptionKg: product.seoDescriptionKg || product.shortDescriptionKg || product.descriptionKg || null,
        isActive: true,
      },
      create: {
        id: product.id,
        catalogNodeId: catalogNode.id,
        brandId: product.brand ? brandMap.get(product.brand) || null : null,
        titleKg: product.titleKg,
        slug: product.slug,
        sku: product.sku,
        price: new Prisma.Decimal(product.price),
        oldPrice: product.oldPrice ? new Prisma.Decimal(product.oldPrice) : null,
        currency: product.currency || 'KGS',
        unit: product.unit,
        stockStatus,
        minOrder: product.minOrder || null,
        shortDescriptionKg: product.shortDescriptionKg || null,
        descriptionKg: product.descriptionKg || null,
        packageInfoKg: product.packageInfoKg || null,
        deliveryInfoKg: product.deliveryInfoKg || null,
        warrantyInfoKg: product.warrantyInfoKg || null,
        recommendedUseKg: product.recommendedUseKg || null,
        specs: product.specs || Prisma.JsonNull,
        tags: product.tags || product.badges || [],
        faqKg: product.faqKg || Prisma.JsonNull,
        seoTitleKg: product.seoTitleKg || `${product.titleKg} - StroyRayon`,
        seoDescriptionKg: product.seoDescriptionKg || product.shortDescriptionKg || product.descriptionKg || null,
        isActive: true,
      },
    })
    importedProducts.set(product.id, savedProduct.id)
    stats.products += 1

    await prisma.stock.upsert({
      where: { productId: savedProduct.id },
      update: {
        quantity: stockQuantityMap[stockStatus],
        reservedQuantity: 0,
        lowStockThreshold: 5,
        warehouseName: 'Негизги склад',
      },
      create: {
        productId: savedProduct.id,
        quantity: stockQuantityMap[stockStatus],
        reservedQuantity: 0,
        lowStockThreshold: 5,
        warehouseName: 'Негизги склад',
      },
    })
    stats.stock += 1

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
        },
      })
      stats.images += 1
    }
  }

  return importedProducts
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
    skippedProducts: [],
    warnings: [],
    staleCatalogNodes: 0,
  }

  console.log('Seed started')
  const { catalogTree, products } = await loadFrontendData()
  await seedCatalogNodes(catalogTree, stats)
  await deactivateStaleCatalogNodes(collectCatalogPaths(catalogTree), stats)
  const brandMap = await seedBrands(products, stats)
  const importedProducts = await seedProducts(products, brandMap, stats)
  await seedProductRelations(products, importedProducts, stats)

  console.log(
    JSON.stringify(
      {
        catalogNodes: stats.catalogNodes,
        brands: stats.brands,
        products: stats.products,
        productImages: stats.images,
        productRelations: stats.relations,
        stockRecords: stats.stock,
        staleCatalogNodes: stats.staleCatalogNodes,
        skippedProducts: stats.skippedProducts.length,
        warnings: stats.warnings,
      },
      null,
      2,
    ),
  )
  console.log('Seed finished')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
