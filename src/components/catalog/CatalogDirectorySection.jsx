import { Link } from 'react-router-dom'

const VISIBLE_CHILDREN = 6

export function CatalogDirectorySection({ node }) {
  const visibleChildren = node.children.slice(0, VISIBLE_CHILDREN)
  const hiddenCount = Math.max(node.children.length - VISIBLE_CHILDREN, 0)

  return (
    <section className="catalog-directory-section">
      <div className="catalog-directory-section__head">
        <span className="catalog-directory-section__icon" aria-hidden="true">
          {node.titleKg.slice(0, 1)}
        </span>
        <div>
          <h2>
            <Link to={`/catalog/${node.slug}`}>{node.titleKg}</Link>
          </h2>
          <p>{node.descriptionKg}</p>
        </div>
      </div>

      <ul className="catalog-directory-section__links">
        {visibleChildren.map((child) => (
          <li key={child.id}>
            <Link to={`/catalog/${node.slug}/${child.slug}`}>{child.titleKg}</Link>
          </li>
        ))}
      </ul>

      <Link className="catalog-directory-section__open" to={`/catalog/${node.slug}`}>
        Категорияны ачуу{hiddenCount ? ` · дагы ${hiddenCount}` : ''}
      </Link>
    </section>
  )
}
