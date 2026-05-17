import { Link, useParams } from 'react-router-dom'
import { CatalogSidebar } from '../components/catalog/CatalogSidebar'
import { Filters } from '../components/catalog/Filters'
import { ProductGrid } from '../components/catalog/ProductGrid'
import { Seo } from '../components/seo/Seo'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { useCatalogFilters } from '../hooks/useCatalogFilters'
import { useProducts } from '../hooks/useProducts'
import { getCategoryBySlug, getFilterOptions } from '../services/productService'

export function CategoryPage() {
  const { categorySlug } = useParams()
  const category = getCategoryBySlug(categorySlug)
  const { filters, setFilters } = useCatalogFilters()

  const { products } = useProducts({ ...filters, categorySlug })
  const filterOptions = getFilterOptions({ categorySlug })

  if (!category) {
    return <EmptyState title="Категория табылган жок" text="Каталогдон башка бөлүм тандаңыз." />
  }

  return (
    <main className="page">
      <Seo title={category.name} description={category.seoText} />
      <Breadcrumbs items={[{ label: 'Каталог', to: '/catalog' }, { label: category.name }]} />
      <div className="page-heading">
        <h1>{category.name}</h1>
        <p>{category.description}</p>
      </div>
      <div className="catalog-layout">
        <CatalogSidebar activeCategorySlug={category.slug} />
        <section>
          <div className="subcategory-list">
            {category.subcategories.map((subcategory) => (
              <Link key={subcategory.id} to={`/catalog/${category.slug}/${subcategory.slug}`}>
                {subcategory.name}
              </Link>
            ))}
          </div>
          <p className="result-note">{products.length} товар табылды</p>
          <Filters filters={filters} setFilters={setFilters} options={filterOptions} resultCount={products.length} />
          <ProductGrid products={products} />
          <section className="consultation-inline">
            <h2>Кайсы товарды тандай албай жатасызбы?</h2>
            <p>Объект, көлөм жана колдонуу жерин жазсаңыз, менеджер туура вариантты сунуштайт.</p>
            <a href="https://wa.me/996700123456" target="_blank" rel="noreferrer">
              Менеджерден кеңеш алуу
            </a>
          </section>
          <article className="seo-text">
            <h2>{category.name} сатып алуу</h2>
            <p>{category.seoText}</p>
          </article>
        </section>
      </div>
    </main>
  )
}
