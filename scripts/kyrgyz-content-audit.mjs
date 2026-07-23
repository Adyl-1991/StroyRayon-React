import { blogPosts } from '../src/data/blogPosts.js'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { catalogTree } from '../src/data/catalogTree.js'
import { heroSlides } from '../src/data/heroSlides.js'
import { products } from '../src/data/products.js'
import { findKyrgyzLanguageLeakage, normalizeKyrgyzContent, normalizeKyrgyzText } from '../src/i18n/kyrgyzText.js'
import { catalogTranslations, translations } from '../src/i18n/translations.js'
import {
  getLocalizedProductValue,
  getProductFullDescription,
  getProductListField,
  getProductShortDescription,
  getProductSpecs,
  getProductTitle,
  normalizeProductKgText,
} from '../src/services/productService.js'

function flattenStrings(value, path = '', rows = []) {
  if (typeof value === 'string') rows.push({ path, text: value })
  else if (Array.isArray(value)) value.forEach((item, index) => flattenStrings(item, `${path}[${index}]`, rows))
  else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, nested]) => flattenStrings(nested, path ? `${path}.${key}` : key, rows))
  }
  return rows
}

function flattenCatalog(nodes, parentPath = 'catalog') {
  return nodes.flatMap((node) => [
    ...flattenStrings(normalizeKyrgyzContent({
      title: node.titleKg,
      description: node.descriptionKg,
      seoText: node.seoTextKg,
    }), `${parentPath}.${node.slug}`),
    ...flattenCatalog(node.children || [], `${parentPath}.${node.slug}`),
  ])
}

function collectProductRows(product) {
  const prefix = `product.${product.slug}`
  const publicCopy = {
    title: getProductTitle(product, 'kg'),
    shortDescription: getProductShortDescription(product, 'kg'),
    fullDescription: getProductFullDescription(product, 'kg'),
    productType: getLocalizedProductValue(product, 'productType', 'kg'),
    pack: getLocalizedProductValue(product, 'pack', 'kg'),
    minOrder: getLocalizedProductValue(product, 'minOrder', 'kg'),
    specs: getProductSpecs(product, 'kg'),
    application: getProductListField(product, 'application', 'kg'),
    benefits: getProductListField(product, 'benefits', 'kg'),
    instructions: getProductListField(product, 'instructions', 'kg'),
    faq: getProductListField(product, 'faq', 'kg'),
    packageInfo: normalizeKyrgyzText(product.packageInfoKg),
    deliveryInfo: normalizeKyrgyzText(product.deliveryInfoKg),
    warrantyInfo: normalizeKyrgyzText(product.warrantyInfoKg),
    recommendedUse: normalizeKyrgyzText(product.recommendedUseKg),
    seoTitle: product.slug?.startsWith('alinex-')
      ? getProductTitle(product, 'kg')
      : normalizeProductKgText(product, product.seoTitleKg),
    seoDescription: normalizeProductKgText(product, product.seoDescriptionKg),
  }
  return flattenStrings(publicCopy, prefix)
}

export function collectKyrgyzContentRows() {
  const activeProducts = products.filter((product) => product.isActive !== false)
  const rows = [
    ...flattenStrings(normalizeKyrgyzContent(translations.kg), 'translations.kg'),
    ...flattenStrings(normalizeKyrgyzContent(Object.fromEntries(
      Object.entries(catalogTranslations).map(([slug, copy]) => [slug, copy.kg]),
    )), 'catalogTranslations.kg'),
    ...flattenCatalog(catalogTree),
    ...flattenStrings(normalizeKyrgyzContent(heroSlides.map((slide) => ({
      id: slide.id,
      title: slide.title.kg,
      text: slide.text.kg,
      cta: slide.ctaLabel.kg,
    }))), 'hero'),
    ...flattenStrings(normalizeKyrgyzContent(blogPosts.map((post) => ({
      title: post.title,
      excerpt: post.excerpt,
      category: post.category,
    }))), 'blog'),
    ...activeProducts.flatMap(collectProductRows),
  ].filter((row) => row.text)

  return { activeProducts, rows }
}

export function auditKyrgyzContent() {
  const { activeProducts, rows } = collectKyrgyzContentRows()

  const languageLeakage = rows.flatMap((row) => {
    const matches = findKyrgyzLanguageLeakage(row.text)
    return matches.length ? [{ ...row, matches }] : []
  })
  const mojibake = rows.filter((row) => /�|(?:(?:Р|С)[\u0400-\u04ff]){3}/u.test(row.text))
  const repeatedWords = rows.filter((row) => /(^|\s)([\p{L}]{3,})\s+\2(?=\s|[,.!?;:]|$)/iu.test(row.text))
  const spacing = rows.filter((row) => /\s{2,}|\s+[,.!?;:]/u.test(row.text))
  const orthography = rows.filter((row) => /[қғәіұ]|ындаги/iu.test(row.text))
  const missingProductCopy = activeProducts.flatMap((product) => {
    const missing = []
    if (!getProductTitle(product, 'kg')) missing.push('title')
    if (!getProductShortDescription(product, 'kg')) missing.push('shortDescription')
    if (!getProductFullDescription(product, 'kg')) missing.push('fullDescription')
    if (!Object.keys(getProductSpecs(product, 'kg')).length) missing.push('specifications')
    return missing.length ? [{ slug: product.slug, missing }] : []
  })

  return {
    activeProducts: activeProducts.length,
    checkedStrings: rows.length,
    languageLeakage,
    mojibake,
    repeatedWords,
    spacing,
    orthography,
    missingProductCopy,
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const result = auditKyrgyzContent()
  const summary = {
    activeProducts: result.activeProducts,
    checkedStrings: result.checkedStrings,
    languageLeakage: result.languageLeakage.length,
    mojibake: result.mojibake.length,
    repeatedWords: result.repeatedWords.length,
    spacing: result.spacing.length,
    orthography: result.orthography.length,
    missingProductCopy: result.missingProductCopy.length,
  }
  console.log(JSON.stringify({
    ...summary,
    samples: {
      languageLeakage: result.languageLeakage.slice(0, 20),
      mojibake: result.mojibake.slice(0, 10),
      repeatedWords: result.repeatedWords.slice(0, 10),
      spacing: result.spacing.slice(0, 10),
      orthography: result.orthography.slice(0, 10),
      missingProductCopy: result.missingProductCopy.slice(0, 10),
    },
  }, null, 2))
  if (Object.values(summary).slice(2).some(Boolean)) process.exitCode = 2
}
