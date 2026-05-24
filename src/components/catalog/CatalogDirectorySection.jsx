import { Link } from 'react-router-dom'
import { useLocale } from '../../i18n/LocaleContext'
import { applyImageFallback, getCategoryImage } from '../../utils/imageUtils'

const VISIBLE_CHILDREN = 4

export function CatalogDirectorySection({ node }) {
  const { nodeText, t } = useLocale()
  const children = node.children || []
  const visibleChildren = children.slice(0, VISIBLE_CHILDREN)
  const hiddenCount = Math.max(children.length - VISIBLE_CHILDREN, 0)
  const current = nodeText(node)
  const image = getCategoryImage(node)

  return (
    <section className="catalog-directory-section">
      <Link className="catalog-directory-section__media" to={`/catalog/${node.slug}`} aria-label={current.title}>
        <img
          src={image.src}
          alt={image.alt || current.title}
          loading="lazy"
          width={image.width}
          height={image.height}
          onError={(event) => applyImageFallback(event, 'category')}
        />
      </Link>

      <div className="catalog-directory-section__body">
        <div className="catalog-directory-section__head">
          <h2>
            <Link to={`/catalog/${node.slug}`}>{current.title}</Link>
          </h2>
          <p>{current.description}</p>
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
          {hiddenCount ? ` - ${t('common.more')} ${hiddenCount}` : ''}
        </Link>
      </div>
    </section>
  )
}
