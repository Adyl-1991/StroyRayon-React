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
const NL1_PAGE = `${CHINT_PRODUCT_ROOT}/final-power-distribution/nl1.html`
const NL1_IMAGE_ROOT = `${CHINT_IMAGE_ROOT}/final-power-distribution/rccb/nl1/product-image/new`
const NB2LE_PAGE = 'https://www.chintglobal.com/in/en/products/low-voltage/iec/final-power-distribution/nb2le.html'
const NB2LE_IMAGE_ROOT = `${CHINT_IMAGE_ROOT}/final-power-distribution/rcbo/nb2le/product-iamge`
const NXBLE63_PAGE = 'https://www.chintglobal.com/sg/en/products/low-voltage/iec/final-power-distribution/nxble-63.html'
const NXBLE63_IMAGE_ROOT = `${CHINT_IMAGE_ROOT}/final-power-distribution/rcbo/nxble-63/product-image/new`
const NXBLE63Y_PAGE = `${CHINT_PRODUCT_ROOT}/final-power-distribution/nxble-63y.html`
const NXBLE63Y_IMAGE_ROOT = `${CHINT_IMAGE_ROOT}/final-power-distribution/rcbo/nxble-63y/product-image/new`
const NJYW1_PAGE = 'https://www.chintglobal.com/sg/en/products/low-voltage/iec/industrial-control/njyw1.html'
const NJYW1_IMAGE_ROOT = `${CHINT_IMAGE_ROOT}/industrial-control/liquid-level-relay/njyw1/product-image`
const OKMARTS_PAGE_ROOT = 'https://okmarts.com'
const OKMARTS_IMAGE_ROOT = `${OKMARTS_PAGE_ROOT}/jeecg-boot/sys/common/view/product/Circuit_Breaker/CHINT/2023`
const OKMARTS_IMAGE_PROXY = `${OKMARTS_PAGE_ROOT}/cdn-cgi/image/fit=contain,format=auto,metadata=none,onerror=redirect,quality=90,width=1000,height=1000`
const ELECTROCONTROL_NM8N250_PAGE = 'https://electrocontrol.com.ua/ua/av/271335-avtomatichnii-vimikach-v-litomu-korpusi-chint-nm8n-250s-en-250a-3p-50ka'

function okmartsNxmEntry(model) {
  const file = `Chint-Circuit-Breaker-${model}`
  return {
    slug: `chint-breakers-${model.toLowerCase()}`,
    sourcePage: `${OKMARTS_PAGE_ROOT}/chint-circuit-breaker-${model.toLowerCase()}.html`,
    imageUrl: `${OKMARTS_IMAGE_PROXY}/${OKMARTS_IMAGE_ROOT}/${file}/${file}.jpg`,
    outputName: 'main-supplier-v1.webp',
  }
}

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
  ...[
    'NXM-160S-3300',
    'NXM-250S-3300',
    'NXM-1000S-3300',
  ].map(okmartsNxmEntry),
  {
    slug: 'chint-breakers-nm8n-250s',
    sourcePage: ELECTROCONTROL_NM8N250_PAGE,
    imageUrl: 'https://electrocontrol.com.ua/productimages/000012/29868/271335-avtomatichnii-vimikach-v-litomu-korpusi-chint-nm8n-250s-en-250a-3p-50ka.jpg',
    outputName: 'main-supplier-v1.webp',
  },
  {
    slug: 'chint-rcd-nl1-63-2p',
    sourcePage: NL1_PAGE,
    imageUrl: `${NL1_IMAGE_ROOT}/NL1-63-63A-2P-RCCB-Front-10.png`,
  },
  {
    slug: 'chint-rcd-nl1-63-4p',
    sourcePage: NL1_PAGE,
    imageUrl: `${NL1_IMAGE_ROOT}/NL1-63-63A-4P-RCCB-Front-11.png`,
  },
  {
    slug: 'chint-differential-nb2le',
    sourcePage: NB2LE_PAGE,
    imageUrl: `${NB2LE_IMAGE_ROOT}/NB2LE%20%20C40-RCBO%20%201P-RCBO-Front.jpg`,
  },
  {
    slug: 'chint-differential-nxble-63',
    sourcePage: NXBLE63_PAGE,
    imageUrl: `${NXBLE63_IMAGE_ROOT}/NXBLE-63-C63-4P-N-RCBO-Front-5.png`,
  },
  {
    slug: 'chint-differential-nxble-63y',
    sourcePage: NXBLE63Y_PAGE,
    imageUrl: `${NXBLE63Y_IMAGE_ROOT}/NXBLE-63Y-C63-2P-RCBO-Front-5.png`,
  },
  {
    slug: 'chint-relays-njyw1',
    sourcePage: NJYW1_PAGE,
    imageUrl: `${NJYW1_IMAGE_ROOT}/NJYW1.png`,
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
  const outputName = entry.outputName || 'main-official-v1.webp'
  const outputPath = path.join(outputDir, outputName)
  await mkdir(outputDir, { recursive: true })

  let pipeline = sharp(source)
  if (outputName.includes('supplier')) {
    pipeline = pipeline.trim({ background: '#ffffff', threshold: 10 })
  }

  await pipeline
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
    localPath: `/images/products/${entry.slug}/${outputName}`,
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
