import { Navigate, useParams } from 'react-router-dom'
import { CatalogNodeGrid } from '../components/catalog/CatalogNodeGrid'
import { CatalogActiveFilters, Filters } from '../components/catalog/Filters'
import { Pagination } from '../components/catalog/Pagination'
import { ProductGrid } from '../components/catalog/ProductGrid'
import { Seo } from '../components/seo/Seo'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { useCatalogNode } from '../hooks/useCatalogTree'
import { useCatalogFilters } from '../hooks/useCatalogFilters'
import { useProducts } from '../hooks/useProducts'
import { useLocale } from '../i18n/LocaleContext'
import { getCatalogNodeUrl, getFilterOptions, getProductTitle, getProductsByCatalogNode } from '../services/productService'
import { getWhatsAppUrl } from '../services/whatsappService'
import {
  buildBreadcrumbStructuredData,
  buildCatalogPageStructuredData,
  combineStructuredData,
  getCatalogNodeSeo,
} from '../utils/seoUtils'

export function CatalogNodePage() {
  const params = useParams()
  const pathSegments = (params['*'] || '').split('/').filter(Boolean)
  const pathKey = pathSegments.join('/')
  const movedCatalogRoutes = {
    'teplyi-pol': '/catalog',
    'teplyi-pol/suu-teplyi-pol': '/catalog/inzhenerdik-santehnika/otoplenie/suu-teplyi-pol',
    'teplyi-pol/elektr-teplyi-pol': '/catalog/elektrika/elektr-teplyi-pol',
    'teplyi-pol/kollektor-komplektter': '/catalog/inzhenerdik-santehnika/otoplenie/suu-teplyi-pol',
    'inzhenerdik-santehnika/pnd-trubalar': '/catalog/inzhenerdik-santehnika/pnd-sistemalary/pnd-trubalar',
    'inzhenerdik-santehnika/pnd-fitingder': '/catalog/inzhenerdik-santehnika/pnd-sistemalary/pnd-fitingder',
    'inzhenerdik-santehnika/schetchiki-vody': '/catalog/inzhenerdik-santehnika/uchet-kontrol-davleniya/schetchiki-vody',
    'inzhenerdik-santehnika/reduktory-davleniya': '/catalog/inzhenerdik-santehnika/uchet-kontrol-davleniya/reduktory-davleniya',
    'inzhenerdik-santehnika/manometry': '/catalog/inzhenerdik-santehnika/uchet-kontrol-davleniya/manometry',
    'inzhenerdik-santehnika/zapornaya-armatura': '/catalog/inzhenerdik-santehnika/zapornaya-zashchitnaya-armatura/zapornaya-armatura',
    'inzhenerdik-santehnika/obratnye-klapany': '/catalog/inzhenerdik-santehnika/zapornaya-zashchitnaya-armatura/obratnye-klapany',
    'inzhenerdik-santehnika/filtry-gruboi-ochistki': '/catalog/inzhenerdik-santehnika/filtraciya-vody/filtry-gruboi-ochistki',
    'inzhenerdik-santehnika/filtry-dlya-vody': '/catalog/inzhenerdik-santehnika/filtraciya-vody/filtry-dlya-vody',
    'inzhenerdik-santehnika/filtry-dlya-vody/kartridzhi': '/catalog/inzhenerdik-santehnika/filtraciya-vody/filtry-dlya-vody/kartridzhi',
    'inzhenerdik-santehnika/filtry-dlya-vody/komplektuyushchie-dlya-filtrov': '/catalog/inzhenerdik-santehnika/filtraciya-vody/filtry-dlya-vody/komplektuyushchie-dlya-filtrov',
  }
  const { node, isLoading: isCatalogLoading } = useCatalogNode(pathSegments)
  const { filters, setFilters } = useCatalogFilters()
  const { locale, t, nodeText } = useLocale()
  const { products, total, page, totalPages, filterOptions: apiFilterOptions, isLoading: isProductsLoading } = useProducts({
    ...filters,
    catalogNode: node,
  })

  if (movedCatalogRoutes[pathKey]) {
    return <Navigate to={movedCatalogRoutes[pathKey]} replace />
  }

  if (!node) {
    return (
      <main className="page">
        <Seo title={t('catalog.notFoundTitle')} description={t('catalog.notFoundText')} />
        <EmptyState title={t('catalog.notFoundTitle')} text={t('catalog.notFoundText')} />
      </main>
    )
  }

  const current = nodeText(node)
  const children = node.children || []
  const scopedProducts = getProductsByCatalogNode(node)
  const filterOptions = apiFilterOptions || getFilterOptions({ catalogNode: node })
  const hasProductScope = scopedProducts.length > 0
  const breadcrumbItems = [
    { label: t('common.catalog'), to: '/catalog' },
    ...node.breadcrumbs.map((item, index) => ({
      label: nodeText(item).title,
      to: index === node.breadcrumbs.length - 1 ? undefined : getCatalogNodeUrl(item.path),
    })),
  ]
  const seo = getCatalogNodeSeo(node, locale)

  return (
    <main className="page catalog-node-page">
      <Seo
        title={current.title || seo.title}
        description={current.description || seo.description}
        canonical={seo.canonical}
        structuredData={combineStructuredData(
          buildCatalogPageStructuredData({
            path: `/catalog/${node.path.join('/')}`,
            title: current.title || seo.title,
            description: current.description || seo.description,
            items: [
              ...children.map((child) => ({
                name: nodeText(child).title,
                url: `/catalog/${[...node.path, child.slug].join('/')}`,
              })),
              ...scopedProducts.slice(0, 50).map((product) => ({
                name: getProductTitle(product, locale),
                url: `/product/${product.slug}`,
              })),
            ],
          }),
          buildBreadcrumbStructuredData(breadcrumbItems),
        )}
      />
      <Breadcrumbs items={breadcrumbItems} />
      <div className="page-heading page-heading--compact">
        <h1>{current.title}</h1>
        <p>{current.description}</p>
      </div>

      {children.length > 0 && (
        <section className="catalog-node-section" aria-labelledby="catalog-node-children">
          <h2 id="catalog-node-children">{t('common.sections')}</h2>
          <CatalogNodeGrid nodes={children} basePath={pathSegments} />
        </section>
      )}

      {hasProductScope && (
        <section className="catalog-node-section" aria-labelledby="catalog-node-products">
          <div className="catalog-node-section__head">
            <div>
              <h2 id="catalog-node-products">{children.length ? t('catalog.sectionProducts') : t('common.products')}</h2>
              <p>
                {total} {t('common.foundProducts')}
              </p>
            </div>
          </div>
          {(isCatalogLoading || isProductsLoading) && (
            <p className="microcopy" role="status">
              {t('common.loadingProducts')}
            </p>
          )}
          <div className="catalog-products-layout">
            <aside className="catalog-products-layout__filters" aria-label={t('filters.title')}>
              <Filters filters={filters} setFilters={setFilters} options={filterOptions} resultCount={total} variant="sidebar" showActiveChips={false} />
            </aside>
            <div className="catalog-products-layout__content">
              <CatalogActiveFilters filters={filters} options={filterOptions} className="active-filters--products" />
              <ProductGrid products={products} />
              <Pagination page={page} totalPages={totalPages} setFilters={setFilters} />
            </div>
          </div>
        </section>
      )}

      {!children.length && !hasProductScope && <EmptyState title={t('catalog.emptyTitle')} text={t('catalog.emptyText')} />}

      <section className="consultation-inline catalog-consultation">
        <h2>{t('catalog.consultTitle')}</h2>
        <p>{t('catalog.consultText')}</p>
        <a href={getWhatsAppUrl('Салам! StroyRayon каталог бөлүмү боюнча адистен кеңеш алгым келет.')} target="_blank" rel="noreferrer">
          {t('common.askManager')}
        </a>
      </section>

      {current.seoText && (
        <article className="seo-text">
          <h2>{t('catalog.buyingGuide')}</h2>
          <p>{current.seoText}</p>
        </article>
      )}
    </main>
  )
}
