import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import sharp from 'sharp'

const PRODUCT_IMAGE_ROOT = path.resolve('public', 'images', 'products')
const CHINT_PRODUCT_ROOT = 'https://www.chintglobal.com/global/en/products/low-voltage/iec'
const CHINT_IMAGE_ROOT = 'https://www.chintglobal.com/content/dam/chint/global/product-center/low-voltage/iec'
const NXB63_PAGE = `${CHINT_PRODUCT_ROOT}/final-power-distribution/nxb-63.html`
const NXB63_IMAGE_ROOT = `${CHINT_IMAGE_ROOT}/final-power-distribution/mcb/nxb-63/product-image`
const NB1_PAGE = `${CHINT_PRODUCT_ROOT}/final-power-distribution/nb1-63.html`
const NB1_IMAGE_ROOT = `${CHINT_IMAGE_ROOT}/final-power-distribution/mcb/nb1-63/product-image`
const NXB125_PAGE = `${CHINT_PRODUCT_ROOT}/final-power-distribution/nxb-125.html`
const NXB125_IMAGE_ROOT = `${CHINT_IMAGE_ROOT}/final-power-distribution/mccb/nxb-125/product-image`
const NM1_PAGE = `${CHINT_PRODUCT_ROOT}/secondary-power-distribution/nm1.html`
const NM1_IMAGE_ROOT = `${CHINT_IMAGE_ROOT}/secondary-power-distribution/mccb/nm1/product-image/new`

const entries = [
  {
    slug: 'chint-breakers-nxb-63-1p',
    sourcePage: NXB63_PAGE,
    imageUrl: `${NXB63_IMAGE_ROOT}/NXB-63-C63-1P-MCB-2.png`,
  },
  {
    slug: 'chint-breakers-nxb-63-2p',
    sourcePage: NXB63_PAGE,
    imageUrl: `${NXB63_IMAGE_ROOT}/NXB-63-C63-2P-MCB-3.png`,
  },
  {
    slug: 'chint-breakers-nxb-63-3p',
    sourcePage: NXB63_PAGE,
    imageUrl: `${NXB63_IMAGE_ROOT}/NXB-63-C63-3P-MCB-2.png`,
  },
  {
    slug: 'chint-breakers-nxb-63-4p',
    sourcePage: NXB63_PAGE,
    imageUrl: `${NXB63_IMAGE_ROOT}/NXB-63-C63-4P-MCB-2.png`,
  },
  {
    slug: 'chint-breakers-nb1-1p',
    sourcePage: NB1_PAGE,
    imageUrl: `${NB1_IMAGE_ROOT}/NB1-63%20%20C63%20%201P-MCB.png`,
  },
  {
    slug: 'chint-breakers-nb1-3p',
    sourcePage: NB1_PAGE,
    imageUrl: `${NB1_IMAGE_ROOT}/NB1-63%20%20C63%20%203P-MCB.png`,
  },
  {
    slug: 'chint-breakers-nxb-125-1p',
    sourcePage: NXB125_PAGE,
    imageUrl: `${NXB125_IMAGE_ROOT}/NXB-125-125A-1P-MCB-2.png`,
  },
  {
    slug: 'chint-breakers-nxb-125-3p',
    sourcePage: NXB125_PAGE,
    imageUrl: `${NXB125_IMAGE_ROOT}/NXB-125-125A-3P-MCB-2.png`,
  },
  {
    slug: 'chint-breakers-nm1-250s',
    sourcePage: NM1_PAGE,
    imageUrl: `${NM1_IMAGE_ROOT}/NM1-250S-3300-MCCB.png`,
  },
  {
    slug: 'chint-breakers-nm1-400s',
    sourcePage: NM1_PAGE,
    imageUrl: `${NM1_IMAGE_ROOT}/NM1-400S-3300-MCCB.png`,
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
    sourcePage: entry.sourcePage,
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
