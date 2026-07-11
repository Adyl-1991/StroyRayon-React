import { useSearchParams } from 'react-router-dom'
import { Filters } from '../components/catalog/Filters'
import { Pagination } from '../components/catalog/Pagination'
import { ProductGrid } from '../components/catalog/ProductGrid'
import { Seo } from '../components/seo/Seo'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { useCatalogFilters } from '../hooks/useCatalogFilters'
import { useProducts } from '../hooks/useProducts'
import { useLocale } from '../i18n/LocaleContext'
import { getFilterOptions } from '../services/productService'

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const { t } = useLocale()
  const query = searchParams.get('q') || ''
  const { filters, setFilters } = useCatalogFilters({ preserveParams: ['q'] })
  const { products, total, page, totalPages, filterOptions: apiFilterOptions, isLoading } = useProducts({ ...filters, search: query })
  const filterOptions = apiFilterOptions || getFilterOptions()

  return (
    <main className="page">
      <Seo
        title={query ? t('search.queryHeading', { query }) : t('search.title')}
        description={t('search.seoDescription')}
        noIndex
      />
      <Breadcrumbs items={[{ label: t('search.title') }]} />
      <div className="page-heading">
        <h1>{query ? t('search.queryHeading', { query }) : t('search.heading')}</h1>
        <p>{query ? t('search.found', { count: total }) : t('search.prompt')}</p>
      </div>
      {query && <Filters filters={filters} setFilters={setFilters} options={filterOptions} resultCount={total} />}
      {query && isLoading && (
        <p className="microcopy" role="status">
          {t('search.loading')}
        </p>
      )}
      {query && !products.length ? (
        <EmptyState
          title={t('search.emptyTitle')}
          text={t('search.emptyText')}
          actionText={t('search.catalogAction')}
          actionTo="/catalog"
        />
      ) : (
        <>
          <ProductGrid products={products} />
          <Pagination page={page} totalPages={totalPages} setFilters={setFilters} />
        </>
      )}
    </main>
  )
}
