import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

const PRODUCT_IMAGE_ROOT = path.resolve('public', 'images', 'products')
const OFFICIAL_PAGE = 'https://www.chintglobal.com/global/en/products/low-voltage/iec/final-power-distribution/nxb-63.html'
const OFFICIAL_IMAGE_ROOT = 'https://www.chintglobal.com/content/dam/chint/global/product-center/low-voltage/iec/final-power-distribution/mcb/nxb-63/product-image'

const entries = [
  {
    slug: 'chint-breakers-nxb-63-1p',
    imageUrl: `${OFFICIAL_IMAGE_ROOT}/NXB-63-C63-1P-MCB-2.png`,
  },
  {
    slug: 'chint-breakers-nxb-63-2p',
    imageUrl: `${OFFICIAL_IMAGE_ROOT}/NXB-63-C63-2P-MCB-3.png`,
  },
  {
    slug: 'chint-breakers-nxb-63-3p',
    imageUrl: `${OFFICIAL_IMAGE_ROOT}/NXB-63-C63-3P-MCB-2.png`,
  },
  {
    slug: 'chint-breakers-nxb-63-4p',
    imageUrl: `${OFFICIAL_IMAGE_ROOT}/NXB-63-C63-4P-MCB-2.png`,
  },
]

async function downloadImage(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'StroyRayon catalog image importer (stroyrayon.kg)',
    },
    signal: AbortSignal.timeout(30_000),
  })

  if (!response.ok) {
    throw new Error(`CHINT image request failed (${response.status}): ${url}`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!contentType.startsWith('image/')) {
    throw new Error(`Expected image response, received ${contentType || 'unknown content type'}: ${url}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function importEntry(entry) {
  const source = await downloadImage(entry.imageUrl)
  const outputDir = path.join(PRODUCT_IMAGE_ROOT, entry.slug)
  const outputPath = path.join(outputDir, 'main-official-v1.webp')
  await mkdir(outputDir, { recursive: true })

  await sharp(source)
    .resize(900, 675, {
      fit: 'contain',
      background: '#ffffff',
    })
    .flatten({ background: '#ffffff' })
    .webp({ quality: 84, effort: 6 })
    .toFile(outputPath)

  const metadata = await sharp(outputPath).metadata()
  return {
    slug: entry.slug,
    localPath: `/images/products/${entry.slug}/main-official-v1.webp`,
    sourcePage: OFFICIAL_PAGE,
    sourceImage: entry.imageUrl,
    width: metadata.width,
    height: metadata.height,
    format: metadata.format,
    bytes: metadata.size,
  }
}

const results = []
for (const entry of entries) {
  results.push(await importEntry(entry))
}

console.log(JSON.stringify(results, null, 2))
