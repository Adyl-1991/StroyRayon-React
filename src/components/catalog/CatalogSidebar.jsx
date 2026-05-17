import { NavLink } from 'react-router-dom'
import { categories } from '../../data/categories'

export function CatalogSidebar({ activeCategorySlug }) {
  return (
    <aside className="catalog-sidebar">
      <h2>Каталог</h2>
      <NavLink to="/catalog">Бардык товарлар</NavLink>
      {categories.map((category) => (
        <div className="sidebar-group" key={category.id}>
          <NavLink to={`/catalog/${category.slug}`} className={activeCategorySlug === category.slug ? 'active' : ''}>
            {category.name}
          </NavLink>
          <div>
            {category.subcategories.map((subcategory) => (
              <NavLink key={subcategory.id} to={`/catalog/${category.slug}/${subcategory.slug}`}>
                {subcategory.name}
              </NavLink>
            ))}
          </div>
        </div>
      ))}
    </aside>
  )
}
