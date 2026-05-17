import { useParams } from 'react-router-dom'
import { CatalogSidebar } from '../components/catalog/CatalogSidebar'
import { Filters } from '../components/catalog/Filters'
import { ProductGrid } from '../components/catalog/ProductGrid'
import { Seo } from '../components/seo/Seo'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { EmptyState } from '../components/ui/EmptyState'
import { useCatalogFilters } from '../hooks/useCatalogFilters'
import { useProducts } from '../hooks/useProducts'
import { getCategoryBySlug, getFilterOptions, getSubcategory } from '../services/productService'

export function SubcategoryPage() {
  const { categorySlug, subcategorySlug } = useParams()
  const category = getCategoryBySlug(categorySlug)
  const subcategory = getSubcategory(categorySlug, subcategorySlug)
  const { filters, setFilters } = useCatalogFilters()

  const { products } = useProducts({ ...filters, categorySlug, subcategorySlug })
  const filterOptions = getFilterOptions({ categorySlug, subcategorySlug })

  if (!category || !subcategory) {
    return <EmptyState title="Бөлүм табылган жок" text="Каталогдон туура категория тандаңыз." />
  }

  return (
    <main className="page">
      <Seo title={subcategory.name} description={subcategory.seoText || `${subcategory.name} товарларын StroyRayon каталогунан тандаңыз.`} />
      <Breadcrumbs
        items={[
          { label: 'Каталог', to: '/catalog' },
          { label: category.name, to: `/catalog/${category.slug}` },
          { label: subcategory.name },
        ]}
      />
      <div className="page-heading">
        <h1>{subcategory.name}</h1>
        <p>{category.name} ичиндеги товарлар. Бааны, наличиени жана колдонуу кеңешин салыштырып тандаңыз.</p>
      </div>
      <div className="catalog-layout">
        <CatalogSidebar activeCategorySlug={category.slug} />
        <section>
          <p className="result-note">{products.length} товар табылды</p>
          <Filters filters={filters} setFilters={setFilters} options={filterOptions} resultCount={products.length} />
          <ProductGrid products={products} />
          <section className="consultation-inline">
            <h2>Кайсы товарды тандай албай жатасызбы?</h2>
            <p>Кайсы негизге жана канча көлөмгө керек экенин жазсаңыз, менеджер туура товарды тактап берет.</p>
            <a href="https://wa.me/996700123456" target="_blank" rel="noreferrer">
              Менеджерден кеңеш алуу
            </a>
          </section>
          <article className="seo-text">
            <h2>{subcategory.name} боюнча кеңеш</h2>
            <p>{subcategory.seoText || 'Туура тандоо үчүн колдонуу жерин, көлөмдү жана жеткирүү убактысын алдын ала тактаңыз.'}</p>
          </article>
        </section>
      </div>
    </main>
  )
}
