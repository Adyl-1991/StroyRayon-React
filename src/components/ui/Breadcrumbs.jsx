import { Link } from 'react-router-dom'

export function Breadcrumbs({ items }) {
  return (
    <nav className="breadcrumbs" aria-label="Навигация жолу">
      <Link to="/">Башкы бет</Link>
      {items.map((item) => (
        <span key={item.label}>
          <span aria-hidden="true">/</span>
          {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
        </span>
      ))}
    </nav>
  )
}
