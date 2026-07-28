import { Seo } from '../components/seo/Seo'
import { EmptyState } from '../components/ui/EmptyState'
import { useLocale } from '../i18n/LocaleContext'

export function NotFoundPage() {
  const { t } = useLocale()

  return (
    <main className="page">
      <Seo
        title={t('common.notFoundTitle')}
        description={t('common.notFoundText')}
        noIndex
      />
      <EmptyState
        title={t('common.notFoundTitle')}
        text={t('common.notFoundText')}
        actionText={t('search.catalogAction')}
        actionTo="/catalog"
      />
    </main>
  )
}
