import { Link } from 'react-router-dom'
import { applyImageFallback, getCategoryImage } from '../../utils/imageUtils'

export function CategoryCard({ category }) {
  const image = getCategoryImage(category)

  return (
    <article className="category-card">
      <img
        src={image.src}
        alt={image.alt}
        loading="lazy"
        width={image.width}
        height={image.height}
        onError={(event) => applyImageFallback(event, 'category')}
      />
      <div>
        <h3>{category.titleKg || category.name}</h3>
        <p>{category.descriptionKg || category.description}</p>
        <Link to={`/catalog/${category.slug}`}>Категорияны ачуу</Link>
      </div>
    </article>
  )
}
