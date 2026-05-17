import { CatalogDirectorySection } from './CatalogDirectorySection'

export function CatalogDirectory({ nodes }) {
  return (
    <div className="catalog-directory" aria-label="Каталог бөлүмдөрү">
      {nodes.map((node) => (
        <CatalogDirectorySection key={node.id} node={node} />
      ))}
    </div>
  )
}
