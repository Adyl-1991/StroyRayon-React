import assert from 'node:assert/strict'
import { access, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import sharp from 'sharp'

import { catalogTree } from '../src/data/catalogTree.js'
import { heroSlides } from '../src/data/heroSlides.js'
import { products } from '../src/data/products.js'
import { getProductBySlug, normalizeCatalogTree } from '../src/services/productService.js'
import {
  getCategoryImage,
  getOptimizedProductImage,
  getProductGallery,
  getProductImage,
} from '../src/utils/imageUtils.js'
import { isRealProductImage } from '../src/utils/productImageSeo.js'

const root = process.cwd()
const productsRoot = path.join(root, 'public', 'images', 'products')
const expectedVariants = [
  { filename: 'thumb-320.webp', width: 320 },
  { filename: 'card-640.webp', width: 640 },
  { filename: 'detail-900.webp', width: 900 },
]

test('hero banners provide lightweight responsive AVIF and WebP files', async () => {
  let originalBytes = 0
  let optimizedAvifBytes = 0

  for (const slide of heroSlides) {
    assert.match(slide.imageBase, /^\/images\/banners\/optimized\/hero-[a-z-]+$/)
    const sourcePath = path.join(root, 'public', 'images', 'banners', `hero-${slide.id}.png`)
    originalBytes += (await stat(sourcePath)).size

    for (const width of [768, 1600]) {
      for (const format of ['avif', 'webp']) {
        const imagePath = path.join(root, 'public', `${slide.imageBase}-${width}.${format}`)
        const metadata = await sharp(imagePath).metadata()
        assert.equal(metadata.format, format === 'avif' ? 'heif' : format, imagePath)
        assert.equal(metadata.width, width, imagePath)
        if (format === 'avif') optimizedAvifBytes += (await stat(imagePath)).size
      }
    }
  }

  assert.ok(
    optimizedAvifBytes < originalBytes * 0.05,
    `responsive AVIF total ${optimizedAvifBytes} should be below 5% of PNG total ${originalBytes}`,
  )
})

test('mobile hero banners preserve every slide in a compact 10:7 composition', async () => {
  const mobileRoot = path.join(root, 'public', 'images', 'banners', 'mobile')

  for (const slide of heroSlides) {
    for (const format of ['avif', 'webp']) {
      const imagePath = path.join(mobileRoot, `hero-${slide.id}-768.${format}`)
      const metadata = await sharp(imagePath).metadata()
      const imageBytes = (await stat(imagePath)).size

      assert.equal(metadata.format, format === 'avif' ? 'heif' : format, imagePath)
      assert.equal(metadata.width, 768, imagePath)
      assert.equal(metadata.height, 540, imagePath)
      assert.ok(imageBytes < 50_000, `${imagePath} should remain below 50 KB`)
    }
  }
})

async function alinexDirectories() {
  return (await readdir(productsRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith('alinex-'))
    .map((entry) => entry.name)
    .sort()
}

test('every AlinEX product has valid responsive WebP variants', async () => {
  const directories = await alinexDirectories()
  assert.equal(directories.length, 34)

  let sourceBytes = 0
  let cardBytes = 0
  for (const directory of directories) {
    const productDirectory = path.join(productsRoot, directory)
    const sourcePath = path.join(productDirectory, 'main.png')
    sourceBytes += (await stat(sourcePath)).size

    for (const variant of expectedVariants) {
      const variantPath = path.join(productDirectory, variant.filename)
      const metadata = await sharp(variantPath).metadata()
      assert.equal(metadata.format, 'webp', variantPath)
      assert.equal(metadata.width, variant.width, variantPath)
      assert.equal(metadata.height, Math.round(variant.width * 0.75), variantPath)
      if (variant.filename === 'card-640.webp') cardBytes += (await stat(variantPath)).size
    }
  }

  assert.ok(cardBytes < sourceBytes * 0.1, `card WebP total ${cardBytes} should be below 10% of PNG total ${sourceBytes}`)
})

test('AlinEX image helper supplies srcset and preserves the PNG fallback', () => {
  const source = '/images/products/alinex-gipsovaia-stukaturnaia-smes-alinex-grender/main.png'
  const image = getOptimizedProductImage({
    src: source,
    fallbackSrc: '/images/placeholders/product-building-placeholder.svg',
    alt: 'AlinEX Grender',
    width: 900,
    height: 675,
  }, 'card')

  assert.equal(image.src, '/images/products/alinex-gipsovaia-stukaturnaia-smes-alinex-grender/card-640.webp')
  assert.match(image.srcSet, /thumb-320\.webp 320w/)
  assert.match(image.srcSet, /detail-900\.webp 900w/)
  assert.equal(image.fallbackSrc, source)
  assert.equal(image.placeholderSrc, '/images/placeholders/product-building-placeholder.svg')
})

test('audited products use stable placeholders without requesting missing legacy WebP files', () => {
  const auditedSlugs = [
    'sugat-shlangy-12-25m',
    'teplyi-pol-kollektor-komplekt',
    'valik-boyok-uchun-250mm',
    'kist-50mm',
    'ichki-dubal-boyogu-ak-10l',
    'universal-koler',
    'vodoemulsiyalyk-boyok-10l',
    'malyardyk-lenta',
    'fasad-boyogu-ak-10l',
    'boyok-gruntovka-10l',
    'boyok-vannochka',
    'kabeldik-teplyi-pol-10m',
    'kabeldik-teplyi-pol-20m',
    'mat-teplyi-pol-1m2',
    'mat-teplyi-pol-3m2',
    'mat-teplyi-pol-2m2',
    'teplyi-pol-montazh-lenta',
  ]

  let checkedProducts = 0
  for (const slug of auditedSlugs) {
    const bundledProduct = getProductBySlug(slug, products)
    if (!bundledProduct) continue
    checkedProducts += 1
    const missingMain = `/images/products/${slug}/main.webp`
    const product = {
      ...bundledProduct,
      imageStatus: undefined,
      isPlaceholderImage: undefined,
      images: [
        {
          src: `https://www.stroyrayon.kg${missingMain}`,
          fallbackSrc: bundledProduct.images?.[0]?.fallbackSrc,
          expectedSrc: missingMain,
          futureSrc: missingMain,
          storageDriver: 'legacy',
        },
        {
          src: `/images/products/${slug}/gallery-1.webp`,
          fallbackSrc: bundledProduct.images?.[0]?.fallbackSrc,
          storageDriver: 'legacy',
        },
      ],
    }

    const image = getProductImage(product)
    const gallery = getProductGallery(product)

    assert.notEqual(image.src, missingMain, slug)
    assert.doesNotMatch(image.src, new RegExp(`/images/products/${slug}/(?:main|gallery-[0-9]+)\\.webp`), slug)
    assert.equal(image.expectedSrc, undefined, slug)
    assert.equal(image.futureSrc, undefined, slug)
    assert.deepEqual(gallery.map((item) => item.src), [image.src], slug)
  }
  assert.equal(checkedProducts, 3)
})

test('API-shaped EVER PLAST products keep verified local product photos', async () => {
  const everPlastProducts = products.filter(
    (product) => product.isActive !== false && product.slug.startsWith('ever-plast-'),
  )

  assert.equal(everPlastProducts.length, 49)
  for (const bundledProduct of everPlastProducts) {
    const main = `/images/products/${bundledProduct.slug}/main.webp`
    const apiProduct = {
      ...bundledProduct,
      imageStatus: undefined,
      isPlaceholderImage: undefined,
      images: [{
        src: main,
        alt: bundledProduct.titleKg,
        storageDriver: 'legacy',
      }],
    }

    const image = getProductImage(apiProduct)
    assert.equal(image.src, main, bundledProduct.slug)
    await access(path.join(root, 'public', main.replace(/^\//, '')))
  }
})

test('every catalog node resolves to an existing realistic image', async () => {
  const nodes = []
  const collect = (items) => items.forEach((item) => {
    nodes.push(item)
    collect(item.children || [])
  })
  collect(catalogTree)

  assert.equal(nodes.length, 167)
  assert.equal(nodes.some((node) => node.slug === 'montazhdyk-aralashmalar'), false)
  assert.equal(nodes.some((node) => node.slug === 'remonttuk-aralashmalar'), false)
  for (const node of nodes) {
    const image = getCategoryImage(node)
    assert.notEqual(image.type, 'placeholder', node.slug)
    await access(path.join(root, 'public', image.src.replace(/^\//, '')))
  }
})

test('every active construction-material product has an approved catalog image', async () => {
  const buildingProducts = products.filter(
    (product) => product.isActive !== false && product.catalogPath?.[0] === 'stroymaterial',
  )

  assert.equal(buildingProducts.length, 36)
  for (const product of buildingProducts) {
    const image = getProductImage(product)
    assert.equal(isRealProductImage(image, product), true, product.slug)

    if (image.src.startsWith('/images/products/')) {
      const imagePath = path.join(root, 'public', image.src.replace(/^\//, ''))
      await access(imagePath)
      const metadata = await sharp(imagePath).metadata()
      assert.ok(['webp', 'png', 'jpeg'].includes(metadata.format), product.slug)
      if (image.src.endsWith('/main-ai-v1.webp')) {
        assert.equal(metadata.format, 'webp', product.slug)
        assert.equal(metadata.width, 900, product.slug)
        assert.equal(metadata.height, 675, product.slug)
      }
    }
  }
})

test('generated dry-mix category images are optimized landscape WebP files', async () => {
  const directory = path.join(root, 'public', 'images', 'categories', 'generated', 'dry-mixes')
  const filenames = (await readdir(directory)).filter((filename) => filename.endsWith('.webp')).sort()

  assert.deepEqual(filenames, [
    'adhesive-plaster.webp',
    'building-gypsum.webp',
    'cement-plaster.webp',
    'construction-adhesive.webp',
    'decorative-plaster.webp',
    'facade-plaster.webp',
    'plaster.webp',
    'primer.webp',
    'putty.webp',
    'sand-concrete.webp',
    'self-leveling-floor.webp',
    'tile-adhesive.webp',
    'tile-grout.webp',
    'waterproofing.webp',
  ])

  for (const filename of filenames) {
    const metadata = await sharp(path.join(directory, filename)).metadata()
    assert.equal(metadata.format, 'webp', filename)
    assert.equal(metadata.width, 768, filename)
    assert.equal(metadata.height, 512, filename)
  }
})

test('removed dry-mix categories are also filtered from the API catalog tree', () => {
  const normalized = normalizeCatalogTree([{
    slug: 'kurgak-aralashmalar',
    path: 'stroymaterial/kurgak-aralashmalar',
    children: [
      { slug: 'shtukaturkalar', path: 'stroymaterial/kurgak-aralashmalar/shtukaturkalar' },
      { slug: 'montazhdyk-aralashmalar', path: 'stroymaterial/kurgak-aralashmalar/montazhdyk-aralashmalar' },
      { slug: 'remonttuk-aralashmalar', path: 'stroymaterial/kurgak-aralashmalar/remonttuk-aralashmalar' },
    ],
  }])

  assert.deepEqual(normalized[0].children.map((node) => node.slug), ['shtukaturkalar'])
})

test('generated engineering category images are optimized landscape WebP files', async () => {
  const directory = path.join(root, 'public', 'images', 'categories', 'generated', 'engineering')
  const filenames = (await readdir(directory)).filter((filename) => filename.endsWith('.webp')).sort()

  assert.deepEqual(filenames, [
    'heating.webp',
    'metal-plastic.webp',
    'pnd-system.webp',
    'ppr-adapters.webp',
    'ppr-clips.webp',
    'ppr-combined-fittings.webp',
    'ppr-couplings.webp',
    'ppr-elbows.webp',
    'ppr-pipes.webp',
    'ppr-system.webp',
    'ppr-tees.webp',
    'ppr-valves.webp',
    'sewerage.webp',
    'valves.webp',
    'water-control.webp',
    'water-filtration.webp',
  ])

  for (const filename of filenames) {
    const metadata = await sharp(path.join(directory, filename)).metadata()
    assert.equal(metadata.format, 'webp', filename)
    assert.equal(metadata.width, 768, filename)
    assert.equal(metadata.height, 512, filename)
  }
})

test('engineering API categories are grouped into eight customer-facing sections', () => {
  const childSlugs = [
    'ppr-trubalar-fitingder',
    'kanalizaciya',
    'metall-plastik-trubalar',
    'pnd-trubalar',
    'pnd-fitingder',
    'otoplenie',
    'schetchiki-vody',
    'reduktory-davleniya',
    'zapornaya-armatura',
    'obratnye-klapany',
    'manometry',
    'filtry-gruboi-ochistki',
    'filtry-dlya-vody',
  ]
  const [engineering] = normalizeCatalogTree([{
    slug: 'inzhenerdik-santehnika',
    path: 'inzhenerdik-santehnika',
    children: childSlugs.map((slug) => ({ slug, path: `inzhenerdik-santehnika/${slug}` })),
  }])

  assert.deepEqual(engineering.children.map((node) => node.slug), [
    'ppr-trubalar-fitingder',
    'kanalizaciya',
    'metall-plastik-trubalar',
    'pnd-sistemalary',
    'otoplenie',
    'uchet-kontrol-davleniya',
    'zapornaya-zashchitnaya-armatura',
    'filtraciya-vody',
  ])
  const pndChildren = engineering.children.find((node) => node.slug === 'pnd-sistemalary').children
  assert.deepEqual(pndChildren.map((node) => node.slug), [
    'pnd-trubalar',
    'pnd-fitingder',
  ])
  assert.equal(pndChildren[0].apiCatalogPath, 'inzhenerdik-santehnika/pnd-trubalar')
})
