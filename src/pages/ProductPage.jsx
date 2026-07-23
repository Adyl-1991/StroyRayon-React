import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { ProductFaq } from '../components/product/ProductFaq'
import { ProductGallery } from '../components/product/ProductGallery'
import { ProductInfo } from '../components/product/ProductInfo'
import { ProductSpecs } from '../components/product/ProductSpecs'
import { ProductStickyCta } from '../components/product/ProductStickyCta'
import { RelatedProducts } from '../components/product/RelatedProducts'
import { Seo } from '../components/seo/Seo'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { useCatalogTree } from '../hooks/useCatalogTree'
import { useProductBySlug } from '../hooks/useProducts'
import { useLocale } from '../i18n/LocaleContext'
import {
  getCatalogBreadcrumbs,
  getCatalogNodeUrl,
  getDefaultVariant,
  getProductFullDescription,
  getProductListField,
  getProductShortDescription,
  getProductSpecs,
  getProductTitle,
  getRelatedProducts,
  getSelectedVariant,
  normalizeKgText,
  resolveProductSlug,
} from '../services/productService'
import { buildProductInquiryText, getWhatsAppUrl } from '../services/whatsappService'
import {
  buildBreadcrumbStructuredData,
  buildFaqStructuredData,
  buildProductStructuredData,
  combineStructuredData,
  getProductSeo,
} from '../utils/seoUtils'
import { getProductImage } from '../utils/imageUtils'

const ignoredSpecKeys = new Set([
  'descriptionru',
  'descriptionkg',
  'description',
  'documents',
  'documentation',
  'документация',
])

const specLabelMap = {
  article: { kg: 'Товар коду', ru: 'Артикул' },
  size: { kg: 'Өлчөмү', ru: 'Размер' },
  material: { kg: 'Материал', ru: 'Материал' },
  nominalPressure: { kg: 'Басым', ru: 'Давление' },
  color: { kg: 'Түсү', ru: 'Цвет' },
  warranty: { kg: 'Кепилдик', ru: 'Гарантия' },
  packageQty: { kg: 'Таңгак', ru: 'Упаковка' },
  length: { kg: 'Узундугу', ru: 'Длина' },
  diameter: { kg: 'Диаметри', ru: 'Диаметр' },
  wallThickness: { kg: 'Дубал калыңдыгы', ru: 'Толщина стенки' },
  монтаж: { kg: 'Орнотуу', ru: 'Монтаж' },
  максимальнаяТемпература: { kg: 'Эң жогорку температура', ru: 'Макс. температура' },
  эксплуатация: { kg: 'Колдонуу классы', ru: 'Класс эксплуатации' },
}

const specKeyAliases = {
  'артикул': 'article',
  'размер': 'size',
  'материал': 'material',
  'давление': 'nominalPressure',
  'номинальное давление': 'nominalPressure',
  'цвет': 'color',
  'гарантия': 'warranty',
  'упаковка': 'packageQty',
  'длина': 'length',
  'диаметр': 'diameter',
  'толщина стенки': 'wallThickness',
}

const specValueMapKg = {
  'белый': 'Ак',
  'белая': 'Ак',
  'серый': 'Боз',
  'серая': 'Боз',
  'черный': 'Кара',
  'черная': 'Кара',
  'оранжевый': 'Кызгылт сары',
  'оранжевая': 'Кызгылт сары',
  'зеленый': 'Жашыл',
  'зеленая': 'Жашыл',
  'синий': 'Көк',
  'синяя': 'Көк',
  'красный': 'Кызыл',
  'красная': 'Кызыл',
}

const summarySpecKeys = [
  'diameter',
  'wallThickness',
  'nominalPressure',
  'material',
  'length',
  'color',
]

function ProductTextList({ title, items }) {
  if (!items.length) return null

  return (
    <section className="detail-panel">
      <h2>{title}</h2>
      <ul className="product-copy-list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}

function ProductParagraphs({ text }) {
  const sections = String(text || '')
    .split(/\n{2,}/)
    .map((section) => section.trim())
    .filter(Boolean)

  if (!sections.length) return null

  return sections.map((section) => {
    const lines = section.split('\n').map((line) => line.trim()).filter(Boolean)
    const listItems = lines.filter((line) => /^[-•]\s+/.test(line))
    if (listItems.length) {
      const intro = lines.filter((line) => !/^[-•]\s+/.test(line)).join(' ')
      return (
        <div className="product-rich-text" key={section}>
          {intro && <p>{intro}</p>}
          <ul className="product-copy-list">
            {listItems.map((line) => (
              <li key={line}>{line.replace(/^[-•]\s+/, '')}</li>
            ))}
          </ul>
        </div>
      )
    }

    return <p key={section}>{lines.join(' ')}</p>
  })
}

function getLocalizedSpecLabel(key, locale) {
  const normalizedKey = String(key).trim().toLocaleLowerCase('ru')
  const mapped = specLabelMap[key] || specLabelMap[specKeyAliases[normalizedKey]]
  if (mapped) return mapped[locale] || mapped.ru || mapped.kg

  const fallback = String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase())
  return locale === 'kg' ? normalizeKgText(fallback) : fallback
}

function formatSpecValue(value, locale = 'ru') {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => formatSpecValue(item, locale)).join(', ')
  if (value && typeof value === 'object') return ''
  const formatted = String(value || '').trim()
  if (locale !== 'kg') return formatted
  return specValueMapKg[formatted.toLocaleLowerCase('ru')] || normalizeKgText(formatted)
}

function isCleanSpec(key, value) {
  const normalizedKey = String(key).toLowerCase()
  const formattedValue = formatSpecValue(value)
  return (
    formattedValue &&
    !ignoredSpecKeys.has(normalizedKey) &&
    !normalizedKey.includes('description') &&
    !normalizedKey.includes('документ') &&
    formattedValue.length <= 180 &&
    !formattedValue.includes('\n')
  )
}

function buildCleanSpecs(specifications, locale, extraSpecs = {}) {
  const rows = {}

  Object.entries({ ...specifications, ...extraSpecs }).forEach(([key, value]) => {
    if (!isCleanSpec(key, value)) return
    rows[getLocalizedSpecLabel(key, locale)] = formatSpecValue(value, locale)
  })

  return rows
}

function buildSummarySpecs(specifications, locale, variantSpecifications = {}) {
  const rows = []
  const seenLabels = new Set()

  function addSpec(key, value) {
    if (!isCleanSpec(key, value)) return

    const label = getLocalizedSpecLabel(key, locale)
    const normalizedLabel = label.toLocaleLowerCase()
    if (seenLabels.has(normalizedLabel)) return

    seenLabels.add(normalizedLabel)
    rows.push({ label, value: formatSpecValue(value, locale) })
  }

  Object.entries(variantSpecifications || {}).forEach(([key, value]) => addSpec(key, value))
  summarySpecKeys.forEach((key) => addSpec(key, specifications[key]))

  Object.entries(specifications).forEach(([key, value]) => {
    const normalizedKey = String(key).toLocaleLowerCase()
    const isVariantCount = Object.keys(variantSpecifications || {}).length > 0
      && /^(размеры|өлчөмдөр|sizes)$/.test(normalizedKey)

    if (!isVariantCount) addSpec(key, value)
  })

  return rows.slice(0, 6)
}

function stripDocumentationSection(text) {
  return String(text || '')
    .replace(/\n*Документация[\s\S]*$/i, '')
    .trim()
}

const documentTypeLabels = {
  kg: {
    CERTIFICATE: 'Сертификат',
    MANUAL: 'Колдонмо',
    PASSPORT: 'Товардын паспорту',
    OTHER: 'Документ',
  },
  ru: {
    CERTIFICATE: 'Сертификат',
    MANUAL: 'Инструкция',
    PASSPORT: 'Паспорт товара',
    OTHER: 'Документ',
  },
}

function extractDocumentation(product, specifications, locale) {
  const labels = documentTypeLabels[locale] || documentTypeLabels.kg
  if (Array.isArray(product?.documents) && product.documents.length) {
    return product.documents
      .map((item) => ({
        title: locale === 'kg'
          ? `${labels[item.type] || labels.OTHER}: ${getProductTitle(product, 'kg')}`
          : String(item.title || '').trim(),
        url: String(item.url || '').trim(),
        label: labels[item.type] || (locale === 'kg' ? normalizeKgText(item.label) : item.label) || item.type || labels.OTHER,
      }))
      .filter((item) => item.title && item.url)
  }

  const documents = specifications.documents || specifications.documentation || specifications['Документация']
  if (Array.isArray(documents)) {
    return documents
      .filter(Boolean)
      .map((item) => ({ title: String(item).trim(), url: '', label: 'Документ' }))
  }

  const source = String(specifications.descriptionRu || specifications.description || '')
  const documentSection = source.match(/Документация[\s\S]*$/i)?.[0] || ''
  return documentSection
    .split('\n')
    .map((line) => line.replace(/^[-•]\s*/, '').trim())
    .filter((line) => line && !/^Документация/i.test(line))
    .map((line) => ({ title: line, url: '', label: 'Документ' }))
}

export function ProductPage() {
  const { productSlug } = useParams()
  const canonicalProductSlug = resolveProductSlug(productSlug)
  const { locale, nodeText, t } = useLocale()
  const { nodes: catalogNodes } = useCatalogTree()
  const { product, isLoading } = useProductBySlug(canonicalProductSlug)
  const [variantSelection, setVariantSelection] = useState({ productId: '', variantId: '' })
  const defaultVariant = useMemo(() => getDefaultVariant(product), [product])
  const selectedVariantId = variantSelection.productId === product?.id ? variantSelection.variantId : defaultVariant?.id || ''

  const selectedVariant = useMemo(
    () => getSelectedVariant(product, selectedVariantId),
    [product, selectedVariantId],
  )

  function handleVariantChange(variantId) {
    setVariantSelection({ productId: product?.id || '', variantId })
  }

  if (productSlug && canonicalProductSlug !== productSlug) {
    return <Navigate to={`/product/${canonicalProductSlug}`} replace />
  }

  if (!product && isLoading) {
    return (
      <main className="page">
        <p className="microcopy" role="status">
          {t('product.loading')}
        </p>
      </main>
    )
  }

  if (!product) {
    return <EmptyState title={t('product.notFoundTitle')} text={t('product.notFoundText')} />
  }

  const productName = getProductTitle(product, locale)
  const shortDescription = getProductShortDescription(product, locale)
  const specifications = getProductSpecs(product, locale)
  const fullDescription = stripDocumentationSection(
    locale === 'ru'
      ? specifications.descriptionRu || getProductFullDescription(product, locale)
      : getProductFullDescription(product, locale),
  )
  const applicationItems = getProductListField(product, 'application', locale)
  const benefitItems = getProductListField(product, 'benefits', locale)
  const instructionItems = getProductListField(product, 'instructions', locale)
  const faqItems = getProductListField(product, 'faq', locale)
  const documents = extractDocumentation(product, specifications, locale)
  const relatedProducts = getRelatedProducts(product)
  const catalogBreadcrumbs = getCatalogBreadcrumbs(product.catalogPath || [], catalogNodes)
  const variantSpecs = buildCleanSpecs(specifications, locale, {
    ...(selectedVariant?.specs || {}),
  })
  const summarySpecs = buildSummarySpecs(specifications, locale, selectedVariant?.specs)
  const breadcrumbItems = [
    { label: t('common.catalog'), to: '/catalog' },
    ...catalogBreadcrumbs.map((item) => ({ label: nodeText(item).title, to: getCatalogNodeUrl(item.path) })),
    { label: productName },
  ]
  const seo = getProductSeo(product, locale)
  const productImage = getProductImage(product)
  const seoImage = productImage.type === 'placeholder' || productImage.src.includes('/placeholders/')
    ? undefined
    : productImage.src
  const managerAskText = buildProductInquiryText({ product: { ...product, name: productName }, variant: selectedVariant, locale })

  return (
    <main className="page">
      <Seo
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        image={seoImage}
        imageAlt={productName}
        type="product"
        structuredData={combineStructuredData(
          buildProductStructuredData(product, locale),
          buildBreadcrumbStructuredData(breadcrumbItems),
          buildFaqStructuredData(faqItems),
        )}
      />
      <Breadcrumbs items={breadcrumbItems} />
      {isLoading && (
        <p className="microcopy" role="status">
          {t('product.updating')}
        </p>
      )}
      {!catalogBreadcrumbs.length && (
        <section className="notice" role="status">
          {t('product.incompleteCatalogNotice')}
        </section>
      )}

      <div className="product-layout">
        <ProductGallery key={product.id} product={product} selectedVariant={selectedVariant} />
        <ProductInfo
          product={product}
          selectedVariant={selectedVariant}
          onVariantChange={handleVariantChange}
          summarySpecs={summarySpecs}
        />
      </div>

      <nav className="product-section-nav" aria-label={t('product.sectionNavLabel')}>
        <a href="#product-description">{t('product.fullDescription')}</a>
        <a href="#product-specs">{t('product.specifications')}</a>
        {documents.length > 0 && <a href="#product-documents">{t('product.documentation')}</a>}
        <a href="#product-delivery">{t('product.deliveryTitle')}</a>
      </nav>

      <div className="product-content-layout">
        <div className="product-content-main">
          <section id="product-description" className="detail-panel product-section product-description-panel">
            <h2>{t('product.fullDescription')}</h2>
            <ProductParagraphs text={fullDescription || shortDescription} />
          </section>

          <ProductSpecs id="product-specs" className="product-section product-spec-section" specs={variantSpecs} />

          {documents.length > 0 && (
            <section id="product-documents" className="detail-panel product-section product-documents">
              <h2>{t('product.documentation')}</h2>
              <div className="product-documents__list">
                {documents.map((documentItem) => (
                  <div key={`${documentItem.url}-${documentItem.title}`} className="product-document-row">
                    <span aria-hidden="true">{documentItem.label}</span>
                    {documentItem.url ? (
                      <a href={documentItem.url} target="_blank" rel="noreferrer">
                        {documentItem.title}
                      </a>
                    ) : (
                      <p>{documentItem.title}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <ProductTextList title={t('product.application')} items={applicationItems} />
          <ProductTextList title={t('product.benefits')} items={benefitItems} />
          <ProductTextList title={t('product.instructions')} items={instructionItems} />
          <ProductFaq items={faqItems} />
        </div>

        <aside className="product-content-side">
          <section id="product-delivery" className="detail-panel product-section">
            <h2>{t('product.deliveryTitle')}</h2>
            <ul className="product-copy-list">
              <li>{t('product.delivery')}</li>
              <li>{t('product.payment')}</li>
              <li>{t('product.whatsappClarify')}</li>
            </ul>
            <p className="price-disclaimer">{t('product.priceDisclaimer')}</p>
          </section>

          <section className="detail-panel manager-cta product-section">
            <h2>{t('product.managerTitle')}</h2>
            <p>{t('product.managerText')}</p>
            <a href={getWhatsAppUrl(managerAskText)} target="_blank" rel="noreferrer">
              {t('product.askWhatsApp')}
            </a>
          </section>
        </aside>
      </div>

      <RelatedProducts products={relatedProducts} />
      <ProductStickyCta product={product} selectedVariant={selectedVariant} />
    </main>
  )
}
