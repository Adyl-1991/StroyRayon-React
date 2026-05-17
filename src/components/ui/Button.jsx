import { Link } from 'react-router-dom'

export function Button({ children, to, href, variant = 'primary', className = '', ...props }) {
  const classes = `button button--${variant} ${className}`.trim()
  const isDisabled = Boolean(props.disabled || props['aria-disabled'])

  if (to && !isDisabled) {
    return (
      <Link className={classes} to={to} {...props}>
        {children}
      </Link>
    )
  }

  if (href && !isDisabled) {
    return (
      <a className={classes} href={href} {...props}>
        {children}
      </a>
    )
  }

  return (
    <button className={classes} type="button" disabled={isDisabled} {...props}>
      {children}
    </button>
  )
}
