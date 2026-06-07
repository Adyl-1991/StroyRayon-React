import { Link } from 'react-router-dom'
import { useLocale } from '../../i18n/LocaleContext'

export function Logo({ showTagline = false }) {
  const { t } = useLocale()

  return (
    <Link className="brand-logo" to="/" aria-label={t('footer.logoLabel')}>
      <span className="brand-logo__mark" aria-hidden="true">
        <img src="/images/brand/stroyrayon-logo.png" alt="" width="512" height="512" />
      </span>
      <span>
        <span className="brand-logo__name">StroyRayon</span>
        {showTagline && <span className="brand-logo__tagline">{t('footer.tagline')}</span>}
      </span>
    </Link>
  )
}
