import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useCart } from '../../hooks/useCart'
import { useLocale } from '../../i18n/LocaleContext'
import { getWhatsAppUrl } from '../../services/whatsappService'
import { Logo } from './Logo'

const quickNavItems = [
  { key: 'building', to: '/catalog/stroymaterial' },
  { key: 'engineering', to: '/catalog/inzhenerdik-santehnika' },
  { key: 'plumbing', to: '/catalog/santehnika' },
  { key: 'electrical', to: '/catalog/elektrika' },
  { key: 'tools', to: '/catalog/instrument' },
  { key: 'fasteners', to: '/catalog/krepezh' },
  { key: 'paint', to: '/catalog/boiok-tush-kagaz' },
  { key: 'ventilation', to: '/catalog/ventilyaciya' },
]

export function Header() {
  const { count } = useCart()
  const { locale, setLocale, t } = useLocale()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()
  const whatsappMaterialsUrl = getWhatsAppUrl(t('header.materialsMessage'))

  function handleSubmit(event) {
    event.preventDefault()
    navigate(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/catalog')
  }

  return (
    <>
      <header className="site-header">
        <div className="header-main">
          <Logo />
          <NavLink className="catalog-link" to="/catalog">
            {t('header.catalog')}
          </NavLink>
          <form className="search" onSubmit={handleSubmit}>
            <input
              aria-label={t('header.searchLabel')}
              placeholder={t('header.searchPlaceholder')}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit" aria-label={t('header.searchButton')} title={t('header.searchButton')}>
              <svg className="search__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M10.8 5.2a5.6 5.6 0 1 1 0 11.2 5.6 5.6 0 0 1 0-11.2Zm0-2a7.6 7.6 0 1 0 4.64 13.62l3.37 3.37a1 1 0 0 0 1.42-1.42l-3.37-3.37A7.6 7.6 0 0 0 10.8 3.2Z" />
              </svg>
            </button>
          </form>
          <nav className="header-nav" aria-label={t('header.navLabel')}>
            <NavLink to="/delivery">
              <svg className="header-nav__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M14 8h3l3 3v5h-2" />
                <path d="M4 16H2V6h12v10H9" />
                <path d="M14 16h-4" />
                <circle cx="6.5" cy="16.5" r="2.5" />
                <circle cx="17.5" cy="16.5" r="2.5" />
              </svg>
              {t('header.delivery')}
            </NavLink>
            <NavLink to="/contacts">
              <svg className="header-nav__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 4.2 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.32 1.77.59 2.6a2 2 0 0 1-.45 2.11L8 9.67a16 16 0 0 0 6.33 6.33l1.24-1.24a2 2 0 0 1 2.11-.45c.83.27 1.7.47 2.6.59A2 2 0 0 1 22 16.92Z" />
              </svg>
              {t('header.contacts')}
            </NavLink>
            <NavLink className="cart-link" to="/cart">
              <svg className="header-nav__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
              {t('header.cart')} <span>{count}</span>
            </NavLink>
          </nav>
          <div className="language-switcher" aria-label="Language">
            <button type="button" className={locale === 'kg' ? 'active' : ''} onClick={() => setLocale('kg')}>
              KG
            </button>
            <button type="button" className={locale === 'ru' ? 'active' : ''} onClick={() => setLocale('ru')}>
              RU
            </button>
          </div>
        </div>
      </header>

      <nav className="header-category-strip" aria-label={t('header.categoryNavLabel')}>
        <div className="header-category-scroll">
          {quickNavItems.map((item) => (
            <NavLink
              className={({ isActive }) => `header-category-chip${isActive ? ' is-active' : ''}`}
              key={item.to}
              to={item.to}
            >
              {t(`header.categoryChips.${item.key}`)}
            </NavLink>
          ))}
        </div>
        <a className="header-materials-cta" href={whatsappMaterialsUrl} target="_blank" rel="noreferrer">
          <strong>{t('header.materialsTitle')}</strong>
          <small>{t('header.materialsCta')}</small>
        </a>
      </nav>
    </>
  )
}
