import { Link } from 'react-router-dom'

export function Logo({ showTagline = false }) {
  return (
    <Link className="brand-logo" to="/" aria-label="StroyRayon башкы бет">
      <span className="brand-logo__mark" aria-hidden="true">
        SR
      </span>
      <span>
        <span className="brand-logo__name">StroyRayon</span>
        {showTagline && <span className="brand-logo__tagline">Курулуш материалдары</span>}
      </span>
    </Link>
  )
}
