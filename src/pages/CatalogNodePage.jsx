import { useParams } from 'react-router-dom'
import { CatalogNodeGrid } from '../components/catalog/CatalogNodeGrid'
import { Filters } from '../components/catalog/Filters'
import { Pagination } from '../components/catalog/Pagination'
import { ProductGrid } from '../components/catalog/ProductGrid'
import { Seo } from '../components/seo/Seo'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { useCatalogNode } from '../hooks/useCatalogTree'
import { useCatalogFilters } from '../hooks/useCatalogFilters'
import { useProducts } from '../hooks/useProducts'
import {
  getCatalogNodeUrl,
  getFilterOptions,
  getProductsByCatalogNode,
} from '../services/productService'
import { buildBreadcrumbStructuredData, getCatalogNodeSeo } from '../utils/seoUtils'

export function CatalogNodePage() {
  const params = useParams()
  const pathSegments = (params['*'] || '').split('/').filter(Boolean)
  const { node, isLoading: isCatalogLoading } = useCatalogNode(pathSegments)
  const { filters, setFilters } = useCatalogFilters()
  const { products, total, page, totalPages, filterOptions: apiFilterOptions, isLoading: isProductsLoading } = useProducts({ ...filters, catalogNode: node })

  if (!node) {
    return (
      <main className="page">
        <Seo title="Бөлүм табылган жок" description="StroyRayon каталогунан башка бөлүмдү тандаңыз." />
        <EmptyState title="Бөлүм табылган жок" text="Каталогдон башка багытты тандап көрүңүз же менеджерге жазыңыз." />
      </main>
    )
  }

  const children = node.children || []
  const scopedProducts = getProductsByCatalogNode(node)
  const filterOptions = apiFilterOptions || getFilterOptions({ catalogNode: node })
  const hasProductScope = scopedProducts.length > 0
  const breadcrumbItems = [
    { label: 'Каталог', to: '/catalog' },
    ...node.breadcrumbs.map((item, index) => ({
      label: item.titleKg,
      to: index === node.breadcrumbs.length - 1 ? undefined : getCatalogNodeUrl(item.path),
    })),
  ]
  const seo = getCatalogNodeSeo(node)

  return (
    <main className="page catalog-node-page">
      <Seo
        title={seo.title}
        description={seo.description}
        canonical={seo.canonical}
        structuredData={buildBreadcrumbStructuredData(breadcrumbItems)}
      />
      <Breadcrumbs items={breadcrumbItems} />
      <div className="page-heading page-heading--compact">
        <h1>{node.titleKg}</h1>
        <p>{node.descriptionKg}</p>
      </div>

      {children.length > 0 && (
        <section className="catalog-node-section" aria-labelledby="catalog-node-children">
          <h2 id="catalog-node-children">Бөлүмдөр</h2>
          <CatalogNodeGrid nodes={children} basePath={pathSegments} />
        </section>
      )}

      {hasProductScope && (
        <section className="catalog-node-section" aria-labelledby="catalog-node-products">
          <div className="catalog-node-section__head">
            <div>
              <h2 id="catalog-node-products">{children.length ? 'Бул бөлүмдөгү товарлар' : 'Товарлар'}</h2>
              <p>{total} товар табылды</p>
            </div>
          </div>
          {(isCatalogLoading || isProductsLoading) && (
            <p className="microcopy" role="status">
              Товарлар жаңыланууда...
            </p>
          )}
          <Filters filters={filters} setFilters={setFilters} options={filterOptions} resultCount={total} />
          <ProductGrid products={products} />
          <Pagination page={page} totalPages={totalPages} setFilters={setFilters} />
        </section>
      )}

      {!children.length && !hasProductScope && (
        <EmptyState
          title="Бул бөлүм азырынча бош"
          text="Ассортимент толукталууда. Керектүү товарды менеджерден WhatsApp аркылуу тактап алсаңыз болот."
        />
      )}

      <section className="consultation-inline catalog-consultation">
        <h2>Кайсы товарды тандай албай жатасызбы?</h2>
        <p>Объекттин түрүн, көлөмүн жана колдонуу жерин жазыңыз. Менеджер туура бөлүмдү же товарды сунуштайт.</p>
        <a href="https://wa.me/996700123456" target="_blank" rel="noreferrer">
          Менеджерден кеңеш алуу
        </a>
      </section>

      {node.seoTextKg && (
        <article className="seo-text">
          <h2>{node.titleKg} боюнча кыскача</h2>
          <p>{node.seoTextKg}</p>
        </article>
      )}
    </main>
  )
}
