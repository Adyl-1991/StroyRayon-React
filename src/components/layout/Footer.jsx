import { Link } from 'react-router-dom'
import { useLocale } from '../../i18n/LocaleContext'
import { contactConfig } from '../../services/whatsappService'
import { Logo } from './Logo'

export function Footer() {
  const { t } = useLocale()

  return (
    <footer className="site-footer">
      <div className="site-footer__brand">
        <Logo showTagline />
        <p>{t('footer.text')}</p>
      </div>
      <div className="site-footer__links">
        <h3>{t('footer.sections')}</h3>
        <Link to="/catalog">{t('common.catalog')}</Link>
        <Link to="/delivery">{t('footer.deliveryPayment')}</Link>
        <Link to="/blog">{t('footer.advice')}</Link>
      </div>
      <div className="site-footer__links">
        <h3>{t('footer.contacts')}</h3>
        <a href={`tel:+${contactConfig.phoneDigits}`}>{contactConfig.phone}</a>
        <a href={`https://wa.me/${contactConfig.whatsapp}`}>WhatsApp</a>
        <a href={contactConfig.telegramUrl}>{contactConfig.telegram}</a>
      </div>
    </footer>
  )
}
