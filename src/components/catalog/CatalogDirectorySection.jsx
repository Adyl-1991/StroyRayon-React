import { Link } from 'react-router-dom'
import { useLocale } from '../../i18n/LocaleContext'

const VISIBLE_CHILDREN = 6

export function CatalogDirectorySection({ node }) {
  const { nodeText, t } = useLocale()
  const children = node.children || []
  const visibleChildren = children.slice(0, VISIBLE_CHILDREN)
  const hiddenCount = Math.max(children.length - VISIBLE_CHILDREN, 0)
  const current = nodeText(node)

  return (
    <section className="catalog-directory-section">
      <div className="catalog-directory-section__head">
        <span className="catalog-directory-section__icon" aria-hidden="true">
          {current.title.slice(0, 1)}
        </span>
        <div>
          <h2>
            <Link to={`/catalog/${node.slug}`}>{current.title}</Link>
          </h2>
          <p>{current.description}</p>
        </div>
      </div>

      {visibleChildren.length > 0 && (
        <ul className="catalog-directory-section__links">
          {visibleChildren.map((child) => (
            <li key={child.id}>
              <Link to={`/catalog/${node.slug}/${child.slug}`}>{nodeText(child).title}</Link>
            </li>
          ))}
        </ul>
      )}

      <Link className="catalog-directory-section__open" to={`/catalog/${node.slug}`}>
        {t('common.openCategory')}
        {hiddenCount ? ` · ${t('common.more')} ${hiddenCount}` : ''}
      </Link>
    </section>
  )
}
