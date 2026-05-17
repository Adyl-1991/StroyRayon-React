import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useCart } from '../../hooks/useCart'
import { contactConfig } from '../../services/whatsappService'
import { Logo } from './Logo'

export function Header() {
  const { count } = useCart()
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  function handleSubmit(event) {
    event.preventDefault()
    navigate(query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : '/catalog')
  }

  return (
    <header className="site-header">
      <div className="topbar">
        <span>Кыргызстан боюнча жеткирүү</span>
        <a href={`tel:${contactConfig.phone.replaceAll(' ', '')}`}>{contactConfig.phone}</a>
        <a href={`https://t.me/${contactConfig.telegram.replace('@', '')}`}>Telegram</a>
      </div>
      <div className="header-main">
        <Logo showTagline />
        <NavLink className="catalog-link" to="/catalog">
          Каталог
        </NavLink>
        <form className="search" onSubmit={handleSubmit}>
          <input
            aria-label="Товар издөө"
            placeholder="Цемент, боёк, дрель..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" aria-label="Издөө">
            <span className="search__button-text">Издөө</span>
          </button>
        </form>
        <nav className="header-nav" aria-label="Негизги меню">
          <NavLink to="/delivery">Жеткирүү</NavLink>
          <NavLink to="/contacts">Байланыш</NavLink>
          <NavLink className="cart-link" to="/cart">
            Корзина <span>{count}</span>
          </NavLink>
        </nav>
      </div>
    </header>
  )
}
