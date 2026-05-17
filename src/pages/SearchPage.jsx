import { useSearchParams } from 'react-router-dom'
import { Filters } from '../components/catalog/Filters'
import { Pagination } from '../components/catalog/Pagination'
import { ProductGrid } from '../components/catalog/ProductGrid'
import { Seo } from '../components/seo/Seo'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { useCatalogFilters } from '../hooks/useCatalogFilters'
import { useProducts } from '../hooks/useProducts'
import { getFilterOptions } from '../services/productService'

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = searchParams.get('q') || ''
  const { filters, setFilters } = useCatalogFilters({ preserveParams: ['q'] })
  const { products, total, page, totalPages, filterOptions: apiFilterOptions, isLoading } = useProducts({ ...filters, search: query })
  const filterOptions = apiFilterOptions || getFilterOptions()

  return (
    <main className="page">
      <Seo
        title={query ? `Издөө: ${query}` : 'Издөө'}
        description="StroyRayon сайтынан курулуш материалдарын аталышы, бренди, категориясы жана характеристикасы боюнча издеңиз."
      />
      <Breadcrumbs items={[{ label: 'Издөө' }]} />
      <div className="page-heading">
        <h1>{query ? `Издөө: “${query}”` : 'Товар издөө'}</h1>
        <p>{query ? `${total} товар табылды` : 'Издөө үчүн товар атын, брендин же категориясын жазыңыз.'}</p>
      </div>
      {query && <Filters filters={filters} setFilters={setFilters} options={filterOptions} resultCount={total} />}
      {query && isLoading && (
        <p className="microcopy" role="status">
          Издөө жыйынтыгы жаңыланууда...
        </p>
      )}
      {query && !products.length ? (
        <EmptyState
          title="Бул издөө боюнча товар табылган жок"
          text="Башка сөз менен издеп көрүңүз же каталогдон категория аркылуу тандаңыз."
          actionText="Каталогго өтүү"
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
