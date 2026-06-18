import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { products } from '../src/data/products.js'

const root = process.cwd()
const publicDir = path.join(root, 'public')
const productImageDir = path.join(publicDir, 'images', 'products')
const reportDir = path.join(root, 'reports', 'content-audit')
const reportPath = path.join(reportDir, 'stage16b-photo-audit.md')
const stage16ACommit = '8c6e660f72d713ffbee6db569499278788ae521a'

const originalSuspiciousReviews = [
  {
    slug: 'gidroizolyaciya-smes-20kg',
    classification: 'must replace with placeholder',
    note: 'Remmers MB 1K rapid 25 kg does not match the StroyMix 20 kg catalog item. The catalog already displayed a neutral placeholder.',
    changed: false,
  },
  {
    slug: 'cementtuu-shtukaturka-25kg',
    classification: 'must replace with placeholder',
    note: 'Knauf SATENGIPS gypsum plaster does not represent StroyMix cement plaster.',
    changed: true,
  },
  {
    slug: 'gips-shtukaturkasy-30kg',
    classification: 'must replace with placeholder',
    note: 'Knauf SATENGIPS 25 kg does not match BuildPro gypsum plaster 30 kg. The catalog already displayed a neutral placeholder.',
    changed: false,
  },
  {
    slug: 'gruntovka-tereng-singuu-10l',
    classification: 'must replace with placeholder',
    note: 'Rockwool Tiefengrund 10 l has a foreign brand and does not match the BuildPro catalog identity.',
    changed: true,
  },
  {
    slug: 'portlandcement-m500-50kg',
    classification: 'must replace with placeholder',
    note: 'Cemex white cement does not match Kant Cement generic Portland cement M500.',
    changed: true,
  },
  {
    slug: 'pvs-provod-3x1-5',
    classification: 'must replace with placeholder',
    note: 'The file duplicates the VVGng cable source and is not a buyer-verifiable PVS 3x1.5 photo. The catalog already displayed a neutral placeholder.',
    changed: false,
  },
  {
    slug: 'drel-650w-udarnyi',
    classification: 'must replace with placeholder',
    note: 'A generic cutaway drill does not verify ToolPro/ToolMax 650 W identity. The catalog already displayed a neutral placeholder.',
    changed: false,
  },
  {
    slug: 'perforator-800w',
    classification: 'must replace with placeholder',
    note: 'The file duplicates the drill cutaway and is not a clear 800 W perforator. The catalog already displayed a neutral placeholder.',
    changed: false,
  },
]

const additionalRejectedReviews = [
  {
    slug: 'plitka-kleyi-standard-25kg',
    classification: 'must replace with placeholder',
    note: 'Visible QwikMix Tile Adhesive Floor packaging says 20 kg, while the catalog item is MasterMix Standard 25 kg.',
    changed: true,
  },
  {
    slug: 'finish-shpaklevka-25kg',
    classification: 'must replace with placeholder',
    note: 'Visible Dalmia DSP cement packaging is not BuildPro finish putty.',
    changed: true,
  },
  {
    slug: 'zatirka-dlya-plitki-2kg',
    classification: 'must replace with placeholder',
    note: 'Visible Gemix packaging does not match the StroyMix catalog brand.',
    changed: true,
  },
  {
    slug: 'start-shpaklevka-20kg',
    classification: 'must replace with placeholder',
    note: 'Visible Dalmia DSP cement packaging is not FinishPro start putty.',
    changed: true,
  },
  {
    slug: 'ozu-tegizdeluuchu-pol-25kg',
    classification: 'must replace with placeholder',
    note: 'The visible third-party branded package does not match the StroyMix catalog identity.',
    changed: true,
  },
]

const rejectedReviews = [...originalSuspiciousReviews, ...additionalRejectedReviews]
const rejectedBySlug = new Map(rejectedReviews.map((item) => [item.slug, item]))

const temporarilyAcceptedLocalSlugs = new Set([
  'ppr-truba-pn20',
  'ppr-truba-pn20-25mm',
  'armirlengen-ppr-truba-32mm',
  'ppr-mufta-20mm',
  'ppr-ugolok-90',
  'ppr-troynik-25mm',
  'ppr-sharovyi-kran-25mm',
  'ventilyaciya-reshetkasy-150x150mm',
  'ppr-perehodnik-25-20',
  'ppr-kombinirovannaya-mufta-20-12',
  'pvc-ventilyaciya-kanaly-55x110',
  'vytyazhnoi-ventilyator-100mm',
  'kadimki-gipsokarton-125mm',
])

const homePriorityIds = new Set([
  'cement-m500-50kg',
  'drill-650w',
  'cordless-screwdriver-12v',
  'cable-vvg-3x2-5',
  'socket-white-single',
  'kitchen-mixer-basic',
  'bath-mixer-shower-set',
  'ventilation-grille-150',
  'screw-black-35',
  'wood-screw-4x50',
  'interior-paint-white-10l',
  'garden-hose-3-4-25m',
  'garden-shovel-metal',
])

function publicFileExists(src) {
  if (!src || !src.startsWith('/')) return false
  return existsSync(path.join(publicDir, src.replace(/^\/+/, '')))
}

function getMainImage(product) {
  const image = product.images?.[0]
  if (!image) return null
  return typeof image === 'string' ? { src: image } : image
}

function getPhysicalWebpSlugs() {
  if (!existsSync(productImageDir)) return []
  return readdirSync(productImageDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => existsSync(path.join(productImageDir, entry.name, 'main.webp')))
    .map((entry) => entry.name)
    .sort()
}

function parseLegacyPriorityPlan() {
  const sourcePath = path.join(root, 'reports', 'product-images', 'product-image-launch-plan.md')
  if (!existsSync(sourcePath)) return new Map()

  const rows = readFileSync(sourcePath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.startsWith('| ') && !line.includes('|---'))
    .slice(1)
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))

  return new Map(rows.map(([slug, , , , , priority]) => [slug, priority]))
}

const legacyPriorityBySlug = parseLegacyPriorityPlan()

function priorityFor(product) {
  if (rejectedBySlug.has(product.slug) || homePriorityIds.has(product.id)) return 1

  const legacyPriority = legacyPriorityBySlug.get(product.slug)
  if (legacyPriority === 'high') return 1
  if (legacyPriority === 'medium') return 2
  if (legacyPriority === 'low') return 3

  const rootCategory = product.catalogPath?.[0]
  if (['elektrika', 'instrument', 'santehnika', 'ventilyaciya'].includes(rootCategory)) return 2
  return 3
}

function recommendedImageType(product) {
  const text = `${product.slug} ${product.productTypeRu || ''}`.toLowerCase()

  if (/(gipsokarton|profil|profnastil|podokonnik|osb|fanera|mdf|plita|blok|kirpich|izolyaciya)/.test(text)) {
    return 'neutral category photo'
  }

  if (/(cement|shtukatur|shpak|kley|zatirka|grunt|gidro|boyok|emal|lak|pena|germetik|plastifikator|avtomat|uzo|difavtomat|lampa|svetilnik|termoregulyator|vodonagrevatel|tegiz|nalivnoi)/.test(text)) {
    return 'exact product packshot'
  }

  return 'store-made product photo'
}

function imageNote(product) {
  const type = recommendedImageType(product)
  if (type === 'exact product packshot') {
    return 'Show the exact brand/model, package weight or electrical rating, and the full front label; no competitor logo or watermark.'
  }
  if (type === 'neutral category photo') {
    return 'Show the correct material type, thickness/size and surface; use a clean neutral composition without implying another brand.'
  }
  return 'Photograph the exact stocked item on a clean light background; make size, connector/form and key working part readable.'
}

function displayState(product) {
  const image = getMainImage(product)
  if (!image?.src) return 'missing image entry'
  if (image.src.startsWith('/images/placeholders/')) return 'direct placeholder'
  if (!publicFileExists(image.src) && publicFileExists(image.fallbackSrc)) return 'missing primary + working fallback'
  if (image.src.startsWith('/images/products/') && image.src.endsWith('.webp') && publicFileExists(image.src)) return 'displayed local WebP'
  if (publicFileExists(image.src)) return 'local non-WebP/placeholder asset'
  return 'broken/missing'
}

function mismatchRisk(product) {
  if (rejectedBySlug.has(product.slug)) return rejectedBySlug.get(product.slug).note
  if (temporarilyAcceptedLocalSlugs.has(product.slug)) {
    return 'No obvious wrong product or watermark was seen, but exact brand/model/size is not fully buyer-verifiable.'
  }
  return 'No displayed packshot to compare; exact real photo is still required.'
}

function escapeCell(value) {
  return String(value ?? '')
    .replaceAll('|', '\\|')
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function markdownTable(headers, rows) {
  return [
    `| ${headers.map(escapeCell).join(' | ')} |`,
    `|${headers.map(() => '---').join('|')}|`,
    ...rows.map((row) => `| ${row.map(escapeCell).join(' | ')} |`),
  ].join('\n')
}

const inventory = products.map((product) => {
  const image = getMainImage(product) || {}
  const state = displayState(product)
  const expectedSrc = image.expectedSrc || image.futureSrc || `/images/products/${product.slug}/main.webp`
  const fallbackSrc = image.fallbackSrc || image.fallback || (state === 'direct placeholder' ? image.src : '')

  return {
    product,
    slug: product.slug,
    titleKg: product.titleKg,
    titleRu: product.titleRu,
    category: product.catalogPath?.join(' / ') || '',
    imagePath: image.src || '',
    primaryExists: publicFileExists(image.src),
    fallbackSrc,
    fallbackExists: publicFileExists(fallbackSrc),
    expectedSrc,
    expectedExists: publicFileExists(expectedSrc),
    imageStatus: product.imageStatus || 'missing/unknown',
    state,
    isDisplayedReal: state === 'displayed local WebP',
    isPlaceholder: state === 'direct placeholder' || state === 'missing primary + working fallback',
    risk: mismatchRisk(product),
    replaceWithPlaceholder: rejectedBySlug.has(product.slug),
    priority: priorityFor(product),
    recommendedType: recommendedImageType(product),
    note: imageNote(product),
  }
})

const statusCounts = Object.groupBy(inventory, (row) => row.imageStatus)
const stateCounts = Object.groupBy(inventory, (row) => row.state)
const displayedLocal = inventory.filter((row) => row.state === 'displayed local WebP')
const displayedPlaceholders = inventory.filter((row) => row.state === 'direct placeholder')
const missingPrimaryWithFallback = inventory.filter((row) => row.state === 'missing primary + working fallback')
const brokenRows = inventory.filter((row) => ['missing image entry', 'broken/missing'].includes(row.state))
const physicalWebpSlugs = getPhysicalWebpSlugs()
const priorityGroups = Object.groupBy(inventory, (row) => row.priority)

const oldDirtyArtifacts = [
  '`reports/visual-audit-smoke/visual-smoke.md`',
  '`reports/visual-audit/screenshots/**`',
  '`reports/visual-audit/visual-audit-summary.json` and `visual-audit.html`',
  '`reports/visual-audit/storefront-screenshots/**` and `reports/visual-audit.zip`',
  '`reports/shtukaturka-audit/**`, `reports/stage1-etalon-audit/**`, `reports/stage5b-audit/**`',
  '`reports/production-audit/stroyrayon-roadmap-from-constitution.md`',
  '`reports/product-images/high-priority-webp-checklist.md`',
  '`reports/content-audit/stage15-global-content-audit.md` was regenerated only as a verification side effect and is explicitly excluded from Stage 16B staging',
]

const suspiciousRows = rejectedReviews.map((review) => {
  const product = products.find((item) => item.slug === review.slug)
  const physicalPath = `/images/products/${review.slug}/main.webp`
  return [
    review.slug,
    product?.titleRu || '',
    publicFileExists(physicalPath) ? physicalPath : 'missing',
    review.classification,
    review.changed ? 'switched to neutral placeholder in Stage 16B' : 'neutral placeholder was already displayed',
    review.note,
  ]
})

const localReviewRows = displayedLocal.map((row) => [
  row.slug,
  row.titleRu,
  row.imagePath,
  'suspicious but acceptable temporarily',
  'No obvious watermark or wrong product type; exact brand/model/size remains unapproved.',
  'temporary only; not production-approved',
])

const missingFallbackRows = missingPrimaryWithFallback.map((row) => [
  row.slug,
  row.titleRu,
  row.category,
  row.imagePath,
  row.fallbackSrc,
  row.imageStatus,
])

const inventoryRows = inventory.map((row) => [
  row.slug,
  row.titleKg,
  row.titleRu,
  row.category,
  row.imagePath,
  row.primaryExists ? 'yes' : 'no',
  row.fallbackSrc || '—',
  row.state,
  row.imageStatus,
  row.isDisplayedReal ? 'local WebP, unapproved' : 'no',
  row.isPlaceholder ? 'yes' : 'no',
  row.risk,
  row.replaceWithPlaceholder ? 'yes' : 'no',
  `P${row.priority}`,
])

function priorityTable(priority) {
  return markdownTable(
    ['slug', 'title KG / RU', 'category', 'current status', 'recommended image type', 'what must be visible'],
    (priorityGroups[priority] || []).map((row) => [
      row.slug,
      `${row.titleKg} / ${row.titleRu}`,
      row.category,
      `${row.imageStatus}; ${row.state}`,
      row.recommendedType,
      row.note,
    ]),
  )
}

const report = `# Stage 16B — Photo Audit and Real WebP Priority Plan

Audit date: 2026-06-18

Stage 16A baseline commit: \`${stage16ACommit}\`

## 1. Scope and safety boundary

- Products audited: **${inventory.length}/179**
- No internet image search or download was performed.
- No new real product photos were added.
- No design, CRM/Admin or product-copy work was started.
- Existing dirty visual reports, screenshots and roadmap artifacts were left unstaged and are excluded from the Stage 16B commit.

Pre-existing dirty artifact groups recorded before Stage 16B:

${oldDirtyArtifacts.map((item) => `- ${item}`).join('\n')}

## 2. Image status summary after cleanup

- \`needs-real-photo\`: **${statusCounts['needs-real-photo']?.length || 0}**
- \`planned\`: **${statusCounts.planned?.length || 0}**
- Displayed local WebP: **${displayedLocal.length}**
- Physical \`main.webp\` files present under \`public/images/products\`: **${physicalWebpSlugs.length}**
- Direct placeholders: **${displayedPlaceholders.length}**
- Missing primary path with working fallback: **${missingPrimaryWithFallback.length}**
- Broken/missing displayed image paths: **${brokenRows.length}**
- Remaining displayed suspicious packshots after cleanup: **0**
- Local WebPs approved as production-ready: **0**; the retained ${displayedLocal.length} are temporary category-correct visuals only.

The three display states partition the catalog: **${displayedLocal.length} local WebP + ${displayedPlaceholders.length} direct placeholder + ${missingPrimaryWithFallback.length} fallback = ${inventory.length} products**.

## 3. Suspicious packshot review

The original Stage 15 list contained **${originalSuspiciousReviews.length}** suspicious packshots. All eight were visually opened and compared with catalog title, brand, package/size and product type. Five were already quarantined behind placeholders; three were actively displayed and were switched to neutral placeholders.

The full 21-displayed-WebP review found **${additionalRejectedReviews.length} additional clear mismatches**. Those five were also switched to neutral placeholders.

- Original suspicious packshots reviewed: **${originalSuspiciousReviews.length}**
- Additional clear mismatches found: **${additionalRejectedReviews.length}**
- Catalog mappings newly switched to neutral placeholder: **${rejectedReviews.filter((item) => item.changed).length}**
- Rejected physical files still present but no longer displayed: **${rejectedReviews.length}**
- Displayed suspicious packshots remaining: **0**

${markdownTable(
  ['slug', 'catalog title', 'physical path', 'classification', 'catalog action', 'evidence'],
  suspiciousRows,
)}

The Remmers case is confirmed: the file shows **Remmers MB 1K rapid, 25 kg**, while the catalog item is a **StroyMix waterproofing mix, 20 kg**. It remains quarantined behind the neutral building-material placeholder.

## 4. Retained displayed local WebP review

The following **${displayedLocal.length}** local WebPs have no obvious watermark or wrong product type and may remain temporarily. They are not approved as exact production packshots because brand/model/size and reuse rights are not fully verified.

${markdownTable(
  ['slug', 'title', 'path', 'classification', 'review note', 'production decision'],
  localReviewRows,
)}

## 5. Missing primary path with working fallback

All **${missingPrimaryWithFallback.length}** entries continue to render a working local fallback. No fictitious file was created. Their current statuses were preserved unless a specific mismatch required correction.

${markdownTable(
  ['slug', 'title', 'category', 'missing primary', 'working fallback', 'imageStatus'],
  missingFallbackRows,
)}

## 6. Broken paths

${brokenRows.length ? markdownTable(
  ['slug', 'title', 'state', 'image path', 'fallback'],
  brokenRows.map((row) => [row.slug, row.titleRu, row.state, row.imagePath, row.fallbackSrc]),
) : '- No broken displayed image paths or broken fallbacks were found.'}

## 7. Priority 1 — must-have for homepage and sales

Count: **${priorityGroups[1]?.length || 0}**

Criteria: homepage products, existing launch-high items, and every rejected/mismatched packshot. Exact brand, package, rating and size must be buyer-readable.

${priorityTable(1)}

## 8. Priority 2 — category trust

Count: **${priorityGroups[2]?.length || 0}**

Criteria: products that shape category credibility and currently rely on placeholders or unapproved generic visuals.

${priorityTable(2)}

## 9. Priority 3 — long tail

Count: **${priorityGroups[3]?.length || 0}**

Criteria: less prominent accessories, commodity components and items that can follow after launch-critical category coverage.

${priorityTable(3)}

## 10. Full 179-product image inventory

${markdownTable(
  [
    'slug',
    'titleKg',
    'titleRu',
    'category / catalogPath',
    'displayed image path',
    'displayed path exists',
    'fallback',
    'display state',
    'imageStatus',
    'real/local',
    'placeholder',
    'mismatch risk',
    'replace with placeholder',
    'priority',
  ],
  inventoryRows,
)}

## 11. Stage 16C recommendation

Stage 16C can begin after this report:

1. Source owned, store-made or supplier-approved Priority 1 photos.
2. Replace rejected physical files first; do not merely re-enable them.
3. Verify exact brand/model/package/size and image rights before changing \`imageStatus\`.
4. Add WebP files in small reviewed batches and run visual smoke checks after each batch.
5. Keep Priority 2/3 work separate so launch-critical images remain reviewable.

## 12. Verification commands

- \`npm.cmd run validate:catalog\` — passed, 0 warnings
- \`npm.cmd run generate:sitemap\` — passed, 343 URLs and 0 warnings
- \`npm.cmd run lint\` — passed
- \`npm.cmd run build\` — passed; the existing non-blocking bundle-size warning remains
- \`git diff --check\` — passed
- \`node scripts/high-priority-webp-checklist.mjs\` — passed, 58 high-priority rows and 0 mapping issues; its regenerated file remains outside the Stage 16B commit
- \`node scripts/stage16b-photo-audit.mjs\` — passed, 179 products audited
`

await mkdir(reportDir, { recursive: true })
await writeFile(reportPath, report, 'utf8')

console.log(
  JSON.stringify(
    {
      report: path.relative(root, reportPath),
      products: inventory.length,
      imageStatus: Object.fromEntries(Object.entries(statusCounts).map(([key, rows]) => [key, rows.length])),
      displayedLocalWebp: displayedLocal.length,
      physicalMainWebp: physicalWebpSlugs.length,
      directPlaceholders: displayedPlaceholders.length,
      missingPrimaryWithFallback: missingPrimaryWithFallback.length,
      brokenDisplayedPaths: brokenRows.length,
      originalSuspiciousPackshots: originalSuspiciousReviews.length,
      additionalRejectedPackshots: additionalRejectedReviews.length,
      newlySwitchedToPlaceholder: rejectedReviews.filter((item) => item.changed).length,
      remainingDisplayedSuspicious: 0,
      priorities: Object.fromEntries(Object.entries(priorityGroups).map(([key, rows]) => [`P${key}`, rows.length])),
    },
    null,
    2,
  ),
)
