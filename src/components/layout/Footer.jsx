import { Link } from 'react-router-dom'
import { useLocale } from '../../i18n/LocaleContext'
import { contactConfig } from '../../services/whatsappService'
import { Logo } from './Logo'

export function Footer() {
  const { t } = useLocale()

  return (
    <footer className="site-footer">
      <div>
        <Logo showTagline />
        <p>{t('footer.text')}</p>
      </div>
      <div>
        <h3>{t('footer.sections')}</h3>
        <Link to="/catalog">{t('common.catalog')}</Link>
        <Link to="/delivery">{t('footer.deliveryPayment')}</Link>
        <Link to="/blog">{t('footer.advice')}</Link>
      </div>
      <div>
        <h3>{t('footer.contacts')}</h3>
        <a href={`tel:${contactConfig.phone.replaceAll(' ', '')}`}>{contactConfig.phone}</a>
        <a href={`https://wa.me/${contactConfig.whatsapp}`}>WhatsApp</a>
        <a href={`https://t.me/${contactConfig.telegram.replace('@', '')}`}>{contactConfig.telegram}</a>
      </div>
    </footer>
  )
}
