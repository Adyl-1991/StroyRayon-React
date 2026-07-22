import { CatalogDirectory } from '../components/catalog/CatalogDirectory'
import { Seo } from '../components/seo/Seo'
import { Breadcrumbs } from '../components/ui/Breadcrumbs'
import { useCatalogTree } from '../hooks/useCatalogTree'
import { useLocale } from '../i18n/LocaleContext'
import { buildCatalogPageStructuredData, getPageCanonical } from '../utils/seoUtils'

export function CatalogPage() {
  const { nodes, isLoading } = useCatalogTree()
  const { t } = useLocale()

  return (
    <main className="page catalog-directory-page">
      <Seo
        title={t('catalog.title')}
        description={t('catalog.description')}
        canonical={getPageCanonical('/catalog')}
        structuredData={buildCatalogPageStructuredData({
          path: '/catalog',
          title: t('catalog.title'),
          description: t('catalog.description'),
          items: nodes.map((node) => ({
            name: node.titleKg,
            url: `/catalog/${node.slug}`,
          })),
        })}
      />
      <Breadcrumbs items={[{ label: t('common.catalog') }]} />
      <div className="page-heading page-heading--compact">
        <h1>{t('catalog.title')}</h1>
        <p>{t('catalog.intro')}</p>
      </div>

      <CatalogDirectory nodes={nodes} />
      {isLoading && (
        <p className="microcopy" role="status">
          {t('common.loadingCatalog')}
        </p>
      )}
    </main>
  )
}
