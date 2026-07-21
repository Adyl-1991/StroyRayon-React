import assert from 'node:assert/strict'
import { access, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import sharp from 'sharp'

import { catalogTree } from '../src/data/catalogTree.js'
import { getCategoryImage, getOptimizedProductImage } from '../src/utils/imageUtils.js'

const root = process.cwd()
const productsRoot = path.join(root, 'public', 'images', 'products')
const expectedVariants = [
  { filename: 'thumb-320.webp', width: 320 },
  { filename: 'card-640.webp', width: 640 },
  { filename: 'detail-900.webp', width: 900 },
]

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

test('every catalog node resolves to an existing realistic image', async () => {
  const nodes = []
  const collect = (items) => items.forEach((item) => {
    nodes.push(item)
    collect(item.children || [])
  })
  collect(catalogTree)

  assert.equal(nodes.length, 155)
  for (const node of nodes) {
    const image = getCategoryImage(node)
    assert.notEqual(image.type, 'placeholder', node.slug)
    await access(path.join(root, 'public', image.src.replace(/^\//, '')))
  }
})
