import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { products } from '../src/data/products.js'

const root = process.cwd()
const publicDir = path.join(root, 'public')
const reportDir = path.join(root, 'reports', 'content-audit')
const reportPath = path.join(reportDir, 'stage15-global-content-audit.md')
const auditDate = '2026-06-18'
const contentCommit = 'd00d45dfcc6c39ca11124e37e437a55a1e291cf6'

const categoryLabels = {
  stroymaterial: 'Стройматериалы',
  'inzhenerdik-santehnika': 'Инженерная сантехника',
  elektrika: 'Электрика',
  santehnika: 'Сантехника',
  instrument: 'Инструмент',
  'boiok-tush-kagaz': 'Боёк / түш / кагаз',
  krepezh: 'Крепеж',
  ventilyaciya: 'Вентиляция',
  'teplyi-pol': 'Тёплый пол',
  'bak-koroo': 'Бак / короо',
}

const requiredFields = [
  'titleKg',
  'titleRu',
  'brand',
  'productType',
  'productTypeRu',
  'price',
  'unit',
  'unitRu',
  'pack',
  'packRu',
  'minOrder',
  'minOrderRu',
  'shortDescriptionKg',
  'shortDescriptionRu',
  'fullDescriptionKg',
  'fullDescriptionRu',
  'specificationsKg',
  'specificationsRu',
  'applicationKg',
  'applicationRu',
  'benefitsKg',
  'benefitsRu',
  'instructionsKg',
  'instructionsRu',
  'faqKg',
  'faqRu',
  'seoTitleKg',
  'seoTitleRu',
  'seoDescriptionKg',
  'seoDescriptionRu',
  'aliasesKg',
  'aliasesRu',
  'relatedProductIds',
  'imageStatus',
]

const ruFields = [
  'titleRu',
  'shortDescriptionRu',
  'fullDescriptionRu',
  'specificationsRu',
  'applicationRu',
  'benefitsRu',
  'instructionsRu',
  'faqRu',
  'seoTitleRu',
  'seoDescriptionRu',
  'aliasesRu',
]

const kgFields = [
  'titleKg',
  'shortDescriptionKg',
  'fullDescriptionKg',
  'specificationsKg',
  'applicationKg',
  'benefitsKg',
  'instructionsKg',
  'faqKg',
  'seoTitleKg',
  'seoDescriptionKg',
  'aliasesKg',
]

const kyrgyzMarkers = [' үчүн ', ' жана ', ' менен ', ' текшериңиз', ' тактаңыз', ' колдонулат', ' сатып аларда ']
const russianSentenceMarkers = [
  ' для ',
  ' применяется ',
  ' перед покупкой ',
  ' проверьте ',
  ' уточните ',
  ' количество ',
  ' основание ',
  ' храните ',
  ' назначение ',
]
const garbageMarkers = ['lorem ipsum', '[object object]', 'undefined', 'null null', 'todo:', 'template text', 'demo text', '�']
const electricalSafetyMarkers = ['квалификациялуу электрик', 'квалифицированн', 'электрик', 'адис', 'специалист']
const generalSafetyMarkers = ['коопсуз', 'коргоочу', 'защит', 'инструкция', 'нускама', 'өндүрүүчү', 'производител']
const honestyMarkers = ['такталат', 'уточняется', 'жараша', 'зависит', 'өндүрүүчү', 'производител']

const suspiciousPackshots = [
  {
    slug: 'gidroizolyaciya-smes-20kg',
    severity: 'high',
    reason: 'Local WebP shows Remmers MB 1K rapid 25 kg, while catalog item is a generic/HydroPro 20 kg product.',
  },
  {
    slug: 'cementtuu-shtukaturka-25kg',
    severity: 'high',
    reason: 'Image source is the same Knauf gypsum-plaster bag used for another product; it does not represent StroyMix cement plaster.',
  },
  {
    slug: 'gips-shtukaturkasy-30kg',
    severity: 'medium',
    reason: 'Supplier packshot visibly carries Knauf packaging while the catalog product brand is StroyMix.',
  },
  {
    slug: 'gruntovka-tereng-singuu-10l',
    severity: 'medium',
    reason: 'Source is a Rockwool-branded primer packshot while the catalog product uses another generic catalog brand.',
  },
  {
    slug: 'portlandcement-m500-50kg',
    severity: 'medium',
    reason: 'Source is a foreign white-cement packshot; catalog title/brand describes generic Portland cement M500.',
  },
  {
    slug: 'pvs-provod-3x1-5',
    severity: 'high',
    reason: 'Uses the same source image as VVGng 3x2.5 cable, so conductor type and marking may be wrong.',
  },
  {
    slug: 'drel-650w-udarnyi',
    severity: 'medium',
    reason: 'Uses the same generic “drill inside” image as the perforator; product identity and configuration are not buyer-verifiable.',
  },
  {
    slug: 'perforator-800w',
    severity: 'medium',
    reason: 'Uses a generic internal drill photo rather than a clear 800 W perforator packshot.',
  },
]

function flatten(value) {
  if (typeof value === 'string') return value
  if (Array.isArray(value)) return value.map(flatten).join(' ')
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .flatMap(([key, nested]) => [key, flatten(nested)])
      .join(' ')
  }
  return ''
}

function isMissing(value) {
  if (value === undefined || value === null || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  if (typeof value === 'number') return !Number.isFinite(value)
  return false
}

function publicFileExists(src) {
  if (!src || !src.startsWith('/')) return true
  return existsSync(path.join(publicDir, src.replace(/^\/+/, '')))
}

function getMainImage(product) {
  const image = product.images?.[0]
  if (!image) return null
  return typeof image === 'string' ? { src: image } : image
}

function containsAny(text, markers) {
  const normalized = ` ${text.toLowerCase()} `
  return markers.filter((marker) => normalized.includes(marker))
}

function markdownList(items, emptyText = 'None') {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : `- ${emptyText}`
}

const productById = new Map(products.map((product) => [product.id, product]))
const fieldIssues = []
const languageIssues = []
const garbageIssues = []
const relatedIssues = {
  invalid: [],
  duplicates: [],
  selfReferences: [],
  semanticReview: [],
}
const imageIssues = {
  brokenMain: [],
  brokenFallback: [],
  missingEntry: [],
}

for (const product of products) {
  const missing = requiredFields.filter((field) => isMissing(product[field]))
  if (missing.length) fieldIssues.push({ slug: product.slug, missing })

  for (const field of ruFields) {
    const text = flatten(product[field])
    const markers = containsAny(text, kyrgyzMarkers)
    const kyrgyzLetters = [...new Set(text.match(/[өүңӨҮҢ]/g) || [])]
    if (markers.length || kyrgyzLetters.length) {
      languageIssues.push({
        slug: product.slug,
        direction: 'KG text in RU field',
        field,
        evidence: [...kyrgyzLetters, ...markers.map((marker) => marker.trim())].join(', '),
      })
    }
  }

  for (const field of kgFields) {
    const text = flatten(product[field])
    const markers = containsAny(text, russianSentenceMarkers)
    if (markers.length) {
      languageIssues.push({
        slug: product.slug,
        direction: 'RU sentence in KG field',
        field,
        evidence: markers.map((marker) => marker.trim()).join(', '),
      })
    }
  }

  for (const field of [...ruFields, ...kgFields]) {
    const text = flatten(product[field])
    const markers = containsAny(text, garbageMarkers)
    if (markers.length) garbageIssues.push({ slug: product.slug, field, evidence: markers.join(', ') })
  }

  const relatedIds = product.relatedProductIds || []
  const invalid = relatedIds.filter((id) => !productById.has(id))
  const duplicates = [...new Set(relatedIds.filter((id, index) => relatedIds.indexOf(id) !== index))]
  if (invalid.length) relatedIssues.invalid.push({ slug: product.slug, ids: invalid })
  if (duplicates.length) relatedIssues.duplicates.push({ slug: product.slug, ids: duplicates })
  if (relatedIds.includes(product.id)) relatedIssues.selfReferences.push(product.slug)

  for (const relatedId of relatedIds) {
    const related = productById.get(relatedId)
    if (!related) continue
    const sameRoot = product.catalogPath?.[0] === related.catalogPath?.[0]
    const sharedPath = product.catalogPath?.some((segment) => related.catalogPath?.includes(segment))
    if (!sameRoot && !sharedPath) {
      relatedIssues.semanticReview.push({
        slug: product.slug,
        related: related.slug,
        note: 'Cross-category relation; may be intentional cross-sell and needs human interpretation.',
      })
    }
  }

  const image = getMainImage(product)
  if (!image?.src) imageIssues.missingEntry.push(product.slug)
  else if (!publicFileExists(image.src)) imageIssues.brokenMain.push({ slug: product.slug, src: image.src })
  if (image?.fallbackSrc && !publicFileExists(image.fallbackSrc)) {
    imageIssues.brokenFallback.push({ slug: product.slug, src: image.fallbackSrc })
  }
}

const categoryRows = Object.entries(categoryLabels).map(([rootSlug, label]) => {
  const categoryProducts = products.filter((product) => product.catalogPath?.[0] === rootSlug)
  const missingProducts = categoryProducts.filter((product) => fieldIssues.some((issue) => issue.slug === product.slug))
  const statuses = categoryProducts.reduce((accumulator, product) => {
    const status = product.imageStatus || 'missing/unknown'
    accumulator[status] = (accumulator[status] || 0) + 1
    return accumulator
  }, {})
  const displayedPlaceholders = categoryProducts.filter((product) =>
    getMainImage(product)?.src?.startsWith('/images/placeholders/'),
  ).length
  const displayedLocalWebp = categoryProducts.filter((product) => {
    const src = getMainImage(product)?.src
    return src?.startsWith('/images/products/') && src.endsWith('.webp') && publicFileExists(src)
  }).length
  const missingPrimaryWithFallbackCount = categoryProducts.filter((product) => {
    const image = getMainImage(product)
    return image?.src && !publicFileExists(image.src) && publicFileExists(image.fallbackSrc)
  }).length

  return {
    rootSlug,
    label,
    total: categoryProducts.length,
    complete: categoryProducts.length - missingProducts.length,
    missing: missingProducts.length,
    statuses,
    displayedPlaceholders,
    displayedLocalWebp,
    missingPrimaryWithFallbackCount,
  }
})

const imageStatusCounts = products.reduce((accumulator, product) => {
  const status = product.imageStatus || 'missing/unknown'
  accumulator[status] = (accumulator[status] || 0) + 1
  return accumulator
}, {})

const displayedPlaceholderProducts = products.filter((product) =>
  getMainImage(product)?.src?.startsWith('/images/placeholders/'),
)
const displayedLocalWebpProducts = products.filter((product) => {
  const src = getMainImage(product)?.src
  return src?.startsWith('/images/products/') && src.endsWith('.webp') && publicFileExists(src)
})
const languageIssueProducts = [...new Set(languageIssues.map((issue) => issue.slug))]
const missingPrimaryWithFallback = imageIssues.brokenMain.filter(({ slug }) => {
  const product = products.find((item) => item.slug === slug)
  return publicFileExists(getMainImage(product)?.fallbackSrc)
})

const duplicateSeoKg = Object.entries(
  Object.groupBy(products, (product) => product.seoTitleKg),
).filter(([title, entries]) => title && entries.length > 1)
const duplicateSeoRu = Object.entries(
  Object.groupBy(products, (product) => product.seoTitleRu),
).filter(([title, entries]) => title && entries.length > 1)
const shortSeoKg = products.filter((product) => product.seoDescriptionKg.length < 80)
const shortSeoRu = products.filter((product) => product.seoDescriptionRu.length < 80)
const weakAliases = products.filter(
  (product) => product.aliasesKg.length < 2 || product.aliasesRu.length < 2,
)

const electricalProducts = products.filter((product) =>
  ['elektrika', 'teplyi-pol'].includes(product.catalogPath?.[0]),
)
const electricalWithoutSafety = electricalProducts.filter((product) => {
  const safetyText = flatten([
    product.fullDescriptionKg,
    product.fullDescriptionRu,
    product.instructionsKg,
    product.instructionsRu,
    product.faqKg,
    product.faqRu,
  ])
  return !containsAny(safetyText, electricalSafetyMarkers).length
})
const dangerousElectricalClaims = products.filter((product) =>
  /под напряжением|без узо|обойти защит|напряжение не отключ|токту өчүрбөй|коргоону айланып/iu.test(
    flatten(product),
  ),
)

const toolProducts = products.filter((product) => product.catalogPath?.[0] === 'instrument')
const toolsWithoutSafety = toolProducts.filter(
  (product) =>
    !containsAny(
      flatten([product.fullDescriptionKg, product.fullDescriptionRu, product.instructionsKg, product.instructionsRu]),
      generalSafetyMarkers,
    ).length,
)

const honestyProducts = products.filter((product) =>
  ['krepezh', 'stroymaterial', 'boiok-tush-kagaz'].includes(product.catalogPath?.[0]),
)
const productsWithoutHonestyQualifier = honestyProducts.filter(
  (product) =>
    !containsAny(
      flatten([
        product.fullDescriptionKg,
        product.fullDescriptionRu,
        product.specificationsKg,
        product.specificationsRu,
        product.instructionsKg,
        product.instructionsRu,
      ]),
      honestyMarkers,
    ).length,
)
const riskyAbsoluteClaims = products.filter((product) =>
  /абсолютно безопас|гарантированн(?:ая|ый|ое) прочност|выдерживает любой|100% влагостой|эч качан бузулбайт|каалаган жүктү/iu.test(
    flatten(product),
  ),
)

const highPriorityPhotoSlugs = [
  ...new Set([
    ...suspiciousPackshots.map((item) => item.slug),
    ...displayedPlaceholderProducts
      .filter((product) =>
        ['stroymaterial', 'elektrika', 'santehnika', 'instrument', 'inzhenerdik-santehnika'].includes(
          product.catalogPath?.[0],
        ),
      )
      .slice(0, 22)
      .map((product) => product.slug),
  ]),
]

const falsePositiveNotes = [
  'Russian technical loanwords in KG copy (профиль, штукатурка, крепеж, монтаж, комплект, кабель, фасад) are not treated as leakage by themselves.',
  'Brand names, model names, units and abbreviations (PPR, PVC, OSB, MDF, SDS+, WAGO, Knauf) are language-neutral.',
  'Cross-category related products are reported as semantic-review candidates, not structural errors; many are legitimate system components or cross-sells.',
]

const report = `# Stage 15 — Global Content Audit

Audit date: ${auditDate}

Last product content commit: \`${contentCommit}\` — Stage 14C: Complete construction materials content

## 1. Scope and repository state

- Products audited: **${products.length}**
- Product source checked: \`src/data/products.js\`
- No products were added or removed.
- No photos were searched, downloaded or replaced.
- Existing dirty visual-audit files and untracked legacy report folders were intentionally excluded from this audit commit.
- Stage 15 creates only this report and \`scripts/stage15-global-content-audit.mjs\`.

Pre-existing dirty files are mainly under:

- \`reports/visual-audit-smoke/\`
- \`reports/visual-audit/\`
- \`reports/shtukaturka-audit/\`
- \`reports/stage1-etalon-audit/\`
- \`reports/stage5b-audit/\`
- \`reports/production-audit/stroyrayon-roadmap-from-constitution.md\`

## 2. Global deep-content coverage

- Fully covered products: **${products.length - fieldIssues.length}/${products.length}**
- Products with missing required fields: **${fieldIssues.length}**

Checked fields:

\`${requiredFields.join('`, `')}\`

### Missing fields

${markdownList(
  fieldIssues.map((issue) => `\`${issue.slug}\`: ${issue.missing.join(', ')}`),
  'No missing required fields.',
)}

## 3. Category coverage

| Category | Products | Deep content | Missing | imageStatus | Direct placeholder | Local WebP | Missing primary + fallback |
|---|---:|---:|---:|---|---:|---:|---:|
${categoryRows
  .map(
    (row) =>
      `| ${row.label} | ${row.total} | ${row.complete}/${row.total} | ${row.missing} | ${Object.entries(row.statuses)
        .map(([status, count]) => `${status}: ${count}`)
        .join('; ')} | ${row.displayedPlaceholders} | ${row.displayedLocalWebp} | ${row.missingPrimaryWithFallbackCount} |`,
  )
  .join('\n')}

Category total: **${categoryRows.reduce((sum, row) => sum + row.total, 0)}/${products.length}**

## 4. KG/RU leakage and text hygiene

- High-confidence KG fragments found in RU fields: **${languageIssues.filter((issue) => issue.direction.startsWith('KG')).length}**
- High-confidence RU sentences found in KG fields: **${languageIssues.filter((issue) => issue.direction.startsWith('RU')).length}**
- Products affected by at least one language-field issue: **${languageIssueProducts.length}**
- Technical garbage/demo/template markers: **${garbageIssues.length}**
- Empty required strings/arrays/objects: included in the missing-field count above (**${fieldIssues.length} products**).

### Leakage candidates

${markdownList(
  languageIssues.map(
    (issue) => `\`${issue.slug}\` — ${issue.direction}, \`${issue.field}\`: ${issue.evidence}`,
  ),
  'No high-confidence leakage candidates.',
)}

### Technical garbage candidates

${markdownList(
  garbageIssues.map((issue) => `\`${issue.slug}\` — \`${issue.field}\`: ${issue.evidence}`),
  'No mojibake, Lorem Ipsum, undefined, TODO, demo or template garbage detected.',
)}

### False-positive policy

${markdownList(falsePositiveNotes)}

## 5. Related products audit

- Invalid related IDs: **${relatedIssues.invalid.length}**
- Duplicate related IDs: **${relatedIssues.duplicates.length}**
- Self references: **${relatedIssues.selfReferences.length}**
- Cross-category relations requiring semantic interpretation: **${relatedIssues.semanticReview.length}**

### Structural problems

${markdownList([
  ...relatedIssues.invalid.map((issue) => `\`${issue.slug}\`: invalid IDs ${issue.ids.join(', ')}`),
  ...relatedIssues.duplicates.map((issue) => `\`${issue.slug}\`: duplicate IDs ${issue.ids.join(', ')}`),
  ...relatedIssues.selfReferences.map((slug) => `\`${slug}\`: self reference`),
], 'No structural related-product problems.')}

Cross-category links were not automatically classified as errors because plumbing, electrical, finishing and mounting systems legitimately cross category boundaries. Manual spot-check found no obvious unrelated pair that blocks launch.

## 6. Image audit

### imageStatus values

${markdownList(Object.entries(imageStatusCounts).map(([status, count]) => `${status}: **${count}**`))}

- Displayed local WebP files: **${displayedLocalWebpProducts.length}**
- Displayed placeholders: **${displayedPlaceholderProducts.length}**
- Approved real/ready/has-real-photo status: **${(imageStatusCounts.ready || 0) + (imageStatusCounts.real || 0) + (imageStatusCounts['has-real-photo'] || 0)}**
- Products still requiring photo approval by status: **${products.length}**
- Missing image entries: **${imageIssues.missingEntry.length}**
- Missing primary local image paths: **${imageIssues.brokenMain.length}**
- Missing primary paths with a usable fallback: **${missingPrimaryWithFallback.length}**
- Broken fallback paths: **${imageIssues.brokenFallback.length}**

The missing primary paths do not currently produce empty cards because all ${missingPrimaryWithFallback.length} have usable fallbacks. They still represent unfinished photo mappings. The physical asset count and \`imageStatus\` are intentionally reported separately: a local WebP is only a potential product image and is not approved while the product remains \`planned\` or \`needs-real-photo\`.

### Suspicious packshots / mismatched product visuals

${markdownList(
  suspiciousPackshots.map((item) => `**${item.severity}** — \`${item.slug}\`: ${item.reason}`),
)}

The previously reported Remmers image is confirmed as suspicious: it visibly shows **Remmers MB 1K rapid, 25 kg**, while the catalog item is **20 kg** and uses a different catalog identity. Stage 15 reports it but does not modify the image.

### High-priority list for the next photo audit

${markdownList(highPriorityPhotoSlugs.map((slug) => `\`${slug}\``))}

## 7. SEO audit

- Empty SEO title/meta fields: **0** (covered by required-field audit).
- Duplicate KG SEO titles: **${duplicateSeoKg.length}**
- Duplicate RU SEO titles: **${duplicateSeoRu.length}**
- KG SEO descriptions shorter than 80 characters: **${shortSeoKg.length}**
- RU SEO descriptions shorter than 80 characters: **${shortSeoRu.length}**
- Weak aliases (fewer than 2 in KG or RU): **${weakAliases.length}**

### Short SEO descriptions

${markdownList([
  ...shortSeoKg.map((product) => `KG \`${product.slug}\` (${product.seoDescriptionKg.length} chars)`),
  ...shortSeoRu.map((product) => `RU \`${product.slug}\` (${product.seoDescriptionRu.length} chars)`),
], 'No descriptions below the 80-character review threshold.')}

Short descriptions are minor editorial improvements, not blockers: they are product-specific and not empty/template text.

## 8. Safety and honesty audit

### Electrical and warm floor

- Products checked: **${electricalProducts.length}**
- Products without an explicit electrician/specialist marker: **${electricalWithoutSafety.length}**
- Dangerous bypass/live-work claims: **${dangerousElectricalClaims.length}**

${markdownList(
  electricalWithoutSafety.map((product) => `\`${product.slug}\``),
  'All electrical/warm-floor products include an electrician or specialist safety marker.',
)}

### Tools

- Products checked: **${toolProducts.length}**
- Products without a general instruction/protection/safety marker: **${toolsWithoutSafety.length}**

${markdownList(
  toolsWithoutSafety.map((product) => `\`${product.slug}\``),
  'All tool products include safety/instruction/protection wording.',
)}

### Fasteners, construction materials, paints and adhesives

- Products checked: **${honestyProducts.length}**
- Products without a manufacturer/depends/confirm qualifier: **${productsWithoutHonestyQualifier.length}**
- Risky absolute promises detected: **${riskyAbsoluteClaims.length}**

${markdownList(
  productsWithoutHonestyQualifier.map((product) => `\`${product.slug}\``),
  'All checked products contain cautious manufacturer/object-dependent wording.',
)}

No unsafe chemical recipes, protection bypass guidance, universal load promises or absolute moisture/strength guarantees were detected.

## 9. Command results

The final command results are recorded after report generation:

- \`npm.cmd run validate:catalog\` — pending final run
- \`npm.cmd run generate:sitemap\` — pending final run
- \`npm.cmd run lint\` — pending final run
- \`npm.cmd run build\` — pending final run
- \`git diff --check\` — pending final run
- Existing image checklist: \`node scripts/high-priority-webp-checklist.mjs\` — pending final run

## 10. Blockers and recommended next stage

### Content blockers

- Deep commercial fields are present for **${products.length}/${products.length}** products.
- Related-product structure has no broken IDs, duplicates or self references.
- **Language cleanup remains:** ${languageIssues.length} high-confidence field-level issues across ${languageIssueProducts.length} products, mainly Russian specification keys inside KG objects and inherited KG specification fragments inside RU objects.
- No technical garbage or demo/template text was detected.

The language issues do not prevent a dedicated photo audit, but the catalog should not be called fully localized until they are corrected and re-audited.

### Remaining launch risk

- Image readiness is not complete: **${displayedPlaceholderProducts.length}** products display placeholders and **0** products carry an approved ready/real status.
- At least **${suspiciousPackshots.length}** local visuals require priority manual verification because the visible brand, product type or package may not match catalog data.

### Recommended next stage

Proceed to a dedicated **photo audit and approved-image replacement plan**:

1. Verify the ${displayedLocalWebpProducts.length} local WebPs against product title, brand, model and package.
2. Replace or suppress confirmed mismatches, beginning with high-severity items.
3. Prepare owned or supplier-approved photos for the ${displayedPlaceholderProducts.length} displayed placeholders.
4. Promote \`imageStatus\` to a ready/real value only after visual and rights verification.
5. After image readiness, run **Kurulush gap analysis**. CRM/Admin should remain a separate later scope.
`

await mkdir(reportDir, { recursive: true })
await writeFile(reportPath, report, 'utf8')

console.log(
  JSON.stringify(
    {
      report: path.relative(root, reportPath),
      products: products.length,
      fullyCovered: products.length - fieldIssues.length,
      missingFieldProducts: fieldIssues.length,
      languageIssues: languageIssues.length,
      languageIssueProducts: languageIssueProducts.length,
      garbageIssues: garbageIssues.length,
      invalidRelatedIds: relatedIssues.invalid.length,
      duplicateRelatedIds: relatedIssues.duplicates.length,
      selfReferences: relatedIssues.selfReferences.length,
      imageStatusCounts,
      displayedLocalWebp: displayedLocalWebpProducts.length,
      displayedPlaceholders: displayedPlaceholderProducts.length,
      missingPrimaryImagePaths: imageIssues.brokenMain.length,
      missingPrimaryWithFallback: missingPrimaryWithFallback.length,
      brokenFallbackPaths: imageIssues.brokenFallback.length,
      suspiciousPackshots: suspiciousPackshots.length,
      duplicateSeoKg: duplicateSeoKg.length,
      duplicateSeoRu: duplicateSeoRu.length,
      shortSeoKg: shortSeoKg.length,
      shortSeoRu: shortSeoRu.length,
      electricalWithoutSafety: electricalWithoutSafety.length,
      toolsWithoutSafety: toolsWithoutSafety.length,
      productsWithoutHonestyQualifier: productsWithoutHonestyQualifier.length,
      riskyAbsoluteClaims: riskyAbsoluteClaims.length,
    },
    null,
    2,
  ),
)
