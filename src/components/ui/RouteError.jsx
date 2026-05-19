import { useLocale } from '../../i18n/LocaleContext'
import { EmptyState } from './EmptyState'

export function RouteError() {
  const { t } = useLocale()
  return <EmptyState title={t('common.notFoundTitle')} text={t('common.notFoundText')} />
}
