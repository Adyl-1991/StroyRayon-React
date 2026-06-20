import { CatalogDirectorySection } from './CatalogDirectorySection'
import { useLocale } from '../../i18n/LocaleContext'

export function CatalogDirectory({ nodes }) {
  const { t } = useLocale()

  return (
    <div className="catalog-directory" aria-label={t('header.categoryNavLabel')}>
      {nodes.map((node) => (
        <CatalogDirectorySection key={node.id} node={node} />
      ))}
    </div>
  )
}
