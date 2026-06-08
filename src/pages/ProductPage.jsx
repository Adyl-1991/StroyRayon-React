import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
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
import {
  getCatalogBreadcrumbs,
  getCatalogNodeUrl,
  getCategoryBySlug,
  getDefaultVariant,
  getRelatedProducts,
  getSelectedVariant,
  getStockLabel,
  getStockStatus,
  getSubcategory,
} from '../services/productService'
import {
  buildBreadcrumbStructuredData,
  buildProductStructuredData,
  combineStructuredData,
  getProductSeo,
} from '../utils/seoUtils'

export function ProductPage() {
  const { productSlug } = useParams()
  const { nodes: catalogNodes } = useCatalogTree()
  const { product, isLoading } = useProductBySlug(productSlug)
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

  if (!product && isLoading) {
    return (
      <main className="page">
        <p className="microcopy" role="status">
          Товар жүктөлүүдө...
        </p>
      </main>
    )
  }

  if (!product) {
    return <EmptyState title="Товар табылган жок" text="Каталогдон башка товарды тандап көрүңүз." />
  }

  const category = getCategoryBySlug(product.categorySlug)
  const subcategory = getSubcategory(product.categorySlug, product.subcategorySlug)
  const relatedProducts = getRelatedProducts(product)
  const catalogBreadcrumbs = getCatalogBreadcrumbs(product.catalogPath || [], catalogNodes)
  const variantSpecs = selectedVariant
    ? {
        ...product.specs,
        Өлчөм: selectedVariant.size,
        SKU: selectedVariant.sku,
        Таңгак: selectedVariant.packageInfo || product.packageInfoKg || product.minOrder,
        'Бар-жогу': getStockLabel(getStockStatus(selectedVariant)),
      }
    : product.specs
  const packageInfo = selectedVariant?.packageInfo || product.packageInfoKg || 'Менеджер менен такталат'
  const breadcrumbItems = [
    { label: 'Каталог', to: '/catalog' },
    ...(catalogBreadcrumbs.length
      ? catalogBreadcrumbs.map((item) => ({ label: item.titleKg, to: getCatalogNodeUrl(item.path) }))
      : [
          category ? { label: category.name, to: `/catalog/${category.slug}` } : { label: 'Категория' },
          subcategory && category
            ? { label: subcategory.name, to: `/catalog/${category.slug}/${subcategory.slug}` }
            : { label: 'Бөлүм' },
        ]),
    { label: product.name },
  ]
  const seo = getProductSeo(product)

  return (
    <main className="page">
      <Seo
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        structuredData={combineStructuredData(
          buildProductStructuredData(product),
          buildBreadcrumbStructuredData(breadcrumbItems),
        )}
      />
      <Breadcrumbs items={breadcrumbItems} />
      {isLoading && (
        <p className="microcopy" role="status">
          Товар жаңыланууда...
        </p>
      )}
      {(!catalogBreadcrumbs.length && (!category || !subcategory)) && (
        <section className="notice" role="status">
          Бул товардын категория маалыматтары толук эмес. Заказ берүү иштейт, бирок каталог байланышы кийин такталат.
        </section>
      )}
      <div className="product-layout">
        <ProductGallery key={product.id} product={product} selectedVariant={selectedVariant} />
        <ProductInfo product={product} selectedVariant={selectedVariant} onVariantChange={handleVariantChange} />
      </div>
      <div className="product-details">
        <ProductSpecs specs={variantSpecs} />
        <section className="detail-panel">
          <h2>Колдонуу боюнча кеңеш</h2>
          <p>{product.recommendedUseKg || product.advice}</p>
        </section>
        <section className="detail-panel">
          <h2>Жеткирүү жана кепилдик</h2>
          <dl className="specs">
            <div>
              <dt>Таңгак</dt>
              <dd>{packageInfo}</dd>
            </div>
            <div>
              <dt>Жеткирүү</dt>
              <dd>{product.deliveryInfoKg || 'Регион жана көлөм боюнча эсептелет'}</dd>
            </div>
            <div>
              <dt>Кепилдик</dt>
              <dd>{product.warrantyInfoKg || 'Товар түрүнө жараша такталат'}</dd>
            </div>
          </dl>
        </section>
        <section className="detail-panel manager-cta">
          <h2>Бул товарды туура тандоо үчүн менеджерден кеңеш алыңыз</h2>
          <p>Объекттин түрүн, көлөмүн жана колдонуу жерин айтсаңыз, туура марка же аналог сунуштайбыз.</p>
          <a href={`https://wa.me/996700123456?text=${encodeURIComponent(`Салам! Мен StroyRayon сайтынан ${product.name} боюнча маалымат алгым келет.`)}`} target="_blank" rel="noreferrer">
            WhatsApp аркылуу суроо берүү
          </a>
        </section>
        <ProductFaq items={product.faqKg} />
        <ProductReviews product={product} />
      </div>
      <RelatedProducts products={relatedProducts} />
      <ProductStickyCta product={product} selectedVariant={selectedVariant} />
    </main>
  )
}
