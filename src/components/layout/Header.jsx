import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useCart } from '../../hooks/useCart'
import { useLocale } from '../../i18n/LocaleContext'
import { catalogTranslations } from '../../i18n/translations'
import { Logo } from './Logo'

const quickNavItems = [
  { slug: 'stroymaterialdar', to: '/catalog/stroymaterialdar' },
  { slug: 'instrumentter', to: '/catalog/instrumentter' },
  { slug: 'elektrika', to: '/catalog/elektrika' },
  { slug: 'trubalar-fitingder', to: '/catalog/trubalar-fitingder' },
  { slug: 'boyok-zhana-syrlar', to: '/catalog/boyok-zhana-syrlar' },
  { slug: 'santehnika', to: '/catalog/santehnika' },
  { slug: 'krepezh', to: '/catalog/krepezh' },
  { slug: 'sad-zhana-charba', to: '/catalog/sad-zhana-charba' },
  { label: { kg: 'Акциялар', ru: 'Акции' }, to: '/catalog?badge=sale' },
]

export function Header() {
  const { count } = useCart()
  const { locale, setLocale, t } = useLocale()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function handleSubmit(event) {
    event.preventDefault()
    navigate(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/catalog')
  }

  function getQuickLabel(item) {
    return item.label?.[locale] || catalogTranslations[item.slug]?.[locale]?.title || catalogTranslations[item.slug]?.kg?.title
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
            <button type="submit" aria-label={t('header.searchButton')}>
              <span className="search__button-text">{t('header.searchButton')}</span>
            </button>
          </form>
          <nav className="header-nav" aria-label={t('header.navLabel')}>
            <NavLink to="/delivery">{t('header.delivery')}</NavLink>
            <NavLink to="/contacts">{t('header.contacts')}</NavLink>
            <NavLink className="cart-link" to="/cart">
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

      <nav className="header-quick-nav" aria-label={t('header.categoryNavLabel')}>
        {quickNavItems.map((item) => (
          <NavLink key={`${item.to}-${getQuickLabel(item)}`} to={item.to}>
            {getQuickLabel(item)}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
