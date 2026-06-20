import { Button } from './Button'
import { useLocale } from '../../i18n/LocaleContext'

export function EmptyState({ title, text, actionText, actionTo = '/catalog' }) {
  const { t } = useLocale()

  return (
    <section className="empty-state">
      <h1>{title}</h1>
      <p>{text}</p>
      <Button to={actionTo}>{actionText || t('search.catalogAction')}</Button>
    </section>
  )
}
