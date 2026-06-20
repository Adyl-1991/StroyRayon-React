import { useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { ProductFaq } from '../components/product/ProductFaq'
import { ProductGallery } from '../components/product/ProductGallery'
import { ProductInfo } from '../components/product/ProductInfo'
import { ProductReviews } from '../components/product/ProductReviews'
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
  getStockLabel,
  getStockStatus,
  normalizeKgText,
  resolveProductSlug,
} from '../services/productService'
import { buildProductInquiryText, getWhatsAppUrl } from '../services/whatsappService'
import {
  buildBreadcrumbStructuredData,
  buildProductStructuredData,
  combineStructuredData,
  getProductSeo,
} from '../utils/seoUtils'

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
  const fullDescription = getProductFullDescription(product, locale)
  const specifications = getProductSpecs(product, locale)
  const applicationItems = getProductListField(product, 'application', locale)
  const benefitItems = getProductListField(product, 'benefits', locale)
  const instructionItems = getProductListField(product, 'instructions', locale)
  const faqItems = getProductListField(product, 'faq', locale)
  const relatedProducts = getRelatedProducts(product)
  const catalogBreadcrumbs = getCatalogBreadcrumbs(product.catalogPath || [], catalogNodes)
  const activeSku = selectedVariant?.sku || product.sku || product.article
  const packageInfo =
    locale === 'ru'
      ? selectedVariant?.packageInfoRu || product.packRu || product.packageInfoRu || product.minOrderRu
      : normalizeKgText(selectedVariant?.packageInfo || product.pack || product.packageInfoKg || product.minOrder)
  const stockStatus = selectedVariant ? getStockStatus(selectedVariant) : getStockStatus(product)
  const variantSpecs = {
    ...specifications,
    ...(activeSku ? { [t('product.sku')]: activeSku } : {}),
    ...(packageInfo ? { [t('product.pack')]: packageInfo } : {}),
    [t('product.stock')]: getStockLabel(stockStatus, locale),
  }
  const workArea = specifications[t('product.workArea')] || specifications['Тип работ'] || specifications['Иш түрү']
  const mainBenefit = benefitItems[0]
  const breadcrumbItems = [
    { label: t('common.catalog'), to: '/catalog' },
    ...catalogBreadcrumbs.map((item) => ({ label: nodeText(item).title, to: getCatalogNodeUrl(item.path) })),
    { label: productName },
  ]
  const seo = getProductSeo(product, locale)
  const managerAskText = buildProductInquiryText({ product: { ...product, name: productName }, variant: selectedVariant, locale })

  return (
    <main className="page">
      <Seo
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        structuredData={combineStructuredData(
          buildProductStructuredData(product, locale),
          buildBreadcrumbStructuredData(breadcrumbItems),
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
        <ProductInfo product={product} selectedVariant={selectedVariant} onVariantChange={handleVariantChange} />
      </div>

      <div className="product-details">
        <section className="detail-panel product-quick-info">
          <h2>{t('product.quickInfo')}</h2>
          <dl className="specs">
            <div>
              <dt>{t('product.purpose')}</dt>
              <dd>{applicationItems[0] || shortDescription}</dd>
            </div>
            {workArea && (
              <div>
                <dt>{t('product.workArea')}</dt>
                <dd>{workArea}</dd>
              </div>
            )}
            {mainBenefit && (
              <div>
                <dt>{t('product.mainBenefit')}</dt>
                <dd>{mainBenefit}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="detail-panel product-description-panel">
          <h2>{t('product.fullDescription')}</h2>
          <p>{fullDescription}</p>
        </section>

        <ProductSpecs specs={variantSpecs} />
        <ProductTextList title={t('product.application')} items={applicationItems} />
        <ProductTextList title={t('product.benefits')} items={benefitItems} />
        <ProductTextList title={t('product.instructions')} items={instructionItems} />

        <section className="detail-panel">
          <h2>{t('product.deliveryTitle')}</h2>
          <ul className="product-copy-list">
            <li>{t('product.delivery')}</li>
            <li>{t('product.payment')}</li>
            <li>{t('product.whatsappClarify')}</li>
          </ul>
          <p className="price-disclaimer">{t('product.priceDisclaimer')}</p>
        </section>

        <section className="detail-panel manager-cta">
          <h2>{t('product.managerTitle')}</h2>
          <p>{t('product.managerText')}</p>
          <a href={getWhatsAppUrl(managerAskText)} target="_blank" rel="noreferrer">
            {t('product.askWhatsApp')}
          </a>
        </section>

        <ProductFaq items={faqItems} />
        <ProductReviews product={product} />
      </div>

      <RelatedProducts products={relatedProducts} />
      <ProductStickyCta product={product} selectedVariant={selectedVariant} />
    </main>
  )
}
