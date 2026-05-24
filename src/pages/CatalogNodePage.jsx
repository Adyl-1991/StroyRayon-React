import { useParams } from 'react-router-dom'
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
import { getCatalogNodeUrl, getFilterOptions, getProductsByCatalogNode } from '../services/productService'
import { buildBreadcrumbStructuredData, getCatalogNodeSeo } from '../utils/seoUtils'

export function CatalogNodePage() {
  const params = useParams()
  const pathSegments = (params['*'] || '').split('/').filter(Boolean)
  const { node, isLoading: isCatalogLoading } = useCatalogNode(pathSegments)
  const { filters, setFilters } = useCatalogFilters()
  const { t, nodeText } = useLocale()
  const { products, total, page, totalPages, filterOptions: apiFilterOptions, isLoading: isProductsLoading } = useProducts({
    ...filters,
    catalogNode: node,
  })

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
  const seo = getCatalogNodeSeo(node)

  return (
    <main className="page catalog-node-page">
      <Seo
        title={current.title || seo.title}
        description={current.description || seo.description}
        canonical={seo.canonical}
        structuredData={buildBreadcrumbStructuredData(breadcrumbItems)}
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
            <aside className="catalog-products-layout__filters" aria-label="Фильтрлер">
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
        <a href="https://wa.me/996700123456" target="_blank" rel="noreferrer">
          {t('common.askManager')}
        </a>
      </section>

      {current.seoText && (
        <article className="seo-text">
          <h2>
            {current.title} {t('catalog.shortAbout')}
          </h2>
          <p>{current.seoText}</p>
        </article>
      )}
    </main>
  )
}
