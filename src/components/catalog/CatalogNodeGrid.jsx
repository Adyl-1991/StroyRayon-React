import { Link } from 'react-router-dom'

export function CatalogNodeGrid({ nodes, basePath }) {
  if (!nodes.length) return null

  return (
    <div className="catalog-node-grid">
      {nodes.map((node) => (
        <Link className="catalog-node-tile" key={node.id} to={`/catalog/${[...basePath, node.slug].join('/')}`}>
          <span className="catalog-node-tile__icon" aria-hidden="true">
            {node.titleKg.slice(0, 1)}
          </span>
          <span>
            <strong>{node.titleKg}</strong>
            <small>{node.descriptionKg}</small>
          </span>
        </Link>
      ))}
    </div>
  )
}
