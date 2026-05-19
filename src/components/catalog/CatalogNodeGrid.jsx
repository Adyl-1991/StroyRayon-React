import { Link } from 'react-router-dom'
import { useLocale } from '../../i18n/LocaleContext'

export function CatalogNodeGrid({ nodes, basePath }) {
  const { nodeText } = useLocale()

  if (!nodes.length) return null

  return (
    <div className="catalog-node-grid">
      {nodes.map((node) => {
        const current = nodeText(node)

        return (
          <Link className="catalog-node-tile" key={node.id} to={`/catalog/${[...basePath, node.slug].join('/')}`}>
            <span className="catalog-node-tile__icon" aria-hidden="true">
              {current.title.slice(0, 1)}
            </span>
            <span>
              <strong>{current.title}</strong>
              <small>{current.description}</small>
            </span>
          </Link>
        )
      })}
    </div>
  )
}
