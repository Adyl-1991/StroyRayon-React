import { Link } from 'react-router-dom'
import { useLocale } from '../../i18n/LocaleContext'

export function Breadcrumbs({ items }) {
  const { t } = useLocale()

  return (
    <nav className="breadcrumbs" aria-label={t('header.navLabel')}>
      <Link className="breadcrumbs__home" to="/">{t('nav.home')}</Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1

        return (
          <span className={isLast ? 'breadcrumbs__item breadcrumbs__item--current' : 'breadcrumbs__item'} key={`${item.label}-${index}`}>
            <span className="breadcrumbs__separator" aria-hidden="true">/</span>
            {item.to && !isLast ? <Link to={item.to}>{item.label}</Link> : <span aria-current={isLast ? 'page' : undefined}>{item.label}</span>}
          </span>
        )
      })}
    </nav>
  )
}
