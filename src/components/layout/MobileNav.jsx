import { NavLink } from 'react-router-dom'
import { useCart } from '../../hooks/useCart'
import { useLocale } from '../../i18n/LocaleContext'

function NavIcon({ name }) {
  const icons = {
    home: <path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5.2v-6.2H9.2V22H4a1 1 0 0 1-1-1z" />,
    catalog: (
      <>
        <rect x="3" y="4" width="7" height="7" rx="1.4" />
        <rect x="14" y="4" width="7" height="7" rx="1.4" />
        <rect x="3" y="15" width="7" height="7" rx="1.4" />
        <rect x="14" y="15" width="7" height="7" rx="1.4" />
      </>
    ),
    truck: (
      <>
        <path d="M3 7h11v9H3z" />
        <path d="M14 10h4.5L21 13v3h-7z" />
        <circle cx="7" cy="18.5" r="1.8" />
        <circle cx="17.5" cy="18.5" r="1.8" />
      </>
    ),
    cart: (
      <>
        <path d="M4 5h2l2 10h9.5l2-7H7" />
        <circle cx="10" cy="20" r="1.7" />
        <circle cx="17" cy="20" r="1.7" />
      </>
    ),
  }

  return (
    <span className="mobile-nav__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        {icons[name]}
      </svg>
    </span>
  )
}

export function MobileNav() {
  const { count } = useCart()
  const { t } = useLocale()

  return (
    <nav className="mobile-nav" aria-label="Mobile menu">
      <NavLink to="/">
        <NavIcon name="home" />
        {t('nav.home')}
      </NavLink>
      <NavLink to="/catalog">
        <NavIcon name="catalog" />
        {t('nav.catalog')}
      </NavLink>
      <NavLink to="/delivery">
        <NavIcon name="truck" />
        {t('nav.delivery')}
      </NavLink>
      <NavLink to="/cart">
        <NavIcon name="cart" />
        {t('nav.cart')} {count > 0 ? `(${count})` : ''}
      </NavLink>
    </nav>
  )
}
